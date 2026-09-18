# Miti Home E-Commerce — Agent Instructions

> [!IMPORTANT]
> **Design philosophy & visual styling:** for colours, typography, motion rules, interactive mechanics, performance safeguards and accessibility guidance, refer to [.impeccable.md](.impeccable.md). Brand and audience context lives in [PRODUCT.md](PRODUCT.md); domain vocabulary lives in [CONTEXT.md](CONTEXT.md). Keep this file focused on engineering architecture, implementation rules and design-engineering principles.

Miti Home is a Dubai-based luxury home-décor and lifestyle store ("Luxury Living — Beautiful spaces. A better you."). It sells in AED with VAT-inclusive prices, delivers within the UAE only, supports cash on delivery and takes card payments through a hosted payment provider when one is configured.

CHECK IF YOU HAVE SKILLS FOR THE TECHNOLOGY YOU'RE TRYING TO IMPLEMENT. IF PRESENT, REFER TO THE SKILLS FIRST AND THEN PROCEED. ASK QUESTIONS AT THE SLIGHTEST BIT OF CONFUSION.

No bandaid fixes. Fix root causes.
No backward-compatibility shims (early-stage product).
For each task map out the full scope where the changes are needed (db, api, frontend, emails, SEO) and implement all of it at once.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5
- **Database:** Neon PostgreSQL (serverless) via Drizzle ORM (`lib/db/schema.ts`, `lib/db/index.ts`)
- **Auth:** Better Auth with admin plugin (`lib/auth.ts`, `lib/auth-server.ts`, `lib/auth-client.ts`)
- **Payments:** provider-agnostic hosted card checkout (`lib/payments/`), Stripe Checkout implementation; cash on delivery (`lib/checkout/cod.ts`)
- **Email:** Resend (`lib/email.ts`, `lib/email-layout.ts`)
- **AI (optional):** checkout bargain concierge via OpenRouter + Vercel AI SDK (`lib/openrouter.ts`, `app/api/bargain/route.ts`); semantic product search via Gemini embeddings + Pinecone
- **Images:** Cloudinary CDN in production, local `public/products/<slug>/<n>.webp` for the seeded catalogue
- **Styling:** Tailwind CSS 4 (tokens in `app/globals.css`) + `cn()` from `lib/utils.ts`, Lucide icons, Framer Motion, GSAP

## Architecture

```
app/                → Pages & API routes (App Router)
  admin/            → Admin dashboard (requires admin role): products, categories, collections,
                      orders, customers, coupons, combos, campaigns, newsletter
  api/              → Route handlers: auth, products, orders (COD), checkout/card, webhooks/payments/[provider],
                      bargain, coupons, combos, newsletter, search, upload
  shop/             → Catalogue; shop/[category] is the category landing page
  product/[id]/     → Product detail (slug-based URLs)
  checkout/         → Checkout; checkout/complete is the hosted-payment return page
  orders/           → Customer order history + COD self-cancellation
  policies/         → Delivery, returns, refunds, exchange, privacy, terms
  about/, contact/, gallery/, new/
components/
  analytics/        → Env-driven analytics loader (GTM / GA4 / Meta Pixel / Vercel)
  brand/            → Wordmark
  features/         → Domain components (hero, product-client, shop-client, cart-drawer, gallery-client,
                      shop-the-space, angled-gallery-band, checkout-bargain…)
  effects/          → Directional marquee and other motion effects
  layout/           → Footer
  seo/              → <JsonLd> + structured-data re-exports
  ui/               → Primitives (Button, Card, ScrollReveal…) — shadcn-style variant props, NOT shadcn/ui
lib/
  brand.ts          → BRAND, CONTACT, LEGAL, SOCIAL_LINKS, whatsappHref(), BRAND_ASSETS
  constants.ts      → UAE commerce configuration (currency, VAT, delivery, COD, emirates, after-sales windows)
  money.ts          → formatPrice / formatPriceExact / vatPortion / toMinorUnits
  uae.ts            → UAE address + phone validation shared by client and server
  taxonomy.ts       → Category and collection reads
  product-catalog.ts→ Public catalogue queries (lexical + optional semantic search)
  checkout/         → quote.ts (server price contract), pricing.ts (pure money math), validation.ts,
                      cod.ts (COD eligibility), card-checkout.ts (hosted card session lifecycle)
  orders/           → create-order.ts — the single, server-only order write path
  payments/         → CardPaymentProvider interface (types.ts), provider registry (index.ts), stripe.ts
  actions/          → Server actions (admin, orders, bargain, combos, marketing, wishlist)
  bargain/          → Bargain prompt, pure rules (logic.ts) and DB eligibility context
  email.ts          → Transactional + marketing email senders
  email-layout.ts   → Shared branded HTML email shell
  db/               → Drizzle schema & connection
  *-context.tsx     → Client providers (cart, theme) using localStorage
data/catalog/       → miti-home-catalog.json — source catalogue (categories, collections, products)
scripts/            → seed-catalog.ts, db-migrate.ts, backfill-product-search.ts
drizzle/            → Migration SQL files
```

## Key Patterns

### Brand & configuration are data, not copy
- Anything customer-facing that names the brand, its contact details, socials or legal identity reads from `lib/brand.ts`. Never hard-code the brand name, email, phone or address in components.
- `CONTACT.email` may be a placeholder (`CONTACT.emailIsPlaceholder`). `CONTACT.phone`, `CONTACT.whatsapp`, `LEGAL.tradeLicence`, `LEGAL.vatTrn` and `SOCIAL_LINKS` may be empty — render those elements only when configured. `whatsappHref()` returns `null` when WhatsApp is unset.
- Commercial terms live in `lib/constants.ts` and are overridable per environment via `NEXT_PUBLIC_*` variables: `FREE_SHIPPING_THRESHOLD`, `SHIPPING_FEE`, `COD_ENABLED`, `COD_FEE`, `COD_MAX_ORDER_TOTAL`, `DELIVERY_ESTIMATE`, `SHIPPING_EMIRATES`, `COD_ALLOWED_EMIRATES`, `RETURN_WINDOW_DAYS`, `EXCHANGE_WINDOW_DAYS`, `VAT_RATE`, `PRICES_INCLUDE_VAT`. **Policy pages, emails, banners and FAQs must interpolate these values — never hard-code numbers.**
- `lib/brand.ts`, `lib/constants.ts`, `lib/money.ts`, `lib/uae.ts` and `lib/checkout/cod.ts` must stay free of `@/` imports (they use relative `.ts` imports) because the node test runner loads them directly.

### Money
- Currency is AED everywhere; prices are displayed VAT-inclusive (5% UAE VAT by default).
- Format every customer-facing amount with `formatPrice()` from `lib/money.ts` ("AED 1,250"; the ISO code is used instead of the dirham sign so it renders in every font). Use `formatPriceExact()` for invoices, order records and admin tables.
- `vatPortion(total)` gives the VAT contained in a VAT-inclusive total; `toMinorUnits()` converts to fils for payment providers.

### Data Mutations & Server Actions
All database writes go through server actions in `lib/actions/` or server-only modules (`lib/orders/create-order.ts`, `lib/checkout/card-checkout.ts`). Route handlers orchestrate — they never write to the DB inline. Admin actions enforce `requireAdmin()` from `lib/auth-server.ts`.

### Auth Guards
- `getServerSession()` — current session (pages/routes)
- `requireAuth()` / `requireAdmin()` — throw if unauthorised (server actions)
- Client: `useSession()` from `lib/auth-client.ts`

### Client State
The cart and theme live in `localStorage` (`miti-cart`, `miti-theme`) via React Context in `lib/*-context.tsx`. The cart is a convenience payload, never a pricing authority. The wishlist is account-backed (`wishlist` table, `lib/actions/wishlist.ts`).

### Pricing & Checkout Security
- The server always re-prices from the database. Every checkout path uses `createCheckoutQuote()` from `lib/checkout/quote.ts`; pure money math (subtotal, combo and coupon discounts, delivery, COD fee) lives in `lib/checkout/pricing.ts`. Route handlers never duplicate it.
- Delivery: `SHIPPING_FEE` below `FREE_SHIPPING_THRESHOLD`, free at or above it. UAE-only; addresses are validated by `sanitizeUaeAddress()` in `lib/uae.ts` against `SHIPPING_EMIRATES`.
- Coupon validation runs server-side with all business rules (expiry, limits, minimum order, user restriction) — `lib/coupon-validation.ts`. Do not import public coupon rules from admin actions.

### Order Write Path
`createOrderRecord()` in `lib/orders/create-order.ts` is the **single** order intake write path. It is `server-only` and intentionally not a `"use server"` file, so it cannot be called from the browser. Coupon consumption, order rows, order-item snapshots, stock mutation and customer metrics happen in one transaction; it then sends the order confirmation email and revalidates public inventory. Callers must pass a quote from `createCheckoutQuote()`.

### Payment Paths
- **Cash on delivery:** `POST /api/orders` → quote → `getCodUnavailableReason()` (`lib/checkout/cod.ts`: `COD_ENABLED`, emirate in `COD_ALLOWED_EMIRATES`, total ≤ `COD_MAX_ORDER_TOTAL`) → `createOrderRecord()` with `paymentStatus: "pending"` and the `COD_FEE` added by the quote.
- **Card (hosted):** `POST /api/checkout/card` → `startCardCheckout()` freezes the server quote in `checkout_sessions` and redirects to the provider's hosted page. No order or stock change happens until payment is confirmed. `finalizeCardCheckout()` idempotently turns a paid session into an order; it is called from both the provider webhook (`/api/webhooks/payments/[provider]`, signature-verified, de-duplicated in `payment_webhook_events`) and the `/checkout/complete` return page, serialised by a row lock. The provider amount must match the frozen quote (`assertProviderAmountMatchesQuote`).
- **Providers:** implement `CardPaymentProvider` (`lib/payments/types.ts`) and register it in `lib/payments/index.ts`. `PAYMENT_PROVIDER` selects the implementation (default `stripe`; needs `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`). When no provider is configured `getCardPaymentProvider()` returns `null` and the storefront hides the card option — never present a payment method that cannot take money. We never handle card data.

### Cancellations, Refunds & Store Credit
- Customers can cancel their own **COD** orders while the status is `pending` or `confirmed` (`lib/order-cancellation.ts`); cancellation restores stock and rolls back customer metrics. Paid (card) orders are cancelled by the team so the card can be refunded.
- `issueStoreCredit()` in `lib/actions/admin.ts` creates a single-use, user-bound, fixed-value `CREDIT-XXXXXXXX` coupon (default validity 180 days) for the exact refund amount.

### Emails
- `lib/email.ts` sends auth, welcome, order confirmation, order status and marketing batch emails via Resend. Sender identity is env-driven (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, optional `RESEND_REPLY_TO`); without an API key non-critical emails are skipped with a log line.
- Every email renders through `renderEmailLayout()` in `lib/email-layout.ts` (brand colours in `EMAIL_COLORS`); escape user content with `escapeHtml()`. Marketing emails must carry the tokenised unsubscribe link (`/unsubscribe/marketing`).

### Analytics
`components/analytics/analytics.tsx` is fully environment-driven: `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA4_ID` (loaded directly only when no GTM container is set), `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_VERCEL_ANALYTICS=true`. IDs are pattern-validated; nothing loads in development unless `NEXT_PUBLIC_ANALYTICS_IN_DEV=true`.

### Bargain Concierge (optional)
- Off unless `NEXT_PUBLIC_FEATURE_BARGAIN_AI=true` (`BARGAIN_AI_ENABLED`); `/api/bargain` returns 404 when disabled and 503 when OpenRouter is not configured.
- Checkout component (`components/features/checkout-bargain.tsx`) streams chat via `/api/bargain`. Offer and finalisation rules live in `lib/bargain/logic.ts` (unit-tested); DB eligibility context in `lib/bargain/context.ts`; coupon/session writes in `lib/actions/bargain.ts`.
- Generates fixed-value, user-bound `BRG-` coupons with a 5-minute expiry, persisted together with a `bargain_sessions` row.

### Content Pages
- `app/about/` — brand story; `app/contact/` — customer care details (mailto only; no form backend)
- `app/policies/` — index plus `shipping/`, `returns/`, `refunds/`, `exchange/`, `privacy/`, `terms/`; each carries a "Last updated" date
- `app/gallery/` — draggable infinite product canvas; `app/new/` — new arrivals

### UI Components
Custom primitives in `components/ui/`. Use `cn()` for class merging. Button variants: `default | outline | ghost | link | destructive`; sizes: `default | sm | lg | icon`. `ScrollReveal`, `StaggerContainer`, `StaggerItem` in `components/ui/scroll-reveal.tsx` already respect reduced motion.

## Database

Schema in `lib/db/schema.ts`. Key tables:
- Better Auth: `user`, `session`, `account`, `verification`
- Catalogue: `products` (`category` holds a `categories.slug`; `material`, `dimensions`, `sizeLabel`/`colorLabel` name the PDP options, e.g. "Dimensions" / "Finish"), `product_variants` (per size/colour stock), `categories`, `collections` + `collection_products` (ordered membership), `combos`, `product_search_index_state`, `product_recommendations`
- Commerce: `orders`, `order_items` (snapshots), `coupons`, `checkout_sessions` (frozen quote for hosted card payments), `payment_webhook_events` (idempotency)
- Marketing & engagement: `newsletter_subscribers`, `marketing_campaigns`, `marketing_campaign_recipients`, `marketing_email_suppressions`, `bargain_sessions`, `wishlist`

Enums: `user_role`, `order_status` (`pending → confirmed → processing → shipped → delivered`, or `cancelled`).

**Commands:** `npm run db:generate` → `npm run db:migrate` (or `db:push` in development), `npm run db:studio`. Seed the catalogue with `scripts/seed-catalog.ts` from `data/catalog/miti-home-catalog.json`. Tests: `npm test` (node test runner over `lib/*.test.ts`).

## Environment Variables

- **Core:** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`
- **Payments:** `PAYMENT_PROVIDER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Email:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`
- **Images:** `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **Brand & legal:** `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_CONTACT_WHATSAPP`, `NEXT_PUBLIC_CONTACT_ADDRESS`, `NEXT_PUBLIC_CONTACT_HOURS`, `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_TRADE_LICENCE`, `NEXT_PUBLIC_VAT_TRN`, `NEXT_PUBLIC_SOCIAL_*`, `SECURITY_CONTACT_EMAIL`
- **Commerce terms:** `NEXT_PUBLIC_VAT_RATE`, `NEXT_PUBLIC_PRICES_INCLUDE_VAT`, `NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_AED`, `NEXT_PUBLIC_SHIPPING_FEE_AED`, `NEXT_PUBLIC_DELIVERY_ESTIMATE`, `NEXT_PUBLIC_SHIPPING_EMIRATES`, `NEXT_PUBLIC_COD_ENABLED`, `NEXT_PUBLIC_COD_FEE_AED`, `NEXT_PUBLIC_COD_MAX_ORDER_AED`, `NEXT_PUBLIC_COD_EMIRATES`, `NEXT_PUBLIC_RETURN_WINDOW_DAYS`, `NEXT_PUBLIC_EXCHANGE_WINDOW_DAYS`
- **Analytics:** `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_VERCEL_ANALYTICS`, `NEXT_PUBLIC_ANALYTICS_IN_DEV`
- **Optional AI/search:** `NEXT_PUBLIC_FEATURE_BARGAIN_AI`, `OPENROUTER_API_KEY`, `GEMINI_API_KEYS`, `PINECONE_API_KEY`, `PINECONE_INDEX`, `PINECONE_NAMESPACE`
- **Optional auth:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Conventions

- Import paths use the `@/` alias (maps to project root), except in the node-test-loaded modules listed above.
- Order items snapshot product data at purchase time (name, price, image) for historical accuracy.
- Pages use metadata exports for SEO; the root layout applies the `%s | Miti Home` title template, Open Graph and JSON-LD.
- Light (ivory) theme is the default; dark mode is available via the ThemeProvider.
- UK/UAE English spelling in customer copy ("colour", "organiser", "personalised").

## Search Engine Optimization (SEO) Rules

All new features, pages, routing changes and modifications must follow these rules to protect crawlability, ranking authority and indexing health:

### 1. Routing & Link Paths
- **Slugs over IDs:** public product paths use the product's `slug` (e.g. `/product/smoked-glass-ambient-table-lamp`), never its UUID. Cart and wishlist actions continue to use `product.id`.
- **Absolute URLs:** build URLs for links, sitemaps, schemas and meta tags with `buildProductPath(slug)` / `buildProductUrl(slug, baseUrl)` and `normalizeSiteUrl()` from `@/lib/seo`.
- **Client navigation:** use Next.js `<Link>` for internal routes; plain `<a>` only for external, `mailto:`, `tel:` and WhatsApp links.

### 2. Metadata API & Robots Configuration
- **Meta exports:** every public page exports `Metadata` (or `generateMetadata`) with a clean title, description and canonical URL.
- **Noindex:** private or system pages (`/admin/*`, `/account`, `/checkout`, `/orders`, `/wishlist`, `/unsubscribe`, `/api/*`) set `robots: { index: false, follow: false }`.
- **Sitemap:** register new public routes (categories, collections, policies, content pages) in `app/sitemap.ts`.

### 3. Structured Data (JSON-LD)
- Inject Schema.org JSON-LD with `<JsonLd data={...} />` from `@/components/seo/structured-data`:
  - **Homepage / About:** `organizationJsonLd()` and `webSiteJsonLd()`.
  - **Product pages:** `productJsonLd()` and `breadcrumbJsonLd()`.
  - **Category / listing pages:** `collectionJsonLd()` (with initial products) and `breadcrumbJsonLd()`.
  - **FAQ sections:** `faqJsonLd()`.
- `<JsonLd>` serialises with `safeJsonLdStringify` to prevent HTML-parsing exploits — never inline JSON-LD by hand.

### 4. Static Rendering & Crawl Budget
- **Avoid `dynamic = "force-dynamic"`** on catalogue and landing pages; keep them statically rendered (SSG/ISR). Push search terms and filters into client components (`ShopClient`) or static shells.
- **Index-bloat prevention:** when adding query-driven filter parameters, update `CATALOG_NOINDEX_PARAMS` in `lib/seo.ts` and the `X-Robots-Tag: noindex, follow` headers in `next.config.ts`.

## Seasoned Awards-Level Design Principles

Filter every UI choice through a "seasoned, awards-level" lens: calm luxury, not spectacle.

- **The "too much" trap vs. restraint:**
  - **Avoid hyperactivity:** never stack several heavy motion triggers (scroll parallax, autoplay video, marquees, scale transitions) in one viewport. Let pieces breathe.
  - **No lingering delays:** transitions should feel responsive — under `500ms` for UI (typically `250–400ms`) with exponential eases (`cubic-bezier(0.16, 1, 0.3, 1)` or GSAP `power4.out`). Signature set-pieces (gallery intro, lightbox FLIP) are the only exceptions.
  - **Restrain hover states:** one subtle response per element (opacity, gentle crop zoom or a light Y-lift) — never several at once.
  - **Whitespace is feature space:** generous vertical rhythm (`py-16 md:py-24` and up), clean gutters, no crowded grids.
- **Micro-interaction mechanics:**
  - Gestures (drags, scroll triggers, clicks) must not cause layout shift or collide with loading animations.
  - Check `useReducedMotion()` for all physics, inertial drags and 3D transforms; provide clean fades or instant state changes when active.

## Design Context

- Refer to [.impeccable.md](.impeccable.md) for the full design system, motion rules and accessibility guidance.
- Keep this file focused on repo-wide engineering, implementation rules and design-engineering principles.
