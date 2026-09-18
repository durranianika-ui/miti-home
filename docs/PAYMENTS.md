# Payments

## What ships today

| Method | Status | Notes |
| --- | --- | --- |
| Cash on delivery | **Working** | Available in the emirates listed in `NEXT_PUBLIC_COD_EMIRATES` (default: all seven), up to `NEXT_PUBLIC_COD_MAX_ORDER_AED` (default AED 2,500), with a `NEXT_PUBLIC_COD_FEE_AED` fee (default AED 10). Customers can cancel their own COD orders before dispatch. |
| Card (hosted page) | **Built, needs credentials** | Stripe Checkout implementation (Visa, Mastercard, Amex, Apple Pay, Google Pay; settles AED). The card option is hidden until `STRIPE_SECRET_KEY` is set. |

The previous Razorpay (India-only, INR) integration and the paise-denominated stored-value wallet were removed. A closed-loop wallet is regulated stored value in the UAE (CBUAE Stored Value Facilities regulation) and is not appropriate without a licence; refunds use single-use store-credit codes or go back to the original card instead.

## Architecture

```
checkout-client ──POST /api/checkout/card──▶ createCheckoutQuote()  (server prices, stock pre-check, coupon rules)
                                              └─ startCardCheckout(): freeze quote in checkout_sessions,
                                                 open hosted page (provider.createHostedCheckout)
customer pays on provider page
provider ──POST /api/webhooks/payments/{id}──▶ verify signature → dedupe event → finalizeCardCheckout()
customer ──GET /checkout/complete?session=…──▶ finalizeCardCheckout()   (same idempotent path)

finalizeCardCheckout():
  row-lock checkout session → retrieve payment from provider → assert amount & currency
  → createOrderRecord() (atomic stock/coupon/order write) → mark session fulfilled
  if the order can no longer be created (e.g. stock sold out meanwhile) → status paid_unfulfilled
```

- The order is created **only** after the provider confirms payment; no stock is held while the customer is on the payment page, and the quote is re-validated (stock pre-check) before the page is opened.
- Webhook events are stored in `payment_webhook_events` (unique per provider + event id) to prevent replays.
- Orders carry `payment_provider`, `payment_reference` (provider checkout session, unique) and `payment_transaction_id` (payment intent, unique), so a second finalisation can never create a duplicate order.
- `paid_unfulfilled` sessions appear on the admin dashboard ("Payments needing refund") and as a banner on the orders list.

## Enabling Stripe

1. Use a Stripe account registered to the UAE business (required to settle in AED).
2. Set `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY` (test key `sk_test_…` first).
3. Stripe Dashboard → Developers → Webhooks → add endpoint `https://<domain>/api/webhooks/payments/stripe` with events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`.
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Enable Apple Pay / Google Pay in Stripe Checkout settings and verify your domain for Apple Pay.
5. Test on a preview with test cards (`4242 4242 4242 4242`), including a cancelled payment (returns to `/checkout?payment=cancelled`) and a declined card.
6. Switch to live keys only after the test run passes.

## Using a different UAE acquirer

Network International (N-Genius), Checkout.com, Telr and Amazon Payment Services all offer hosted payment pages. To add one:

1. Implement `CardPaymentProvider` (`lib/payments/types.ts`): `createHostedCheckout`, `retrieveCheckout`, `parseWebhook`.
2. Register it in `getCardPaymentProvider()` (`lib/payments/index.ts`) under a new `PAYMENT_PROVIDER` value.
3. Point the provider's webhook/notification URL at `/api/webhooks/payments/<provider-id>`.

Nothing else changes — quotes, orders, emails and the admin flow are provider-agnostic.

## Refunds

- **Card orders:** cancel the order in admin (status → Cancelled restores stock and marks the payment `refund_due`), issue the refund in the provider dashboard, then press **Mark refunded** on the order.
- **COD orders / goodwill:** use **Issue store credit** on the order — this creates a single-use `CREDIT-XXXXXXXX` code tied to the customer.

## Before accepting live card payments

- [ ] UAE-registered provider account approved for the business (trade licence, bank account)
- [ ] Live keys and webhook secret set in Vercel production
- [ ] Apple Pay domain verification (if using Apple Pay)
- [ ] Refund/returns policy reviewed (`/policies/refunds`)
- [ ] End-to-end live test with a low-value order, then refunded
