# Miti Home Domain Context

## Product

A sellable catalogue item in `products`. Product rows hold display copy, merchandising flags (`isNew`, `isFeatured`, `displayOrder`), images, base stock, AED pricing (`mrp` as the compare-at price, `sellingPrice` VAT-inclusive), a `category` slug, material, dimensions, care instructions, features and `maxBargainDiscount` for the optional concierge. `sizeLabel` and `colorLabel` name the product's two option axes as shown on the product page — e.g. "Dimensions" and "Finish" for a lamp, "Pack" for hooks.

## Variant

A product inventory bucket in `product_variants`, keyed by product, primary option (`size`: size, dimensions or pack) and optional secondary option (`color`: colour or finish). Products with variants mutate variant stock first and then recalculate product-level stock from variant totals.

## Category

A row in `categories`, addressed by `slug` (e.g. `home-decor`, `lighting`, `smart-storage`, `home-entertainment`, `clever-finds`, `furniture`). A product belongs to exactly one category through `products.category`. Categories carry their own SEO title/description and power `/shop/[category]`.

## Collection

A curated, ordered edit in `collections` (e.g. a room, a mood or a gifting story). Membership lives in `collection_products` with a `position`; a product can appear in many collections. Collections can be featured and carry an eyebrow, image and SEO copy.

## Combo

A two-product bundle in `combos`. Combo cart lines carry `comboId` and a shared `comboGroupId`. Server quote calculation validates the pair and applies the configured combo discount, capped by the pair subtotal and quantity.

## Cart

Client-side shopping state stored in `localStorage` (`miti-cart`). The cart is a convenience payload, not a pricing authority. Route handlers must re-price cart items from the database.

## Checkout Quote

The server-owned price contract produced by `createCheckoutQuote()` in `lib/checkout/quote.ts`. It contains verified order items, subtotal, combo discount, coupon discount, delivery charge, COD fee and final total — all in AED, VAT-inclusive.

## Shipping Address

A UAE address validated by `lib/uae.ts`: name, email, E.164 UAE phone, emirate (must be one of `SHIPPING_EMIRATES`), area, building, optional apartment/street and delivery instructions.

## Checkout Session

A row in `checkout_sessions` created when a customer chooses card payment. It freezes the checkout quote and shipping address, records the provider and amount in fils, and moves `created → paid → fulfilled` (or `expired`, `failed`, `paid_unfulfilled`). No order exists and no stock moves until the provider confirms payment.

## Payment Provider

An implementation of `CardPaymentProvider` (`lib/payments/types.ts`) that opens a hosted payment page, retrieves checkout status and verifies webhooks. Stripe Checkout is the current implementation. Provider webhooks are de-duplicated in `payment_webhook_events`.

## Coupon

A row in `coupons`. Coupons may be fixed or percentage discounts, can have validity windows, usage limits, minimum order values and an optional user restriction. Order creation consumes coupons transactionally.

## Bargain Coupon

A generated `BRG-` coupon created by the optional checkout concierge (enabled with `NEXT_PUBLIC_FEATURE_BARGAIN_AI`). It is fixed-value, user-specific, single-use and expires after five minutes. Coupon and bargain session rows are created together.

## Order

The durable purchase record in `orders` with snapshot `order_items`, a payment method (`cod` or `card`) and payment status. `createOrderRecord()` in `lib/orders/create-order.ts` is the single, server-only write path for customer checkout; it handles coupon consumption, inventory mutation, customer metrics and order snapshots in one transaction.

## COD Cancellation

Customer cancellation of their own cash-on-delivery order while its status is `pending` or `confirmed`. Cancellation marks the order cancelled, restores product/variant stock, rolls back customer order metrics and revalidates order and product surfaces. Card-paid orders are cancelled by the team so the card can be refunded.

## Store Credit

An admin-issued, single-use, user-bound fixed-value coupon prefixed `CREDIT-`, used as a refund option (for example on cash-on-delivery returns) or as a customer-care gesture. Store credits follow normal coupon validation at checkout.

## Marketing Subscriber & Suppression

`newsletter_subscribers` holds opt-ins; `marketing_campaigns` and `marketing_campaign_recipients` track sends; `marketing_email_suppressions` records unsubscribes so an address is never emailed again after opting out via `/unsubscribe/marketing`.
