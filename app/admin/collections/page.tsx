import { getAdminCollections } from "@/lib/actions/admin";
import { CollectionsClient } from "./collections-client";
import { requireAdminPage } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  await requireAdminPage("/admin/collections");

  const collections = await getAdminCollections();
  return <CollectionsClient collections={collections} />;
}
