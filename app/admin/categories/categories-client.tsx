"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getAdminCategories } from "@/lib/actions/admin";
import { deleteCategoryAction, saveCategoryAction } from "../_lib/actions";
import {
  TaxonomyFields,
  emptyTaxonomyValues,
  taxonomyPayload,
  taxonomyValuesFrom,
  type TaxonomyValues,
} from "../_components/taxonomy-fields";
import { invalidateProductSurfaces } from "../_lib/query";

type AdminCategory = Awaited<ReturnType<typeof getAdminCategories>>[number];

export function CategoriesClient({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const [values, setValues] = useState<TaxonomyValues>(emptyTaxonomyValues);
  const [autoSlug, setAutoSlug] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const openEditor = (category: AdminCategory | null) => {
    setError("");
    setNotice("");
    if (category) {
      setEditing(category.id);
      setValues(taxonomyValuesFrom(category));
      setAutoSlug(false);
    } else {
      setEditing("new");
      setValues(emptyTaxonomyValues());
      setAutoSlug(true);
    }
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const refresh = () => {
    invalidateProductSurfaces(queryClient);
    startTransition(() => router.refresh());
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    const result = await saveCategoryAction(editing === "new" ? null : editing, taxonomyPayload(values));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(editing === "new" ? `Category "${values.name}" created.` : `Category "${values.name}" saved.`);
    setEditing(null);
    refresh();
  };

  const handleDelete = async (category: AdminCategory) => {
    if (!confirm(`Delete the category "${category.name}"?`)) return;
    setDeletingId(category.id);
    setError("");
    setNotice("");
    const result = await deleteCategoryAction(category.id);
    setDeletingId(null);
    if (!result.ok) {
      setError(`${category.name}: ${result.error}`);
      return;
    }
    if (editing === category.id) setEditing(null);
    setNotice(`Category "${category.name}" deleted.`);
    refresh();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Each product belongs to exactly one category (shown at /shop/&lt;slug&gt;).</p>
        </div>
        <Button onClick={() => openEditor(null)} className="bg-brand text-neutral-950 hover:bg-brand/90">
          <Plus className="h-4 w-4" />
          New category
        </Button>
      </div>

      <div role="alert" aria-live="assertive" className={error ? "rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" : "sr-only"}>
        {error}
      </div>
      <div role="status" aria-live="polite" className={notice ? "rounded-lg border border-border bg-muted p-3 text-sm" : "sr-only"}>
        {notice}
      </div>

      {editing && (
        <div ref={formRef} className="scroll-mt-32">
          <Card>
            <CardHeader>
              <CardTitle>{editing === "new" ? "New category" : `Edit ${values.name || "category"}`}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-5">
                <TaxonomyFields
                  values={values}
                  onChange={setValues}
                  autoSlug={autoSlug}
                  onSlugEdited={() => setAutoSlug(false)}
                  urlPrefix="/shop/"
                />
                {editing !== "new" && (
                  <p className="text-xs text-muted-foreground">
                    Changing the slug moves every product in this category to the new slug automatically.
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={saving} className="bg-brand text-neutral-950 hover:bg-brand/90">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editing === "new" ? "Create category" : "Save category"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th scope="col" className="p-3 font-medium">Category</th>
              <th scope="col" className="p-3 font-medium">Slug</th>
              <th scope="col" className="p-3 font-medium">Products</th>
              <th scope="col" className="p-3 font-medium">Order</th>
              <th scope="col" className="p-3 font-medium">Status</th>
              <th scope="col" className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No categories yet.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{category.name}</div>
                    {category.description && (
                      <div className="line-clamp-1 text-xs text-muted-foreground">{category.description}</div>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs">{category.slug}</td>
                  <td className="p-3">
                    <Link href="/admin/products" className="hover:underline">
                      {category.productCount}
                    </Link>
                  </td>
                  <td className="p-3">{category.displayOrder}</td>
                  <td className="p-3">
                    {category.isActive ? (
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-400">Visible</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Hidden</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" aria-label={`View ${category.name} in store`}>
                        <Link href={`/shop/${category.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditor(category)} aria-label={`Edit ${category.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category)}
                        disabled={deletingId === category.id}
                        className="text-destructive hover:text-destructive"
                        aria-label={`Delete ${category.name}`}
                        title={category.productCount > 0 ? "Move its products to another category first" : undefined}
                      >
                        {deletingId === category.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
