import type { QueryClient } from "@tanstack/react-query";

/** Invalidates every cached surface (admin + storefront) that shows product data. */
export function invalidateProductSurfaces(queryClient: QueryClient, productId?: string) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const [scope] = query.queryKey;
      return (
        scope === "products" ||
        scope === "shop-products" ||
        scope === "shop-catalog" ||
        scope === "shop-the-reels" ||
        scope === "combos" ||
        scope === "combo" ||
        scope === "admin-products" ||
        scope === "admin-combo-products" ||
        scope === "admin-dashboard" ||
        (scope === "product" && (!productId || query.queryKey[1] === productId))
      );
    },
  });

  if (productId) {
    queryClient.removeQueries({ queryKey: ["product", productId] });
  }
}
