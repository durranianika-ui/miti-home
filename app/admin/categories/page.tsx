import { getAdminCategories } from "@/lib/actions/admin";
import { CategoriesClient } from "./categories-client";
import { requireAdminPage } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdminPage("/admin/categories");

  const categories = await getAdminCategories();
  return <CategoriesClient categories={categories} />;
}
