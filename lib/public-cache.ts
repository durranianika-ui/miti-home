import { buildProductPath } from "./seo.ts";

/** Storefront surfaces that list products and must refresh after catalog or stock changes. */
const PUBLIC_PRODUCT_MUTATION_PATHS = [
  "/",
  "/shop",
  "/new",
  "/best-sellers",
  "/sale",
  "/collections",
  "/gallery",
  "/sitemap.xml",
  "/feeds/google-merchant.xml",
] as const;

const PUBLIC_COMBO_MUTATION_PATHS = [
  "/",
  "/shop",
] as const;

function uniquePaths(paths: string[]) {
  return Array.from(new Set(paths));
}

export function buildCategoryPath(slug: string) {
  return `/shop/${encodeURIComponent(slug)}`;
}

export function buildCollectionPath(slug: string) {
  return `/collections/${encodeURIComponent(slug)}`;
}

export function getPublicProductMutationPaths({
  nextSlug,
  previousSlug,
  categorySlugs = [],
  collectionSlugs = [],
}: {
  nextSlug?: string | null;
  previousSlug?: string | null;
  categorySlugs?: string[];
  collectionSlugs?: string[];
}) {
  return uniquePaths([
    ...PUBLIC_PRODUCT_MUTATION_PATHS,
    ...(nextSlug ? [buildProductPath(nextSlug)] : []),
    ...(previousSlug ? [buildProductPath(previousSlug)] : []),
    ...categorySlugs.map(buildCategoryPath),
    ...collectionSlugs.map(buildCollectionPath),
  ]);
}

export function getPublicComboMutationPaths(comboId?: string | null) {
  return uniquePaths([
    ...PUBLIC_COMBO_MUTATION_PATHS,
    ...(comboId ? [`/combo/${comboId}`] : []),
  ]);
}

export function getPublicTaxonomyMutationPaths({
  categorySlugs = [],
  collectionSlugs = [],
}: {
  categorySlugs?: string[];
  collectionSlugs?: string[];
}) {
  return uniquePaths([
    "/",
    "/shop",
    "/collections",
    "/sitemap.xml",
    ...categorySlugs.map(buildCategoryPath),
    ...collectionSlugs.map(buildCollectionPath),
  ]);
}
