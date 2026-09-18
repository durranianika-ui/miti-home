"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { CatalogProduct } from "@/lib/product-catalog";
import { catalogQueryToSearchParams, type CatalogQuery } from "@/lib/catalog-query";

export type { CatalogProduct };

export type ProductPageResponse = {
  products: CatalogProduct[];
  total: number;
  limit: number;
  offset: number;
};

export type ShopCatalogQuery = Omit<CatalogQuery, "offset" | "includeTotal">;

export const SHOP_CATALOG_QUERY_KEY = ["shop-catalog"] as const;

async function fetchProductPage(query: ShopCatalogQuery, offset: number, limit: number) {
  const params = catalogQueryToSearchParams({ ...query, limit: undefined });
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  const response = await fetch(`/api/products?${params.toString()}`);
  if (!response.ok) throw new Error("We couldn't load products right now.");
  return (await response.json()) as ProductPageResponse;
}

export function useShopCatalog(query: ShopCatalogQuery = {}, initialPage?: ProductPageResponse) {
  const limit = query.limit ?? 24;

  return useInfiniteQuery({
    queryKey: [...SHOP_CATALOG_QUERY_KEY, query],
    queryFn: ({ pageParam }) => fetchProductPage(query, pageParam, limit),
    initialPageParam: 0,
    initialData: initialPage
      ? { pages: [initialPage], pageParams: [initialPage.offset] }
      : undefined,
    getNextPageParam: (lastPage) => {
      const nextOffset = Number(lastPage.offset || 0) + Number(lastPage.limit || limit);
      return nextOffset < Number(lastPage.total || 0) ? nextOffset : undefined;
    },
    select: (data) => data.pages.flatMap((page) => page.products || []),
    staleTime: 1000 * 60 * 5,
  });
}
