import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkoutSessions, orders, type SavedShippingAddress } from "@/lib/db/schema";
import { assertProviderAmountMatchesQuote, type CheckoutQuote } from "@/lib/checkout/pricing";
import { CURRENCY } from "@/lib/constants";
import { toMinorUnits } from "@/lib/money";
import { createOrderRecord } from "@/lib/orders/create-order";
import { getCardPaymentProvider, type CardPaymentProvider } from "@/lib/payments";
import { BRAND } from "@/lib/brand";
import { normalizeSiteUrl } from "@/lib/seo";

const SESSION_TTL_MINUTES = 45;

export type FinalizeResult =
  | { status: "fulfilled"; orderId: string }
  | { status: "pending" }
  | { status: "expired" }
  | { status: "failed"; reason: string };

/**
 * Freezes the server quote in checkout_sessions and opens a hosted payment
 * page. No order or stock change happens until payment is confirmed.
 */
export async function startCardCheckout(input: {
  userId: string;
  quote: CheckoutQuote;
  shippingAddress: SavedShippingAddress;
}) {
  const provider = getCardPaymentProvider();
  if (!provider) throw new Error("Card payments are not available right now");

  const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000);
  const amountMinor = toMinorUnits(input.quote.total);

  const [session] = await db
    .insert(checkoutSessions)
    .values({
      userId: input.userId,
      provider: provider.id,
      quote: input.quote,
      shippingAddress: input.shippingAddress,
      amountMinor,
      currency: CURRENCY,
      expiresAt,
    })
    .returning({ id: checkoutSessions.id });

  const siteUrl = normalizeSiteUrl();
  try {
    const hosted = await provider.createHostedCheckout({
      checkoutSessionId: session.id,
      amountMinor,
      currency: CURRENCY,
      customerEmail: input.shippingAddress.email,
      description: `${BRAND.name} order`,
      successUrl: `${siteUrl}/checkout/complete?session=${session.id}`,
      cancelUrl: `${siteUrl}/checkout?payment=cancelled`,
      expiresAt,
    });

    await db
      .update(checkoutSessions)
      .set({ providerSessionId: hosted.providerSessionId, updatedAt: new Date() })
      .where(eq(checkoutSessions.id, session.id));

    return { checkoutSessionId: session.id, redirectUrl: hosted.redirectUrl };
  } catch (error) {
    await db
      .update(checkoutSessions)
      .set({ status: "failed", failureReason: error instanceof Error ? error.message : "Provider error", updatedAt: new Date() })
      .where(eq(checkoutSessions.id, session.id));
    throw error;
  }
}

/**
 * Idempotently turns a paid hosted checkout into an order. Safe to call from
 * both the webhook and the customer's return page: a row lock serialises
 * concurrent callers and the second one sees the fulfilled session.
 */
export async function finalizeCardCheckout(
  checkoutSessionId: string,
  provider: CardPaymentProvider | null = getCardPaymentProvider(),
): Promise<FinalizeResult> {
  if (!provider) return { status: "failed", reason: "Card payments are not configured" };

  return db.transaction(async (tx) => {
    const locked = await tx.execute<{ id: string }>(
      sql`SELECT id FROM ${checkoutSessions} WHERE ${checkoutSessions.id} = ${checkoutSessionId} FOR UPDATE`,
    );
    if (locked.rows.length === 0) return { status: "failed", reason: "Checkout session not found" } as const;

    const [session] = await tx.select().from(checkoutSessions).where(eq(checkoutSessions.id, checkoutSessionId));

    if (session.status === "fulfilled" && session.orderId) {
      return { status: "fulfilled", orderId: session.orderId } as const;
    }
    if (session.status === "paid_unfulfilled") {
      return { status: "failed", reason: session.failureReason ?? "Payment received but the order could not be created" } as const;
    }
    if (!session.providerSessionId) return { status: "failed", reason: "Payment was not started" } as const;

    const remote = await provider.retrieveCheckout(session.providerSessionId);

    if (remote.checkoutSessionId && remote.checkoutSessionId !== session.id) {
      return { status: "failed", reason: "Payment reference mismatch" } as const;
    }

    if (remote.state === "open") return { status: "pending" } as const;

    if (remote.state === "expired" || remote.state === "failed") {
      await tx
        .update(checkoutSessions)
        .set({ status: remote.state === "expired" ? "expired" : "failed", updatedAt: new Date() })
        .where(and(eq(checkoutSessions.id, session.id), eq(checkoutSessions.status, "created")));
      return { status: "expired" } as const;
    }

    // An earlier attempt may have created the order and failed before marking
    // the session; the unique payment_reference makes this lookup authoritative.
    const [existingOrder] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.paymentReference, session.providerSessionId));
    if (existingOrder) {
      await tx
        .update(checkoutSessions)
        .set({ status: "fulfilled", orderId: existingOrder.id, updatedAt: new Date() })
        .where(eq(checkoutSessions.id, session.id));
      return { status: "fulfilled", orderId: existingOrder.id } as const;
    }

    const quote = session.quote as CheckoutQuote;
    try {
      assertProviderAmountMatchesQuote({
        quoteTotal: quote.total,
        paidAmountMinor: remote.amountMinor,
        paidCurrency: remote.currency,
        expectedCurrency: session.currency,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Payment amount mismatch";
      await tx
        .update(checkoutSessions)
        .set({ status: "paid_unfulfilled", failureReason: reason, updatedAt: new Date() })
        .where(eq(checkoutSessions.id, session.id));
      return { status: "failed", reason } as const;
    }

    const result = await createOrderRecord({
      userId: session.userId,
      quote,
      shippingAddress: session.shippingAddress as SavedShippingAddress,
      paymentMethod: "card",
      paymentStatus: "paid",
      paymentProvider: provider.id,
      paymentReference: session.providerSessionId,
      paymentTransactionId: remote.transactionId,
    });

    if (!result.success) {
      // Money was captured but stock/coupon rules failed in the meantime.
      // Flag for a manual refund from the admin order queue.
      await tx
        .update(checkoutSessions)
        .set({ status: "paid_unfulfilled", failureReason: result.error, updatedAt: new Date() })
        .where(eq(checkoutSessions.id, session.id));
      console.error(`Checkout ${session.id} paid but not fulfilled: ${result.error}`);
      return { status: "failed", reason: result.error } as const;
    }

    await tx
      .update(checkoutSessions)
      .set({ status: "fulfilled", orderId: result.orderId, updatedAt: new Date() })
      .where(eq(checkoutSessions.id, session.id));

    return { status: "fulfilled", orderId: result.orderId } as const;
  });
}

export async function getCheckoutSessionOwner(checkoutSessionId: string) {
  const [row] = await db
    .select({ userId: checkoutSessions.userId })
    .from(checkoutSessions)
    .where(eq(checkoutSessions.id, checkoutSessionId));
  return row?.userId ?? null;
}

export async function findCheckoutSessionByProviderId(providerSessionId: string) {
  const [row] = await db
    .select({ id: checkoutSessions.id })
    .from(checkoutSessions)
    .where(eq(checkoutSessions.providerSessionId, providerSessionId));
  return row?.id ?? null;
}
