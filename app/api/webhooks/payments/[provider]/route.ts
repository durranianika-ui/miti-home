import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { paymentWebhookEvents } from "@/lib/db/schema";
import { finalizeCardCheckout, findCheckoutSessionByProviderId } from "@/lib/checkout/card-checkout";
import { getCardPaymentProviderById, PaymentProviderError } from "@/lib/payments";

/**
 * Provider → server payment confirmation. For Stripe, register
 *   https://<domain>/api/webhooks/payments/stripe
 * for checkout.session.completed, checkout.session.async_payment_succeeded
 * and checkout.session.expired.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerId } = await params;
  const provider = getCardPaymentProviderById(providerId);
  if (!provider) {
    return NextResponse.json({ error: "Unknown or unconfigured provider" }, { status: 404 });
  }

  const rawBody = await request.text();

  let event;
  try {
    event = await provider.parseWebhook(rawBody, request.headers);
  } catch (error) {
    const status = error instanceof PaymentProviderError ? error.status : 400;
    return NextResponse.json({ error: "Invalid webhook" }, { status });
  }

  // Replay protection: each provider event is processed once.
  const inserted = await db
    .insert(paymentWebhookEvents)
    .values({ provider: provider.id, providerEventId: event.id, eventType: event.type, payloadHash: event.payloadHash })
    .onConflictDoNothing()
    .returning({ id: paymentWebhookEvents.id });

  if (inserted.length === 0) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (!event.providerSessionId) {
    return NextResponse.json({ received: true });
  }

  const checkoutSessionId = await findCheckoutSessionByProviderId(event.providerSessionId);
  if (!checkoutSessionId) {
    return NextResponse.json({ received: true, unknownSession: true });
  }

  try {
    const result = await finalizeCardCheckout(checkoutSessionId, provider);
    return NextResponse.json({ received: true, status: result.status });
  } catch (error) {
    // Let the provider retry: forget this delivery so the retry is processed.
    await db.delete(paymentWebhookEvents).where(eq(paymentWebhookEvents.id, inserted[0].id));
    console.error("Payment webhook finalization failed:", error);
    return NextResponse.json({ error: "Finalization failed" }, { status: 500 });
  }
}
