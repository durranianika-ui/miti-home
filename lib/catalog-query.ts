/**
 * Shared catalogue query contract for the storefront listing UI, the public
 * /api/products endpoint and server-rendered listing pages.
 * Keep this file free of `@/` imports: it is loaded by the node test runner.
 */

export const CATALOG_SORTS = ["featured", "newest", "price-asc", "price-desc", "name"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export const CATALOG_SORT_LABELS: Record<CatalogSort, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name: A–Z",
};

export type CatalogQuery = {
  category?: string | null;
  collection?: string | null;
  search?: string | null;
  size?: string | null;
  color?: string | null;
  material?: string | null;
  availability?: "in-stock" | null;
  minPrice?: string | null;
  maxPrice?: string | null;
  isNew?: boolean;
  isFeatured?: boolean;
  onSale?: boolean;
  sort?: CatalogSort | null;
  limit?: number;
  offset?: number;
  includeTotal?: boolean;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_TEXT_FILTER = 80;

function cleanText(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return null;
  return text.slice(0, MAX_TEXT_FILTER);
}

function cleanSlug(value: string | null | undefined) {
  const slug = value?.trim().toLowerCase();
  return slug && SLUG_PATTERN.test(slug) ? slug : null;
}

function cleanAmount(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? String(amount) : null;
}

export function parseCatalogSort(value: string | null | undefined): CatalogSort | null {
  return (CATALOG_SORTS as readonly string[]).includes(value ?? "") ? (value as CatalogSort) : null;
}

/** Parses untrusted URL parameters into a safe catalogue query. */
export function parseCatalogSearchParams(params: URLSearchParams): CatalogQuery {
  return {
    category: cleanSlug(params.get("category")),
    collection: cleanSlug(params.get("collection")),
    search: cleanText(params.get("search")),
    size: cleanText(params.get("size")),
    color: cleanText(params.get("color")),
    material: cleanText(params.get("material")),
    availability: params.get("availability") === "in-stock" ? "in-stock" : null,
    minPrice: cleanAmount(params.get("minPrice")),
    maxPrice: cleanAmount(params.get("maxPrice")),
    isNew: params.get("isNew") === "true",
    isFeatured: params.get("isFeatured") === "true",
    onSale: params.get("onSale") === "true",
    sort: parseCatalogSort(params.get("sort")),
  };
}

/** Serialises a query for /api/products, dropping empty values. */
export function catalogQueryToSearchParams(query: CatalogQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (key === "includeTotal") continue;
    params.set(key, String(value));
  }
  return params;
}

export type PriceBand = { label: string; min: number; max: number };

/** AED price bands used by the listing filter. */
export const PRICE_BANDS: PriceBand[] = [
  { label: "Under AED 100", min: 0, max: 100 },
  { label: "AED 100 – 200", min: 100, max: 200 },
  { label: "AED 200 – 400", min: 200, max: 400 },
  { label: "Over AED 400", min: 400, max: Infinity },
];
