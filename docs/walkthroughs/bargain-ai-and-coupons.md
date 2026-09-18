# Concierge (optional AI) & Coupons Walkthrough

## Status

The negotiating assistant inherited from XILAR is kept but **off by default** (`NEXT_PUBLIC_FEATURE_BARGAIN_AI=false`): Miti Home's positioning is "curated, not crowded" and it does not compete on price. When disabled, the checkout component renders nothing and `/api/bargain` returns 404 before doing any work. When enabled without `OPENROUTER_API_KEY`, the route returns 503 and the component stays hidden — the storefront never depends on it.

## How it works when enabled

- `components/features/checkout-bargain.tsx` streams a concierge conversation from `/api/bargain`.
- `lib/bargain/logic.ts` holds the pure rules (caps from product `maxBargainDiscount` and set savings, offer progression, finalisation) — unit-tested in `lib/bargain-discount.test.ts`.
- `lib/actions/bargain.ts` (server-only) persists a single-use, customer-bound, five-minute `BRG-` coupon together with a `bargain_sessions` row; the coupon header is only sent once persisted.

## Product assistant

`components/features/bargain-ai.tsx` (`ProductAssistant`) is a local, no-API helper on product pages that answers from the product data and store settings only (materials, dimensions, care, delivery time and fees, COD, returns, VAT-inclusive AED pricing, gifting).

## Coupons

Public validation lives in `lib/coupon-validation.ts` (the API returns only `{ valid, code, discount }` or an error). Consumption happens inside the order transaction in `lib/orders/create-order.ts`, re-checking every rule with row-level guards so concurrent orders cannot exceed usage limits.
