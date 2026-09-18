# XILAR → Miti Home: audit, plan and change log

## Audit summary (starting point)

- Next.js 16 App Router, React 19, Drizzle + Neon, Better Auth (admin plugin), Razorpay, Resend, Cloudinary, OpenRouter bargain bot, Gemini + Pinecone semantic search, GA4 hard-coded (`G-6GDBLBWZW9`).
- Apparel taxonomy baked into the schema (`product_category` and `product_gender` enums, `fabric`, `gsm`, `isPremium`, sizes S–XXL / 26–34, an "accessory" special case).
- India-specific commerce: ₹/INR everywhere, PIN-code COD allow-list, Razorpay-only online payments, a paise-denominated closed-loop wallet (top-ups, reservations, refunds), Lucknow organisation data, Hindi language hints.
- Apparel-only AI try-on (Gemini image generation + wallet charges).
- Hard-coded XILAR copy in ~110 files: metadata, JSON-LD founders, policies, emails ("XILAR // DROP DESK"), reviews (fabricated "Verified Buyer" testimonials), PDP fake ratings and "N people viewing" counters, reels videos, team photos.
- Legacy migration chain could not be replayed on an empty database (0008 dropped an index that no migration created).
- Security findings: `createOrder` exported from a `"use server"` module accepted client-supplied prices; `createBargainCoupon` was a public server action able to mint any coupon value; the coupon-validate API echoed the full coupon row; `forNewUsersOnly` coupons were never enforced; the account page redirect allowed open redirects; admin pages executed data queries before the layout's auth redirect took effect.

## Plan (as executed)

1. Keep the architecture and motion system; replace brand, taxonomy, commerce rules and content.
2. Additive → data-carryover → drop migrations (0015–0017) so the schema change is reviewable and non-interactive.
3. Centralise brand (`lib/brand.ts`) and UAE commerce config (`lib/constants.ts`, env-overridable).
4. Replace Razorpay/wallet with a provider-agnostic hosted card flow + COD; remove try-on.
5. Import the supplied catalogue with a reproducible image pipeline and idempotent seed.
6. Rebuild customer surfaces (home, listings, PDP, checkout, account) on the existing components; rebuild admin for the new taxonomy.
7. Rewrite SEO, emails, analytics (env-driven), policies; add tests; verify in a real browser at 375–1440 px.

## Reused from XILAR

Three-panel draggable hero; GSAP clip-path editorial menu with 3D page tilt; hide-on-scroll header; staggered text-roll nav; fullscreen search overlay with live suggestions; stagger/blur scroll reveals; scroll-directional marquee; angled parallax gallery band; infinite draggable canvas gallery with FLIP lightbox; custom cursor; reels rail (now "Shop the Space", still video-capable); product gallery swipe + spotlight overlay; cart drawer; combos ("Complete the set"); account-backed wishlist; server-owned checkout quote; atomic order transaction; COD cancellation with stock restore; coupons and store credit; marketing campaigns with unsubscribe tokens; hybrid lexical + semantic search; SEO helpers, sitemap, merchant feed, llms.txt, security.txt; slug URLs with UUID redirects.

## Changed for Miti Home

- **Brand:** ivory/charcoal/signature-gold tokens (light by default, dark mode kept), Montserrat display + Lato body, live-text wordmark with the gold three-bar E, favicon/app icons/OG image from the brand pack.
- **Taxonomy:** `categories` and `collections` tables (admin-managed, drive navigation), product `material`/`dimensions`/`sku`, option labels (Size/Dimensions/Length/Character; Colour/Finish).
- **Commerce:** AED formatting, VAT-inclusive pricing with VAT line on orders, UAE address model (emirate/area/building/apartment/street/instructions), UAE phone normalisation, emirate-based COD rules with a cap, configurable delivery fee/threshold and after-sales windows.
- **Checkout:** server-priced summary endpoint, hosted card payments (Stripe) with webhook + verified-return finalisation, idempotent order creation, paid-but-unfulfilled safety net.
- **Emails:** new branded layout; added order confirmation, order status/shipping, welcome and verification emails.
- **SEO/analytics:** Miti Home metadata, OnlineStore/Product/Breadcrumb/Collection/FAQ JSON-LD in AED for AE, dynamic sitemap incl. categories/collections; GA4/GTM/Meta Pixel/Vercel Analytics all env-driven.
- **Honesty:** removed fabricated reviews, ratings and live-viewer counters.
- **Admin:** categories, collections (membership + ordering), customers, newsletter, fulfilment (courier + tracking), refunds & store credit, low-stock and payments-needing-refund tiles.
