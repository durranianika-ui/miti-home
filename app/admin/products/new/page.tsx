import { getAdminCategories, getAdminCollections } from "@/lib/actions/admin";
import { ProductForm } from "../product-form";
import { requireAdminPage } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAdminPage("/admin/products/new");

  const [categories, collections] = await Promise.all([getAdminCategories(), getAdminCollections()]);

  return (
    <ProductForm
      categories={categories.map(({ slug, name, isActive }) => ({ slug, name, isActive }))}
      collections={collections.map(({ id, name, isActive }) => ({ id, name, isActive }))}
    />
  );
}
