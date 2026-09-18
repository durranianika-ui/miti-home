import { getProducts } from "@/lib/actions/admin";
import { CollectionForm } from "../collection-form";
import { toPickerProducts } from "../picker-products";

export const dynamic = "force-dynamic";

export default async function NewCollectionPage() {
  const products = await getProducts({ limit: 1000 });
  return <CollectionForm products={toPickerProducts(products)} />;
}
