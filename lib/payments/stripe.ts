import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  PaymentProviderError,
  type CardPaymentProvider,
  type HostedCheckoutRequest,
  type ProviderCheckoutStatus,
} from "./types.ts";

/**
 * Stripe Checkout (hosted page). Stripe settles AED for UAE-registered
 * accounts and supports Visa, Mastercard, Amex, Apple Pay and Google Pay.
 * Uses the REST API directly — no SDK dependency.
 *
 * Required env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
 */

const STRIPE_API = "https://api.stripe.com/v1";
const WEBHOOK_TOLERANCE_SECONDS = 300;

type StripeCheckoutSession = {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_total: number | null;
  currency: string | null;
  client_reference_id: string | null;
  payment_intent: string | { id: string } | null;
  metadata?: Record<string, string>;
};

function formEncode(params: Record<string, string | number | undefined>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) body.append(key, String(value));
  }
  return body;
}

export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, now = Date.now()) {
  if (!header) throw new PaymentProviderError("Missing Stripe-Signature header", 400);

  const parts = header.split(",").map((part) => part.split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);

  if (!timestamp || signatures.length === 0) throw new PaymentProviderError("Malformed Stripe-Signature header", 400);

  const age = Math.abs(Math.floor(now / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > WEBHOOK_TOLERANCE_SECONDS) {
    throw new PaymentProviderError("Stripe webhook timestamp outside tolerance", 400);
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const valid = signatures.some((signature) => {
    const candidate = Buffer.from(signature, "hex");
    return candidate.length === expectedBuffer.length && timingSafeEqual(candidate, expectedBuffer);
  });

  if (!valid) throw new PaymentProviderError("Invalid Stripe webhook signature", 400);
}

export class StripeCardProvider implements CardPaymentProvider {
  readonly id = "stripe";
  readonly label = "Card · Apple Pay · Google Pay";

  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string | undefined,
  ) {}

  private async request<T>(path: string, init: { method: "GET" | "POST"; body?: URLSearchParams; idempotencyKey?: string }) {
    const response = await fetch(`${STRIPE_API}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": "2024-06-20",
        ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
      },
      body: init.body,
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
    if (!response.ok || !payload) {
      const message = payload?.error?.message ?? `Stripe request failed (${response.status})`;
      throw new PaymentProviderError(message, response.status >= 500 ? 502 : 400);
    }
    return payload as T;
  }

  async createHostedCheckout(request: HostedCheckoutRequest) {
    const session = await this.request<StripeCheckoutSession>("/checkout/sessions", {
      method: "POST",
      idempotencyKey: `miti-checkout-${request.checkoutSessionId}`,
      body: formEncode({
        mode: "payment",
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        customer_email: request.customerEmail,
        client_reference_id: request.checkoutSessionId,
        "metadata[checkout_session_id]": request.checkoutSessionId,
        "payment_intent_data[metadata][checkout_session_id]": request.checkoutSessionId,
        "payment_intent_data[description]": request.description,
        "line_items[0][quantity]": 1,
        "line_items[0][price_data][currency]": request.currency.toLowerCase(),
        "line_items[0][price_data][unit_amount]": request.amountMinor,
        "line_items[0][price_data][product_data][name]": request.description,
        expires_at: Math.floor(request.expiresAt.getTime() / 1000),
      }),
    });

    if (!session.url) throw new PaymentProviderError("Stripe did not return a checkout URL");
    return { providerSessionId: session.id, redirectUrl: session.url };
  }

  async retrieveCheckout(providerSessionId: string): Promise<ProviderCheckoutStatus> {
    const session = await this.request<StripeCheckoutSession>(
      `/checkout/sessions/${encodeURIComponent(providerSessionId)}`,
      { method: "GET" },
    );

    const transactionId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

    let state: ProviderCheckoutStatus["state"] = "open";
    if (session.payment_status === "paid") state = "paid";
    else if (session.status === "expired") state = "expired";

    return {
      providerSessionId: session.id,
      checkoutSessionId: session.client_reference_id ?? session.metadata?.checkout_session_id ?? null,
      state,
      amountMinor: session.amount_total ?? 0,
      currency: (session.currency ?? "").toUpperCase(),
      transactionId,
    };
  }

  async parseWebhook(rawBody: string, headers: Headers) {
    if (!this.webhookSecret) throw new PaymentProviderError("STRIPE_WEBHOOK_SECRET is not configured", 500);
    verifyStripeSignature(rawBody, headers.get("stripe-signature"), this.webhookSecret);

    const event = JSON.parse(rawBody) as { id: string; type: string; data?: { object?: { id?: string; object?: string } } };
    const object = event.data?.object;
    return {
      id: event.id,
      type: event.type,
      providerSessionId: object?.object === "checkout.session" && object.id ? object.id : null,
      payloadHash: createHash("sha256").update(rawBody).digest("hex"),
    };
  }
}
