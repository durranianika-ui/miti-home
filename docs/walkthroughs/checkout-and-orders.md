# Checkout & Orders Walkthrough

## Entry points

- Checkout page (server wrapper → client): `app/checkout/page.tsx`, `components/features/checkout-client.tsx`
- Server-priced summary: `POST /api/checkout/quote`
- Cash on delivery: `POST /api/orders`
- Card: `POST /api/checkout/card` → provider page → `POST /api/webhooks/payments/[provider]` and `GET /checkout/complete?session=…`
- Quote: `lib/checkout/quote.ts` (+ pure math in `lib/checkout/pricing.ts`, COD rules in `lib/checkout/cod.ts`)
- Order write path: `lib/orders/create-order.ts` (server-only)
- Customer actions: `lib/actions/orders.ts` (list, cancel COD, saved address)

## The quote is the contract

`createCheckoutQuote()` resolves products from the database, rejects unknown options and quantities above stock, computes set (combo) savings and coupon discount (including first-order-only codes), delivery fee, COD fee and the VAT share of the total. The browser only displays these numbers; every order path re-quotes on the server.

## Cash on delivery

`/api/orders` requires a session, sanitises the UAE address (`lib/uae.ts`), re-quotes with `paymentMethod: "cod"`, checks emirate eligibility and the COD cap, then calls `createOrderRecord()`:

1. consume the coupon atomically (usage limits, validity window, owner, first-order rule),
2. insert the order (status `pending`, payment `pending`, VAT amount, customer email),
3. snapshot items and decrement variant stock with `stock >= qty` guards,
4. update customer metrics and the saved address,
5. revalidate affected product/category/collection pages, then send the confirmation email (best-effort).

Customers can cancel their own COD orders while `pending`/`confirmed`; stock and metrics are restored.

## Card

See `docs/PAYMENTS.md`. Orders are created only after the provider confirms payment, through the same `createOrderRecord()` path, keyed by the unique provider reference.

## Order lifecycle (admin)

`updateOrderStatus()` supports confirmed → processing → shipped (courier + tracking) → delivered, or cancelled before dispatch (restores stock; card payments become `refund_due`). Each status change emails the customer. COD orders become `paid` when delivered.
