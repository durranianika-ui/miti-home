"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeProductImage } from "@/lib/image";
import { deleteCollectionAction, saveCollectionAction } from "../_lib/actions";
import { inputClass } from "../_lib/format";
import { invalidateProductSurfaces } from "../_lib/query";
import {
  TaxonomyFields,
  emptyTaxonomyValues,
  taxonomyPayload,
  taxonomyValuesFrom,
  type TaxonomyValues,
} from "../_components/taxonomy-fields";
import type { PickerProduct } from "./picker-products";

export type CollectionFormInitial = {
  id: string;
  name: string;
  slug: string;
  eyebrow: string | null;
  description: string | null;
  image: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  displayOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  productIds: string[];
};

function move<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function Thumb({ src }: { src: string | null }) {
  return src ? (
    <Image
      src={normalizeProductImage(src)}
      alt=""
      width={40}
      height={40}
      className="h-10 w-10 shrink-0 rounded object-cover"
      unoptimized
    />
  ) : (
    <div className="h-10 w-10 shrink-0 rounded bg-muted" aria-hidden="true" />
  );
}

export function CollectionForm({
  initial,
  products,
}: {
  initial?: CollectionFormInitial;
  products: PickerProduct[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const uid = useId();
  const errorRef = useRef<HTMLDivElement>(null);

  const [values, setValues] = useState<TaxonomyValues>(() => (initial ? taxonomyValuesFrom(initial) : emptyTaxonomyValues()));
  const [autoSlug, setAutoSlug] = useState(!initial);
  const [eyebrow, setEyebrow] = useState(initial?.eyebrow ?? "");
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [memberIds, setMemberIds] = useState<string[]>(initial?.productIds ?? []);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isNavigating, startTransition] = useTransition();
  const busy = saving || deleting || isNavigating;

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const members = memberIds.map((id) => productById.get(id)).filter((product): product is PickerProduct => Boolean(product));
  const memberSet = useMemo(() => new Set(memberIds), [memberIds]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const candidates = products.filter((product) => !memberSet.has(product.id));
    if (!term) return candidates.slice(0, 12);
    return candidates
      .filter((product) =>
        [product.name, product.slug, product.sku ?? "", product.category].some((field) => field.toLowerCase().includes(term)),
      )
      .slice(0, 30);
  }, [products, memberSet, query]);

  const showError = (message: string) => {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    setSaving(true);
    const result = await saveCollectionAction(initial?.id ?? null, {
      ...taxonomyPayload(values),
      eyebrow: eyebrow.trim() || null,
      isFeatured,
      productIds: members.map((product) => product.id),
    });
    if (!result.ok) {
      setSaving(false);
      showError(result.error);
      return;
    }
    invalidateProductSurfaces(queryClient);
    startTransition(() => {
      router.push("/admin/collections");
      router.refresh();
    });
  };

  const handleDelete = async () => {
    if (!initial || busy) return;
    if (!confirm(`Delete the collection "${initial.name}"? Its products stay in the catalogue.`)) return;
    setDeleting(true);
    const result = await deleteCollectionAction(initial.id);
    if (!result.ok) {
      setDeleting(false);
      showError(result.error);
      return;
    }
    invalidateProductSurfaces(queryClient);
    startTransition(() => {
      router.push("/admin/collections");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button asChild variant="ghost" size="icon" aria-label="Back to collections">
          <Link href="/admin/collections">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{initial ? "Edit collection" : "New collection"}</h1>
          <p className="text-muted-foreground">Curated edits shown at /collections/&lt;slug&gt;.</p>
        </div>
        {initial && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/collections/${initial.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              View in store
            </Link>
          </Button>
        )}
      </div>

      <div
        ref={errorRef}
        tabIndex={-1}
        role="alert"
        aria-live="assertive"
        className={error ? "rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive outline-none" : "sr-only"}
      >
        {error}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor={`${uid}-eyebrow`} className="text-sm font-medium">
                  Eyebrow
                </label>
                <input
                  id={`${uid}-eyebrow`}
                  type="text"
                  value={eyebrow}
                  onChange={(event) => setEyebrow(event.target.value)}
                  className={inputClass}
                  placeholder="The Majlis Edit"
                  aria-describedby={`${uid}-eyebrow-hint`}
                />
                <p id={`${uid}-eyebrow-hint`} className="text-xs text-muted-foreground">
                  Small line shown above the collection title.
                </p>
              </div>
              <div className="flex items-start gap-2 sm:pt-7">
                <input
                  id={`${uid}-featured`}
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(event) => setIsFeatured(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
                  aria-describedby={`${uid}-featured-hint`}
                />
                <div>
                  <label htmlFor={`${uid}-featured`} className="text-sm font-medium">
                    Featured collection
                  </label>
                  <p id={`${uid}-featured-hint`} className="text-xs text-muted-foreground">
                    Highlighted on the home page and navigation.
                  </p>
                </div>
              </div>
            </div>
            <TaxonomyFields
              values={values}
              onChange={setValues}
              autoSlug={autoSlug}
              onSlugEdited={() => setAutoSlug(false)}
              urlPrefix="/collections/"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products ({members.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products in this collection yet. Add some below.</p>
            ) : (
              <ol className="divide-y divide-border rounded-lg border border-border" aria-label="Products in display order">
                {members.map((product, index) => (
                  <li key={product.id} className="flex items-center gap-3 p-2">
                    <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                    <Thumb src={product.image} />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {product.category}
                        {product.isActive ? "" : " · hidden"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setMemberIds(move(members.map((m) => m.id), index, index - 1))}
                      disabled={index === 0}
                      aria-label={`Move ${product.name} up`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setMemberIds(move(members.map((m) => m.id), index, index + 1))}
                      disabled={index === members.length - 1}
                      aria-label={`Move ${product.name} down`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setMemberIds((current) => current.filter((id) => id !== product.id))}
                      aria-label={`Remove ${product.name} from collection`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ol>
            )}

            <div className="space-y-2">
              <label htmlFor={`${uid}-search`} className="text-sm font-medium">
                Add products
              </label>
              <input
                id={`${uid}-search`}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={inputClass}
                placeholder="Search by name, SKU or category"
                aria-controls={`${uid}-results`}
              />
              <ul id={`${uid}-results`} className="divide-y divide-border rounded-lg border border-border" aria-label="Matching products">
                {results.length === 0 ? (
                  <li className="p-3 text-sm text-muted-foreground">No matching products.</li>
                ) : (
                  results.map((product) => (
                    <li key={product.id} className="flex items-center gap-3 p-2">
                      <Thumb src={product.image} />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm">{product.name}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {product.category}
                          {product.isActive ? "" : " · hidden"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMemberIds((current) => [...current, product.id])}
                        aria-label={`Add ${product.name}`}
                      >
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          {initial && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={busy}
              className="text-destructive hover:text-destructive sm:mr-auto"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete collection
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => router.push("/admin/collections")} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy} className="bg-brand text-neutral-950 hover:bg-brand/90 sm:min-w-40">
            {(saving || isNavigating) && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Save collection" : "Create collection"}
          </Button>
        </div>
      </form>
    </div>
  );
}
