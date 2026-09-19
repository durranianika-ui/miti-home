# Static website preview (GitHub Pages)

Live at **https://durranianika-ui.github.io/miti-home/** — a browse-only snapshot for sharing the design before launch.

## What works / what doesn't

Works: every public page (home, shop, categories, collections, products, gallery, about, contact, policies), images, animations, theme toggle, bag drawer.
Not available (no server on GitHub Pages): checkout, accounts, orders, wishlist, admin, live search suggestions, listing filters that need the API. Those screens show a "switches on at launch" notice. The preview is `noindex` and carries a banner that prices are placeholders.

Preview behaviour is switched on only by `NEXT_PUBLIC_STATIC_PREVIEW=1` (see `components/layout/preview-banner.tsx`, `lib/static-image-loader.ts`, `lib/wishlist-queries.ts`, `next.config.ts`); normal builds are unaffected.

## Rebuild and republish

Needs the local database running and seeded (see README).

```bash
export NEXT_PUBLIC_STATIC_PREVIEW=1 NEXT_PUBLIC_BASE_PATH=/miti-home NEXT_PUBLIC_APP_URL=https://durranianika-ui.github.io/miti-home BETTER_AUTH_URL=https://durranianika-ui.github.io/miti-home
npx next build            # writes .next-preview/
npx next start -p 3200 &  # serve it for the crawler
node scripts/static-preview/export.mjs   # writes static-preview/
```

Then publish `static-preview/` as the `gh-pages` branch:

```bash
cd static-preview && git init -b gh-pages && git add -A && git commit -m "Static website preview" && git push --force https://github.com/durranianika-ui/miti-home.git gh-pages
```

GitHub Pages serves the `gh-pages` branch root. On Windows Git Bash, prefix commands with `MSYS_NO_PATHCONV=1`.
