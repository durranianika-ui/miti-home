import { StripeCardProvider } from "./stripe.ts";
import type { CardPaymentProvider } from "./types.ts";

export type { CardPaymentProvider } from "./types.ts";
export { PaymentProviderError } from "./types.ts";

/**
 * Returns the configured hosted card provider, or null when card payments are
 * not set up. The storefront hides the card option entirely in that case —
 * it never presents a payment method that cannot actually take money.
 *
 * PAYMENT_PROVIDER selects the implementation (currently "stripe").
 */
export function getCardPaymentProvider(): CardPaymentProvider | null {
  const provider = (process.env.PAYMENT_PROVIDER ?? "stripe").trim().toLowerCase();

  if (provider === "stripe") {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secretKey) return null;
    return new StripeCardProvider(secretKey, process.env.STRIPE_WEBHOOK_SECRET?.trim());
  }

  return null;
}

export function getCardPaymentProviderById(id: string): CardPaymentProvider | null {
  const provider = getCardPaymentProvider();
  return provider && provider.id === id ? provider : null;
}
