import { getAdminCategories } from "@/lib/actions/admin";
import { CategoriesClient } from "./categories-client";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();
  return <CategoriesClient categories={categories} />;
}
