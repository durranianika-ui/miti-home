import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Suspense } from "react";
import { Hero } from "@/components/features/hero";
import { ComboSection } from "@/components/features/combo-section";
import { AngledGalleryBand } from "@/components/features/angled-gallery-band";
import { ProductGrid, ProductGridSkeleton } from "@/components/features/product-grid";
import { RealReviews } from "@/components/features/real-reviews";
import { Newsletter } from "@/components/features/newsletter";
import { BrandStory, CategoryTiles, EditorialStory, LifestyleBanner } from "@/components/features/home-sections";
import { DirectionalMarquee } from "@/components/effects/directional-marquee";
import { getActiveCombosWithProducts } from "@/lib/combos";
import { getCatalogProducts, getCollectionCatalogProducts } from "@/lib/product-catalog";
import { filterCatalogProducts } from "@/lib/catalog-filter";
import { getCollectionBySlug, getNavigationCategories } from "@/lib/taxonomy";
import { buildCategoryPath, buildCollectionPath } from "@/lib/public-cache";
import {
  EDITORIAL_STORY,
  FEATURED_COLLECTION_SLUG,
  LIFESTYLE_BANNER,
  SHOP_THE_SPACE,
} from "@/lib/merchandising";
import { BRAND } from "@/lib/brand";
import {
  JsonLd,
  organizationJsonLd,
  webSiteJsonLd,
} from "@/components/seo/structured-data";
import { normalizeSiteUrl, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo";

const ShopTheSpace = nextDynamic(() =>
  import("@/components/features/shop-the-space").then((mod) => mod.ShopTheSpace),
  {
    loading: () => (
      <section className="min-h-[560px] border-t border-border/60 bg-background px-6 py-16 md:min-h-[650px] md:px-12 md:py-24" aria-hidden="true">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto h-8 w-64 animate-pulse bg-muted" />
          <div className="mt-10 flex gap-4 overflow-hidden">
            {[0, 1, 2].map((item) => (
              <div key={item} className="aspect-[3/4] w-[280px] flex-none animate-pulse bg-muted" />
            ))}
          </div>
        </div>
      </section>
    ),
  }
);

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
  },
};

async function HomeMerchandisingSections() {
  const [{ products }, categories, combos, featuredCollection, featuredProducts] = await Promise.all([
    getCatalogProducts(),
    getNavigationCategories(),
    getActiveCombosWithProducts(4),
    getCollectionBySlug(FEATURED_COLLECTION_SLUG),
    getCollectionCatalogProducts(FEATURED_COLLECTION_SLUG).then((result) => result.products),
  ]);

  const bestSellers = filterCatalogProducts(products, { isFeatured: true, inStockFirst: true, limit: 8 });
  const newArrivals = filterCatalogProducts(products, { isNew: true, inStockFirst: true, limit: 8 });
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const spaces = SHOP_THE_SPACE.map((space) => ({
    id: space.id,
    title: space.title,
    image: space.image,
    video: space.video,
    products: space.productSlugs
      .map((slug) => bySlug.get(slug))
      .filter((product): product is NonNullable<typeof product> => Boolean(product))
      .map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        sellingPrice: product.sellingPrice,
        mrp: product.mrp,
        images: product.images,
      })),
  }));
  const bandItems = products.flatMap((product) =>
    product.images.slice(0, 1).map((image) => ({ src: image, alt: product.name })),
  );

  return (
    <>
      <CategoryTiles
        categories={categories.map((category) => ({
          href: buildCategoryPath(category.slug),
          name: category.name,
          description: category.description,
          image: category.coverImage,
          count: category.productCount,
        }))}
      />
      <ProductGrid
        eyebrow="Most loved"
        title="Best Sellers"
        products={bestSellers}
        viewAllHref="/best-sellers"
        viewAllLabel="Shop best sellers"
      />
      <EditorialStory {...EDITORIAL_STORY} />
      <ProductGrid
        eyebrow="Just landed"
        title="New Arrivals"
        products={newArrivals}
        layout="scroll"
        viewAllHref="/new"
        viewAllLabel="Shop all new arrivals"
      />
      <LifestyleBanner {...LIFESTYLE_BANNER} />
      <ShopTheSpace spaces={spaces} />
      {featuredCollection && (
        <ProductGrid
          eyebrow={featuredCollection.eyebrow ?? "Collection"}
          title={featuredCollection.name}
          description={featuredCollection.description ?? undefined}
          products={featuredProducts}
          viewAllHref={buildCollectionPath(featuredCollection.slug)}
          viewAllLabel={`Explore ${featuredCollection.name}`}
          className="border-t border-border/60"
        />
      )}
      <ComboSection limit={4} interactive={false} mobileLimit={3} initialCombos={combos} />
      <DirectionalMarquee />
      <BrandStory title={BRAND.promise} body={BRAND.description} pillars={BRAND.pillars} />
      <AngledGalleryBand items={bandItems} />
      <RealReviews />
      <Newsletter />
    </>
  );
}

export default function Home() {
  const baseUrl = normalizeSiteUrl();

  return (
    <div className="flex flex-col min-h-screen">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [organizationJsonLd(baseUrl), webSiteJsonLd(baseUrl)],
        }}
      />
      <Hero />
      <Suspense fallback={<ProductGridSkeleton />}>
        <HomeMerchandisingSections />
      </Suspense>
    </div>
  );
}
