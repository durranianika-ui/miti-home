/**
 * Pure in-memory catalogue filters used to carve homepage sections out of a
 * single server fetch. Keep this file free of `@/` imports: it is loaded by
 * the node test runner.
 */

export type FilterableProduct = {
  category: string;
  isFeatured: boolean;
  isNew: boolean;
  mrp: string;
  sellingPrice: string;
  name: string;
  stock: number;
};

export type CatalogFilterOptions = {
  category?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  onSale?: boolean;
  inStockFirst?: boolean;
  searchQuery?: string;
  limit?: number | null;
};

export function isOnSale(product: Pick<FilterableProduct, "mrp" | "sellingPrice">) {
  return Number(product.mrp) > Number(product.sellingPrice);
}

export function filterCatalogProducts<T extends FilterableProduct>(
  products: T[],
  { category, isFeatured, isNew, onSale, inStockFirst, searchQuery, limit }: CatalogFilterOptions,
) {
  const query = searchQuery?.trim().toLowerCase();
  let filtered = products
    .filter((product) => !category || product.category === category)
    .filter((product) => !isFeatured || product.isFeatured)
    .filter((product) => !isNew || product.isNew)
    .filter((product) => !onSale || isOnSale(product))
    .filter((product) => !query || product.name.toLowerCase().includes(query));

  if (inStockFirst) {
    filtered = [...filtered].sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));
  }

  return typeof limit === "number" ? filtered.slice(0, limit) : filtered;
}
