import { getAdminCategories, getProductsPage } from "@/lib/actions/admin";
import { ADMIN_PRODUCTS_PAGE_SIZE } from "@/lib/admin-products-pagination";
import { AdminProductsClient } from "./products-client";
import { requireAdminPage } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requireAdminPage("/admin/products");

  const [initialPage, categories] = await Promise.all([
    getProductsPage({ limit: ADMIN_PRODUCTS_PAGE_SIZE }),
    getAdminCategories(),
  ]);

  return (
    <AdminProductsClient
      initialPage={initialPage}
      categories={categories.map(({ slug, name }) => ({ slug, name }))}
    />
  );
}
