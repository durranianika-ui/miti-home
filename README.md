# Miti Home

**Luxury Living — beautiful spaces, a better you.**

The Miti Home storefront: a Dubai-based home lifestyle store selling curated décor, sculptural lighting, smart storage, hosting essentials and clever everyday finds across the UAE. Prices are in AED (VAT-inclusive), delivery covers all seven emirates, and customers can pay by card on a hosted payment page or cash on delivery.

This codebase was built on the XILAR storefront architecture (Next.js App Router, Drizzle, Better Auth) and keeps its editorial motion system — the three-panel hero, GSAP clip-path menu, fullscreen search, stagger reveals, scroll-directional marquee, angled parallax gallery band and infinite canvas gallery — re-skinned and re-merchandised for home products.

## Stack

- Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4
- PostgreSQL via Drizzle ORM — Neon serverless in production, any Postgres locally
- Better Auth (email/password, optional Google), admin role
- Payments: provider-agnostic hosted card checkout (Stripe implemented) + cash on delivery
- Resend for transactional and campaign email
- Framer Motion + GSAP; Lucide icons
- Optional: Cloudinary uploads, Gemini + Pinecone semantic search, OpenRouter concierge (off by default)

## Quick start (local)

```bash
npm install
cp .env.example .env.local          # then fill DATABASE_URL and BETTER_AUTH_SECRET
npm run db:migrate                  # applies ./drizzle migrations
npm run catalog:images              # builds /public/products from ~/Downloads/Mitihome (needs Python + Pillow)
npm run db:seed                     # imports data/catalog/miti-home-catalog.json
npm run admin:create -- --email you@example.com --name "Your Name" --password "a-long-passphrase"
npm run dev
```

Any PostgreSQL 15+ works locally (Docker, Postgres.app, or the `embedded-postgres` npm package). `lib/db/index.ts` uses node-postgres for `localhost` URLs and the Neon WebSocket driver for everything else. The `pg_trgm` extension must be available (it ships with standard Postgres builds).

## Quality gate

```bash
npm test          # 95 node:test unit + source-invariant tests
npm run lint      # ESLint (next/core-web-vitals + typescript)
npm run build     # production build — needs a reachable DATABASE_URL (pages are statically generated from the catalogue)
```

## Where things live

| Concern | Location |
| --- | --- |
| Brand identity, contact, legal, socials | `lib/brand.ts` (env-driven, unset values are hidden) |
| UAE commerce rules (VAT, delivery, COD, emirates, returns window) | `lib/constants.ts` (env-overridable) |
| AED formatting, VAT share | `lib/money.ts` |
| UAE address & phone validation | `lib/uae.ts` |
| Homepage merchandising (hero, Shop the Space, editorial story, banner) | `lib/merchandising.ts` |
| Catalogue data & images | `data/catalog/miti-home-catalog.json`, `scripts/catalog/prepare_images.py`, `scripts/seed-catalog.ts` |
| Schema & migrations | `lib/db/schema.ts`, `drizzle/` |
| Catalogue queries, filters, facets | `lib/product-catalog.ts`, `lib/catalog-query.ts` |
| Categories & collections | `lib/taxonomy.ts`, `lib/navigation.ts` |
| Checkout quote (server-priced) | `lib/checkout/quote.ts`, `lib/checkout/pricing.ts`, `lib/checkout/cod.ts` |
| Order write path (server-only) | `lib/orders/create-order.ts` |
| Card payments | `lib/payments/*`, `lib/checkout/card-checkout.ts`, `app/api/checkout/card`, `app/api/webhooks/payments/[provider]`, `app/checkout/complete` |
| Emails | `lib/email.ts`, `lib/email-layout.ts`, `lib/marketing/email-template.ts` |
| SEO | `lib/seo.ts`, `lib/structured-data.ts`, `lib/seo-merchant-feed.ts`, `app/sitemap.ts`, `app/robots.ts`, `app/llms.txt` |
| Analytics | `components/analytics/analytics.tsx`, `lib/analytics.ts` (GA4/GTM/Meta Pixel/Vercel, all env-driven) |
| Admin | `app/admin/**`, `lib/actions/admin.ts`, `lib/admin-guard.ts` |

## Key rules

- **Never trust the browser with money.** Orders are only created from `createCheckoutQuote()` in route handlers (`/api/orders` for COD, the card-checkout finaliser for card). `lib/orders/create-order.ts` is `server-only` and deliberately not a `"use server"` module.
- **Stock and coupons are consumed atomically** with the order insert; COD cancellation and admin cancellation restore stock.
- **Card orders are created only after the provider confirms payment** (webhook or verified return). A paid session that can no longer be fulfilled is flagged `paid_unfulfilled` and surfaced on the admin dashboard for refund.
- **The store never shows a payment method it cannot charge.** The card option appears only when a provider is configured.
- **No fabricated social proof.** Reviews render only from `data/testimonials.json`; there are no fake ratings, viewer counts or "selling fast" claims.
- Public product URLs use slugs; mutations use IDs. Old UUID product URLs 308-redirect via `proxy.ts`.

## Documentation

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Vercel + Neon deployment, domain cutover, post-deploy checks
- [docs/PAYMENTS.md](docs/PAYMENTS.md) — payment architecture and what is needed for live cards
- [docs/REQUIRED-FROM-OWNER.md](docs/REQUIRED-FROM-OWNER.md) — credentials, assets and decisions still needed
- [docs/CATALOG.md](docs/CATALOG.md) — catalogue data, imagery pipeline, drafts
- [docs/MIGRATION.md](docs/MIGRATION.md) — XILAR → Miti Home audit, plan and change log
- [docs/walkthroughs/](docs/walkthroughs) — checkout & orders, admin & catalogue, coupons & concierge

## License

The underlying XILAR codebase is licensed under the Apache License 2.0 (see `LICENSE`); that notice is retained as the license requires.
