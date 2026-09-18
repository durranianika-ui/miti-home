"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { getAdminCollections } from "@/lib/actions/admin";
import { deleteCollectionAction } from "../_lib/actions";
import { invalidateProductSurfaces } from "../_lib/query";

type AdminCollection = Awaited<ReturnType<typeof getAdminCollections>>[number];

export function CollectionsClient({ collections }: { collections: AdminCollection[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleDelete = async (collection: AdminCollection) => {
    if (!confirm(`Delete the collection "${collection.name}"? Its products stay in the catalogue.`)) return;
    setDeletingId(collection.id);
    setError("");
    setNotice("");
    const result = await deleteCollectionAction(collection.id);
    setDeletingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(`Collection "${collection.name}" deleted.`);
    invalidateProductSurfaces(queryClient);
    startTransition(() => router.refresh());
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground">Curated edits that group products across categories.</p>
        </div>
        <Button asChild className="bg-brand text-neutral-950 hover:bg-brand/90">
          <Link href="/admin/collections/new">
            <Plus className="h-4 w-4" />
            New collection
          </Link>
        </Button>
      </div>

      <div role="alert" aria-live="assertive" className={error ? "rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" : "sr-only"}>
        {error}
      </div>
      <div role="status" aria-live="polite" className={notice ? "rounded-lg border border-border bg-muted p-3 text-sm" : "sr-only"}>
        {notice}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th scope="col" className="p-3 font-medium">Collection</th>
              <th scope="col" className="p-3 font-medium">Slug</th>
              <th scope="col" className="p-3 font-medium">Products</th>
              <th scope="col" className="p-3 font-medium">Order</th>
              <th scope="col" className="p-3 font-medium">Status</th>
              <th scope="col" className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {collections.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No collections yet.
                </td>
              </tr>
            ) : (
              collections.map((collection) => (
                <tr key={collection.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    {collection.eyebrow && (
                      <div className="text-[10px] uppercase tracking-[0.16em] text-brand-strong">{collection.eyebrow}</div>
                    )}
                    <Link href={`/admin/collections/${collection.id}`} className="font-medium hover:underline">
                      {collection.name}
                    </Link>
                  </td>
                  <td className="p-3 font-mono text-xs">{collection.slug}</td>
                  <td className="p-3">{collection.productCount}</td>
                  <td className="p-3">{collection.displayOrder}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {collection.isActive ? (
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-400">Visible</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Hidden</span>
                      )}
                      {collection.isFeatured && (
                        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand-strong">Featured</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" aria-label={`View ${collection.name} in store`}>
                        <Link href={`/collections/${collection.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon" aria-label={`Edit ${collection.name}`}>
                        <Link href={`/admin/collections/${collection.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(collection)}
                        disabled={deletingId === collection.id}
                        className="text-destructive hover:text-destructive"
                        aria-label={`Delete ${collection.name}`}
                      >
                        {deletingId === collection.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
