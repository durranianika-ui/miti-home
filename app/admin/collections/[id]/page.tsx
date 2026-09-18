import { notFound } from "next/navigation";
import { getAdminCollection, getProducts } from "@/lib/actions/admin";
import { CollectionForm } from "../collection-form";
import { toPickerProducts } from "../picker-products";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const [collection, products] = await Promise.all([getAdminCollection(id), getProducts({ limit: 1000 })]);
  if (!collection) notFound();

  return <CollectionForm key={collection.id} initial={collection} products={toPickerProducts(products)} />;
}
