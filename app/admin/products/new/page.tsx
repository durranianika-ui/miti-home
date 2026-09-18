import { getAdminCategories, getAdminCollections } from "@/lib/actions/admin";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [categories, collections] = await Promise.all([getAdminCategories(), getAdminCollections()]);

  return (
    <ProductForm
      categories={categories.map(({ slug, name, isActive }) => ({ slug, name, isActive }))}
      collections={collections.map(({ id, name, isActive }) => ({ id, name, isActive }))}
    />
  );
}
