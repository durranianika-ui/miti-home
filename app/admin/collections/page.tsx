import { getAdminCollections } from "@/lib/actions/admin";
import { CollectionsClient } from "./collections-client";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  const collections = await getAdminCollections();
  return <CollectionsClient collections={collections} />;
}
