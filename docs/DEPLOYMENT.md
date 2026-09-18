# Deploying Miti Home (Vercel + Neon)

The app is a standard Next.js 16 project. Catalogue, category, collection and product pages are statically generated **at build time from the database**, so the database must exist and be seeded before the first production build.

## 1. Database (Neon)

1. Create a Neon project (region: `aws-me-central-1` / Bahrain or `eu-central-1` for lowest UAE latency).
   The simplest route is Vercel → *Storage* → *Neon* (Marketplace integration), which also injects `DATABASE_URL` into the Vercel project.
2. Use the **pooled** connection string as `DATABASE_URL`.
3. From your machine, with that URL in `.env.local`:

```bash
npm run db:migrate
npm run catalog:images        # only if /public/products is not committed yet
npm run db:seed
npm run admin:create -- --email owner@mitihome.ae --name "Owner" --password "<long passphrase>"
```

The migrator uses the Neon driver automatically for non-localhost URLs.

## 2. Vercel project

1. Import the Git repository in Vercel (framework preset: Next.js; build command `npm run build`; Node 20+).
2. Add environment variables for **Production** and **Preview** — see `.env.example` for the full, annotated list. Minimum:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon pooled URL |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` — different per environment |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | `https://mitihome.ae` in production. For previews, set to the preview domain or leave unset to fall back to `VERCEL_URL` for auth trusted origins |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Required in production for order emails and password reset |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Optional — without them only cash on delivery is offered |

Set values with the Vercel dashboard, or with `printf` from a POSIX shell to avoid trailing CR/LF characters:

```bash
printf '%s' "$VALUE" | vercel env add BETTER_AUTH_SECRET production
```

3. Deploy a **preview** first (`vercel` or push a branch) and run the checks in §5 against the preview URL.

## 3. Email (Resend)

1. Add and verify the sending domain (e.g. `mitihome.ae`) in Resend — SPF + DKIM records at your DNS host.
2. `RESEND_FROM_EMAIL="Miti Home <orders@mitihome.ae>"`, optionally `RESEND_REPLY_TO="hello@mitihome.ae"`.
3. Templates: welcome, email verification, password reset, order confirmation, order status (confirmed / preparing / shipped with courier + tracking / delivered / cancelled) and campaign emails. All are branded via `lib/email-layout.ts`.

## 4. Card payments (optional at launch)

See [PAYMENTS.md](PAYMENTS.md). In short: add the Stripe keys, create a webhook endpoint at `https://<domain>/api/webhooks/payments/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.expired`, and test with Stripe test keys on a preview first.

## 5. Post-deploy verification checklist

- [ ] Home, `/shop`, a category, a collection and a product page render with images
- [ ] Search overlay returns results; listing filters and sort work
- [ ] Sign up, sign in, password reset email arrives
- [ ] Add to bag → checkout → cash on delivery order → confirmation email arrives → order visible in `/orders` and `/admin/orders`
- [ ] (If cards enabled) test card payment → `/checkout/complete` shows the order → webhook delivery shows 200 in the provider dashboard
- [ ] Admin: edit a product price → storefront updates (on-demand revalidation)
- [ ] Admin: mark an order shipped with tracking → customer receives the shipping email
- [ ] `/sitemap.xml`, `/robots.txt`, `/feeds/google-merchant.xml`, `/llms.txt` return Miti Home content with the production domain
- [ ] Browser console is clean on the pages above

## 6. Domain cutover (only after §5 passes on a preview)

1. Add `mitihome.ae` and `www.mitihome.ae` to the Vercel project; choose the apex as primary and redirect `www` → apex (or the reverse — keep it consistent with `NEXT_PUBLIC_APP_URL`).
2. Point DNS at Vercel (A record `76.76.21.21` for the apex, CNAME `cname.vercel-dns.com` for `www`), or follow the exact values Vercel shows.
3. Update `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL` to the final origin and redeploy (they are baked into canonical URLs, emails and payment return URLs).
4. If a Google OAuth client is used, add the production callback `https://mitihome.ae/api/auth/callback/google`.
5. Submit `https://mitihome.ae/sitemap.xml` in Google Search Console and the merchant feed in Merchant Center.

The existing Shopify storefront on `mitihome.ae` must be taken off the domain at the same time — plan the switch for a low-traffic window.

## Operational notes

- **Revalidation:** admin product/category/collection edits and orders revalidate the affected public paths automatically. After bulk seeding, redeploy (or run a build) to regenerate static pages.
- **Images:** catalogue images are served from `/public/products` via `next/image` (optimised WebP, 30-day cache). Admin uploads can go to Cloudinary when its variables are set.
- **Security headers:** set in `next.config.ts` (HSTS, nosniff, frame-deny, referrer policy, permissions policy).
- **Search:** lexical (Postgres full-text + trigram) works out of the box; semantic search activates when `GEMINI_API_KEYS` and `PINECONE_API_KEY` are set (`npm run search:backfill`).
