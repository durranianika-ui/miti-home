import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function walk(dir: string, files: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.(tsx?|css)$/.test(entry) && !/\.test\.ts$/.test(entry)) files.push(path);
  }
  return files;
}

test("no XILAR, rupee, Razorpay or Indian storefront references remain in shipped code", () => {
  const offenders = [...walk("app"), ...walk("components"), ...walk("lib")].filter((file) => {
    const source = read(file);
    return /xilar|₹|\bINR\b|razorpay|lucknow|pincode|\bpaise\b|rupee/i.test(source);
  });
  assert.deepEqual(offenders, []);
});

test("gallery and admin hide the shared footer through a route-aware shell", () => {
  const layout = read("app/layout.tsx");
  const gate = read("components/layout/footer-gate.tsx");

  assert.match(layout, /<FooterGate shopLinks={navigation\.shop} \/>/);
  assert.match(gate, /usePathname/);
  assert.match(gate, /pathname === "\/gallery"/);
  assert.match(gate, /pathname\.startsWith\("\/admin"\)/);
});

test("home streams the hero before data-dependent merchandising sections", () => {
  const page = read("app/page.tsx");

  assert.match(page, /export default function Home\(\)/);
  assert.doesNotMatch(page, /export default async function Home/);
  assert.match(page, /<Hero \/>[\s\S]*<Suspense fallback={<ProductGridSkeleton \/>}>[\s\S]*<HomeMerchandisingSections \/>[\s\S]*<\/Suspense>/);
  assert.match(page, /async function HomeMerchandisingSections\(\)/);
});

test("home merchandising carves sections from one catalogue fetch", () => {
  const page = read("app/page.tsx");

  assert.match(page, /getCatalogProducts\(\)/);
  assert.match(page, /filterCatalogProducts\(products, \{ isFeatured: true/);
  assert.match(page, /filterCatalogProducts\(products, \{ isNew: true/);
  assert.doesNotMatch(page, /getCatalogProducts\(\{ isNew: true/);
});

test("angled gallery band dedupes product images instead of repeating tiles", () => {
  const galleryBand = read("components/features/angled-gallery-band.tsx");

  assert.match(galleryBand, /function uniqueBySrc/);
  assert.doesNotMatch(galleryBand, /while \(repeated\.length < 32\)/);
});

test("root route suspense reserves the first viewport instead of exposing the footer", () => {
  const layout = read("app/layout.tsx");

  assert.match(layout, /function RouteShellFallback\(\)/);
  assert.match(layout, /<Suspense fallback={<RouteShellFallback \/>}>{children}<\/Suspense>/);
});

test("public product links use slugs while product actions keep ids", () => {
  const card = read("components/features/product-card.tsx");
  const productClient = read("components/features/product-client.tsx");
  const wishlistClient = read("components/features/wishlist-client.tsx");
  const marketingEmail = read("lib/marketing/email-template.ts");

  assert.match(card, /buildProductPath\(product\.slug\)/);
  assert.match(productClient, /buildProductPath\(product\.slug\)/);
  assert.match(wishlistClient, /buildProductPath\(item\.slug\)/);
  assert.match(marketingEmail, /buildProductUrl\(product\.slug/);
  assert.match(productClient, /addWishlistItem\(product\.id\)/);
  assert.match(productClient, /removeWishlistItem\(product\.id\)/);
  assert.doesNotMatch(`${card}\n${wishlistClient}`, /\/product\/\$\{(?:product|item)\.id\}/);
});

test("apparel-only try-on and the paise wallet are gone", () => {
  assert.equal(existsSync("components/features/product-try-on-workspace.tsx"), false);
  assert.equal(existsSync("lib/wallet.ts"), false);
  assert.equal(existsSync("app/api/razorpay"), false);
  assert.doesNotMatch(read("components/features/product-client.tsx"), /TryOn|try-on/);
});

test("old product UUID URLs are intercepted before page streaming", () => {
  const proxy = read("proxy.ts");

  assert.match(proxy, /matcher:\s*"\/product\/:slug"/);
  assert.match(proxy, /PRODUCT_UUID_PATTERN/);
  assert.match(proxy, /,\s*308\)/);
});

test("public product, category, collection and combo pages expose static params", () => {
  for (const file of ["app/product/[slug]/page.tsx", "app/shop/[category]/page.tsx", "app/collections/[slug]/page.tsx", "app/combo/[id]/page.tsx"]) {
    const page = read(file);
    assert.doesNotMatch(page, /dynamic = "force-dynamic"/, file);
    assert.match(page, /generateStaticParams/, file);
  }
});

test("orders can only be created from server-side routes, never a browser-callable action", () => {
  const actions = read("lib/actions/orders.ts");
  const createOrder = read("lib/orders/create-order.ts");

  assert.match(actions, /^"use server";/);
  assert.doesNotMatch(actions, /export async function createOrder/);
  assert.match(createOrder, /^import "server-only";/);
  assert.doesNotMatch(createOrder, /^["']use server["'];?$/m);
  assert.match(read("app/api/orders/route.ts"), /createCheckoutQuote/);
  assert.match(read("app/api/checkout/card/route.ts"), /createCheckoutQuote/);
});

test("footer and menu shells use theme tokens instead of fixed black and white", () => {
  const footer = read("components/layout/footer.tsx");
  const navbar = read("app/navbar.tsx");

  assert.match(footer, /bg-background text-foreground/);
  assert.match(navbar, /bg-background text-foreground/);
  assert.doesNotMatch(`${footer}\n${navbar}`, /bg-neutral-950 text-white/);
});

test("non-critical root effects are deferred out of the initial client path", () => {
  const footerGate = read("components/layout/footer-gate.tsx");
  const cursorLoader = read("components/effects/cursor-dot-loader.tsx");

  assert.match(footerGate, /dynamic\(/);
  assert.match(footerGate, /FooterShell/);
  assert.match(cursorLoader, /requestIdleCallback/);
  assert.match(cursorLoader, /pointer: fine/);
  assert.match(cursorLoader, /prefers-reduced-motion: reduce/);
});

test("hero panels avoid layout-shift-prone layout animation and read from merchandising config", () => {
  const hero = read("components/features/hero.tsx");

  assert.match(hero, /duration: 0\.46/);
  assert.match(hero, /HERO_SLIDES/);
  assert.doesNotMatch(hero, /className="absolute inset-0"\s+layout/);
});

test("animated nav text keeps an accessible fallback", () => {
  const navbar = read("app/navbar.tsx");

  assert.match(navbar, /<span className="sr-only">{text}<\/span>/);
  assert.doesNotMatch(navbar, /<span aria-label={text}/);
});

test("reviews render only real testimonials and never fabricated ratings", () => {
  const reviews = read("components/features/real-reviews.tsx");
  const productClient = read("components/features/product-client.tsx");

  assert.match(reviews, /testimonials\.json/);
  assert.doesNotMatch(reviews, /Verified Buyer|Star/);
  assert.doesNotMatch(productClient, /people viewing|getMockProductStats|selling fast/);
});

test("wishlist is account-backed and has no localStorage fallback", () => {
  const navbar = read("app/navbar.tsx");
  const wishlistPage = read("app/wishlist/page.tsx");
  const productClient = read("components/features/product-client.tsx");

  assert.equal(existsSync("lib/wishlist-context.tsx"), false);
  const wishlistQueries = read("lib/wishlist-queries.ts");
  assert.match(navbar, /fetchWishlistNavState/);
  assert.match(wishlistPage, /getServerSession/);
  assert.match(productClient, /fetchProductWishlist/);
  // Wrappers hit the account-backed server actions except on the static preview.
  assert.match(wishlistQueries, /return getWishlistNavState\(\)/);
  assert.match(wishlistQueries, /return getProductWishlist\(productId\)/);
  assert.doesNotMatch(`${navbar}\n${wishlistPage}\n${productClient}`, /miti-wishlist|useWishlist|WishlistProvider/);
});

test("theme first paint stays static, defaults to the light ivory theme and is repaired before hydration", () => {
  const layout = read("app/layout.tsx");

  assert.doesNotMatch(layout, /cookies\(/);
  assert.doesNotMatch(layout, /next\/headers/);
  assert.match(layout, /localStorage\.getItem\('miti-theme'\)/);
  assert.match(layout, /: 'light';/);
  assert.match(layout, /<html lang="en" dir="ltr" className="light" suppressHydrationWarning>/);
});

test("analytics are environment-driven with no hard-coded tracking IDs", () => {
  const layout = read("app/layout.tsx");
  const analytics = read("components/analytics/analytics.tsx");

  assert.match(layout, /<Analytics \/>/);
  assert.doesNotMatch(`${layout}\n${analytics}`, /["'`](?:G-[A-Z0-9]{6,}|GTM-[A-Z0-9]{4,})["'`]/);
  assert.match(analytics, /NEXT_PUBLIC_GA4_ID/);
  assert.match(analytics, /NEXT_PUBLIC_GTM_ID/);
  assert.match(analytics, /NEXT_PUBLIC_META_PIXEL_ID/);
});

test("public media has explicit cache policy for repeat visits", () => {
  const nextConfig = read("next.config.ts");

  assert.match(nextConfig, /minimumCacheTTL: 60 \* 60 \* 24 \* 30/);
  assert.match(nextConfig, /"\/products\/:path\*"/);
  assert.match(nextConfig, /"\/brand\/:path\*"/);
  assert.match(nextConfig, /stale-while-revalidate=2592000/);
});
