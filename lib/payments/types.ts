/**
 * Hosted card payment provider contract.
 *
 * Miti Home never touches card data: the customer pays on the provider's
 * hosted page and we confirm the result server-to-server (webhook and a
 * verified return). Adding a UAE acquirer (Network International N-Genius,
 * Checkout.com, Telr, Amazon Payment Services…) means implementing this
 * interface and registering it in lib/payments/index.ts.
 */

export type HostedCheckoutRequest = {
  /** Our checkout_sessions.id — echoed back by the provider. */
  checkoutSessionId: string;
  amountMinor: number;
  currency: string;
  customerEmail: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date;
};

export type HostedCheckoutResult = {
  providerSessionId: string;
  redirectUrl: string;
};

export type ProviderCheckoutStatus = {
  providerSessionId: string;
  /** Our checkout session id as stored on the provider side. */
  checkoutSessionId: string | null;
  state: "paid" | "open" | "expired" | "failed";
  amountMinor: number;
  currency: string;
  transactionId: string | null;
};

export type ProviderWebhookEvent = {
  id: string;
  type: string;
  /** Present when the event concerns a hosted checkout session. */
  providerSessionId: string | null;
  payloadHash: string;
};

export interface CardPaymentProvider {
  readonly id: string;
  /** Customer-facing name of the payment method, e.g. "Card (Visa, Mastercard, Apple Pay)". */
  readonly label: string;
  createHostedCheckout(request: HostedCheckoutRequest): Promise<HostedCheckoutResult>;
  retrieveCheckout(providerSessionId: string): Promise<ProviderCheckoutStatus>;
  /** Verifies the signature and parses the event. Throws on an invalid signature. */
  parseWebhook(rawBody: string, headers: Headers): Promise<ProviderWebhookEvent>;
}

export class PaymentProviderError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
