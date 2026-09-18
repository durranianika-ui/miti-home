import { getProducts } from "@/lib/actions/admin";
import { CollectionForm } from "../collection-form";
import { toPickerProducts } from "../picker-products";
import { requireAdminPage } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function NewCollectionPage() {
  await requireAdminPage("/admin/collections/new");

  const products = await getProducts({ limit: 1000 });
  return <CollectionForm products={toPickerProducts(products)} />;
}
