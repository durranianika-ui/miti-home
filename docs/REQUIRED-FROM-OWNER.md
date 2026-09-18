# Still needed from the Miti Home team

Everything below is either a credential, a business decision or an asset that was not in the supplied brand pack. Each item already has a working integration point; the store runs without them (unset values are hidden, never faked).

## Credentials / accounts

| Item | Where it goes | Without it |
| --- | --- | --- |
| Hosted Postgres (Neon via Vercel Marketplace) | `DATABASE_URL` | No preview/production deployment possible (pages are built from the catalogue) |
| Resend account + verified sending domain | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Order, shipping, welcome and password-reset emails are skipped (password reset shows an error) |
| UAE card acquirer (Stripe UAE, or N-Genius / Checkout.com / Telr) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (or a new provider adapter) | Checkout offers cash on delivery only |
| Analytics IDs (GTM container and/or GA4, Meta Pixel) | `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | No tracking loads |
| Google OAuth client (optional) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | "Continue with Google" hidden |
| Cloudinary (optional, for admin image uploads) | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Admin can still reference `/products/...` images |

## Business decisions

1. **Prices and stock.** Every price in `data/catalog/miti-home-catalog.json` is a placeholder (`pricePlaceholder: true`), and each product was seeded with 12 units split across its options. Confirm real AED prices, compare-at (sale) prices and on-hand stock — edit in the admin, or in the JSON then `npm run db:seed -- --reset-stock`.
2. **Commercial terms** (all env-configurable, defaults shown): free delivery over AED 300, AED 25 delivery fee, COD fee AED 10, COD cap AED 2,500, delivery estimate "1–3 working days", 7-day returns and exchanges.
3. **Domain.** The canonical fallback is `https://mitihome.ae` (the current Shopify storefront domain). The brand deck shows `www.mitihomes.com` — confirm which domain the new site launches on.
4. **Customer-care contact.** `hello@mitihome.ae` is a placeholder until `NEXT_PUBLIC_CONTACT_EMAIL` is set. Phone, WhatsApp and social links are hidden until provided.
5. **Legal identity.** Trade licence number and VAT TRN (`NEXT_PUBLIC_TRADE_LICENCE`, `NEXT_PUBLIC_VAT_TRN`) — shown in the footer and needed on tax invoices. Legal entity name (`NEXT_PUBLIC_LEGAL_NAME`).
6. **Policies.** The delivery, returns, refunds, exchange, privacy and terms pages were written for UAE retail and read their numbers from configuration. A few clauses need confirming: collection charges for change-of-mind returns, store-credit validity (admin default 180 days), liability cap, and that customer data may be processed outside the UAE by service providers.
7. **Four products held as drafts (not visible).** Their supplier photos show third-party trademarks — a seated cartoon-mouse figure, two brick-built licensed-vehicle model kits and the matching display frames. Confirm licensing/authenticity or replace the artwork before publishing (Admin → Products → toggle "Visible in store").
8. **AI concierge.** Built but off (`NEXT_PUBLIC_FEATURE_BARGAIN_AI=false`) because the brand "doesn't compete on price". Turn on only with an `OPENROUTER_API_KEY` and agreed discount caps.

## Assets

1. **Higher-resolution photography** for three images that were supplied as small WhatsApp thumbnails: the Sculpted Hand-Grip Vase (both finishes, ~280–310 px wide) and the second Fortune Sheep image. They display but look soft on large screens.
2. **Clean product shots without supplier text.** Supplier banners were cropped or painted out; originals with baked-in Chinese captions or dimension diagrams are better replaced with clean photography when available.
3. **Lifestyle / campaign imagery or short vertical videos** for the hero and "Shop the Space" rail (currently built from the product photography). The rail already supports video (`video` in `lib/merchandising.ts`).
4. **Genuine customer reviews** (with consent) for `data/testimonials.json` — until then the homepage shows the brand's own principles instead.
5. A vector (SVG/AI/EPS) master of the logo. The site uses a live-text wordmark plus a cleaned PNG cut from the supplied JPEG.
