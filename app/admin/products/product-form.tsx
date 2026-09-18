"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_OPTION, slugify, type ProductInput } from "@/lib/admin-product-input";
import { formatPrice } from "@/lib/money";
import { normalizeProductImage } from "@/lib/image";
import { deleteProductAction, saveProductAction } from "../_lib/actions";
import { inputClass } from "../_lib/format";
import { invalidateProductSurfaces } from "../_lib/query";

type ColorRow = { name: string; hex: string; images: string[] };

export type ProductFormInitial = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  mrp: string;
  sellingPrice: string;
  maxBargainDiscount: string;
  category: string;
  tags: string[] | null;
  images: string[] | null;
  material: string | null;
  dimensions: string | null;
  careInstructions: string[] | null;
  features: string[] | null;
  sizeLabel: string;
  colorLabel: string;
  sizes: string[] | null;
  colors: { name: string; hex: string; images?: string[] }[] | null;
  isNew: boolean;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  collectionIds: string[];
  variants: { size: string; color: string | null; stock: number }[];
};

export type CategoryOption = { slug: string; name: string; isActive: boolean };
export type CollectionOption = { id: string; name: string; isActive: boolean };

const SIZE_LABEL_SUGGESTIONS = ["Size", "Dimensions", "Length", "Capacity", "Character", "Style"];
const COLOR_LABEL_SUGGESTIONS = ["Colour", "Finish", "Material", "Scent"];
const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function variantKey(size: string, color: string | null) {
  return `${size}|${color ?? ""}`;
}

function linesToList(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function commaToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueCaseInsensitive(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function move<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function Field({
  id,
  label,
  hint,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function Checkbox({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      <div>
        <label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

/** Chip list with an add box — used for the primary options (sizes, dimensions…). */
function ChipListEditor({
  id,
  label,
  values,
  onChange,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  hint?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const additions = commaToList(draft);
    if (additions.length === 0) return;
    onChange(uniqueCaseInsensitive([...values, ...additions]));
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          className={inputClass}
          placeholder={placeholder}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        <Button type="button" variant="outline" onClick={add} aria-label={`Add to ${label}`}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`${label} list`}>
          {values.map((value, index) => (
            <li key={value} className="flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-sm">
              <button
                type="button"
                onClick={() => onChange(move(values, index, index - 1))}
                disabled={index === 0}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                aria-label={`Move ${value} earlier`}
              >
                <ArrowUp className="h-3 w-3 -rotate-90" />
              </button>
              <span>{value}</span>
              <button
                type="button"
                onClick={() => onChange(values.filter((_, i) => i !== index))}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${value}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProductForm({
  initial,
  categories,
  collections,
}: {
  initial?: ProductFormInitial;
  categories: CategoryOption[];
  collections: CollectionOption[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  const errorRef = useRef<HTMLDivElement>(null);
  const isEdit = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [material, setMaterial] = useState(initial?.material ?? "");
  const [dimensions, setDimensions] = useState(initial?.dimensions ?? "");
  const [category, setCategory] = useState(initial?.category ?? categories[0]?.slug ?? "");
  const [sellingPrice, setSellingPrice] = useState(initial?.sellingPrice ?? "");
  const [mrp, setMrp] = useState(initial?.mrp ?? "");
  const [maxBargainDiscount, setMaxBargainDiscount] = useState(initial?.maxBargainDiscount ?? "0");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [features, setFeatures] = useState((initial?.features ?? []).join("\n"));
  const [careInstructions, setCareInstructions] = useState((initial?.careInstructions ?? []).join("\n"));
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sizeLabel, setSizeLabel] = useState(initial?.sizeLabel ?? "Size");
  const [sizes, setSizes] = useState<string[]>(
    initial?.sizes && initial.sizes.length > 0 ? initial.sizes : [DEFAULT_OPTION],
  );
  const [colorLabel, setColorLabel] = useState(initial?.colorLabel ?? "Colour");
  const [colors, setColors] = useState<ColorRow[]>(
    (initial?.colors ?? []).map((color) => ({ name: color.name, hex: color.hex, images: color.images ?? [] })),
  );
  const [variantStock, setVariantStock] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const variant of initial?.variants ?? []) {
      map[variantKey(variant.size, variant.color)] = String(variant.stock);
    }
    return map;
  });
  const [collectionIds, setCollectionIds] = useState<string[]>(initial?.collectionIds ?? []);
  const [isNew, setIsNew] = useState(initial?.isNew ?? false);
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [displayOrder, setDisplayOrder] = useState(String(initial?.displayOrder ?? 0));

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isNavigating, startTransition] = useTransition();
  const busy = saving || deleting || isNavigating;

  const categoryKnown = categories.some((option) => option.slug === category);

  const matrix = useMemo(() => {
    const options = sizes.length > 0 ? sizes : [DEFAULT_OPTION];
    const colourNames = colors.map((color) => color.name.trim()).filter(Boolean);
    const rows = options.map((size) => ({
      size,
      cells: (colourNames.length > 0 ? colourNames : [null]).map((color) => ({
        color,
        key: variantKey(size, color),
      })),
    }));
    return { rows, colourNames };
  }, [sizes, colors]);

  const totalStock = matrix.rows.reduce(
    (sum, row) => sum + row.cells.reduce((cellSum, cell) => cellSum + (Number.parseInt(variantStock[cell.key] ?? "0", 10) || 0), 0),
    0,
  );

  const showError = (message: string) => {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = input.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        body.append("folder", "miti-home/products");
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
        setImages((current) => [...current, data.url!]);
      }
    } catch (uploadError) {
      showError(uploadError instanceof Error ? uploadError.message : "Failed to upload image");
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  const addImageUrl = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    if (!/^(https?:\/\/|\/)/.test(url)) {
      showError("Image URLs must start with https:// or / (for files under /public).");
      return;
    }
    setImages((current) => (current.includes(url) ? current : [...current, url]));
    setNewImageUrl("");
  };

  const updateColor = (index: number, patch: Partial<ColorRow>) => {
    setColors((current) => current.map((color, i) => (i === index ? { ...color, ...patch } : color)));
  };

  const renameColor = (index: number, nextName: string) => {
    const previous = colors[index]?.name;
    updateColor(index, { name: nextName });
    // Carry stock across when a colour is renamed.
    if (previous !== undefined && previous.trim() && nextName.trim() && previous !== nextName) {
      setVariantStock((current) => {
        const next = { ...current };
        for (const size of sizes) {
          const oldKey = variantKey(size, previous.trim());
          if (oldKey in next) {
            next[variantKey(size, nextName.trim())] = next[oldKey];
            delete next[oldKey];
          }
        }
        return next;
      });
    }
  };

  const toggleCollection = (id: string, checked: boolean) => {
    setCollectionIds((current) => (checked ? [...current, id] : current.filter((value) => value !== id)));
  };

  const buildInput = (): ProductInput | string => {
    if (!name.trim()) return "Product name is required.";
    if (!slug.trim()) return "Slug is required.";
    if (!category) return "Choose a category.";
    if (!sellingPrice) return "Price is required.";

    const cleanColors = colors
      .map((color) => ({ ...color, name: color.name.trim(), hex: color.hex.trim() }))
      .filter((color) => color.name);
    for (const color of cleanColors) {
      if (!HEX_PATTERN.test(color.hex)) return `Swatch for "${color.name}" must be a hex value like #C8A96A.`;
    }
    if (uniqueCaseInsensitive(cleanColors.map((color) => color.name)).length !== cleanColors.length) {
      return `Each ${colorLabel.toLowerCase() || "colour"} needs a different name.`;
    }

    const options = sizes.length > 0 ? sizes : [DEFAULT_OPTION];
    const variants = matrix.rows.flatMap((row) =>
      row.cells.map((cell) => ({
        size: row.size,
        color: cell.color,
        stock: Math.max(0, Number.parseInt(variantStock[cell.key] ?? "0", 10) || 0),
      })),
    );
    const compareAt = mrp.trim() === "" ? sellingPrice : mrp;

    return {
      name: name.trim(),
      slug: slug.trim(),
      sku: sku.trim() || null,
      description: description.trim() || null,
      mrp: compareAt,
      sellingPrice,
      maxBargainDiscount: maxBargainDiscount.trim() === "" ? "0" : maxBargainDiscount,
      category,
      tags: uniqueCaseInsensitive(commaToList(tags)),
      stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
      images,
      material: material.trim() || null,
      dimensions: dimensions.trim() || null,
      careInstructions: linesToList(careInstructions),
      features: linesToList(features),
      sizeLabel: sizeLabel.trim() || "Size",
      colorLabel: colorLabel.trim() || "Colour",
      sizes: options,
      colors: cleanColors.map((color) => ({
        name: color.name,
        hex: color.hex,
        ...(color.images.length > 0 ? { images: color.images } : {}),
      })),
      variants,
      collectionIds,
      isNew,
      isFeatured,
      isActive,
      displayOrder: Math.max(0, Number.parseInt(displayOrder, 10) || 0),
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError("");

    const input = buildInput();
    if (typeof input === "string") {
      showError(input);
      return;
    }

    setSaving(true);
    const result = await saveProductAction(initial?.id ?? null, input);
    if (!result.ok) {
      setSaving(false);
      showError(result.error);
      return;
    }

    invalidateProductSurfaces(queryClient, result.data.id);
    startTransition(() => {
      router.push("/admin/products");
      router.refresh();
    });
  };

  const handleDelete = async () => {
    if (!initial || busy) return;
    if (!confirm(`Delete "${initial.name}"? Products with past orders are hidden from the store instead of deleted.`)) return;
    setDeleting(true);
    const result = await deleteProductAction(initial.id);
    if (!result.ok) {
      setDeleting(false);
      showError(result.error);
      return;
    }
    if (result.data.archived) {
      alert("This product has order history, so it was hidden from the store instead of deleted.");
    }
    invalidateProductSurfaces(queryClient, initial.id);
    startTransition(() => {
      router.push("/admin/products");
      router.refresh();
    });
  };

  const discountHint =
    Number(mrp) > Number(sellingPrice) && Number(sellingPrice) > 0
      ? `Shows as ${formatPrice(sellingPrice)} (was ${formatPrice(mrp)}).`
      : "Optional. Set higher than the price to show a strike-through.";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button asChild variant="ghost" size="icon" aria-label="Back to products">
          <Link href="/admin/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{isEdit ? "Edit product" : "Add product"}</h1>
          <p className="text-muted-foreground">
            {isEdit ? "Update details, options, stock and merchandising." : "Create a new piece for the Miti Home catalogue."}
          </p>
        </div>
        {initial && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/product/${initial.slug}`} target="_blank" rel="noopener noreferrer">
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

      {categories.length === 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm">
          No categories exist yet. <Link href="/admin/categories" className="underline">Create a category</Link> before adding products.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Basics */}
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id={fid("name")} label="Product name" required>
                <input
                  id={fid("name")}
                  type="text"
                  required
                  value={name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  className={inputClass}
                  placeholder="Fluted Travertine Vase"
                />
              </Field>
              <Field
                id={fid("slug")}
                label="Slug"
                required
                hint={`Storefront URL: /product/${slug || "…"}`}
              >
                <div className="flex gap-2">
                  <input
                    id={fid("slug")}
                    type="text"
                    required
                    value={slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      setSlug(event.target.value.toLowerCase());
                    }}
                    className={inputClass}
                    placeholder="fluted-travertine-vase"
                    aria-describedby={`${fid("slug")}-hint`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto"
                    onClick={() => {
                      setSlug(slugify(name));
                      setSlugTouched(false);
                    }}
                    disabled={!name.trim()}
                  >
                    From name
                  </Button>
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id={fid("category")} label="Category" required>
                <select
                  id={fid("category")}
                  required
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className={inputClass}
                >
                  {!categoryKnown && <option value={category}>{category ? `${category} (missing)` : "Choose a category"}</option>}
                  {categories.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.name}
                      {option.isActive ? "" : " (hidden)"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id={fid("sku")} label="SKU" hint="Your internal stock code. Optional.">
                <input
                  id={fid("sku")}
                  type="text"
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                  className={inputClass}
                  placeholder="MH-VASE-001"
                  aria-describedby={`${fid("sku")}-hint`}
                />
              </Field>
            </div>

            <Field id={fid("description")} label="Description">
              <textarea
                id={fid("description")}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={`${inputClass} min-h-[120px]`}
                placeholder="Hand-finished travertine with a softly fluted silhouette…"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id={fid("material")} label="Material">
                <input
                  id={fid("material")}
                  type="text"
                  value={material}
                  onChange={(event) => setMaterial(event.target.value)}
                  className={inputClass}
                  placeholder="Travertine, brass"
                />
              </Field>
              <Field id={fid("dimensions")} label="Dimensions" hint="Overall size shown on the product page.">
                <input
                  id={fid("dimensions")}
                  type="text"
                  value={dimensions}
                  onChange={(event) => setDimensions(event.target.value)}
                  className={inputClass}
                  placeholder="H 30 cm × Ø 15 cm"
                  aria-describedby={`${fid("dimensions")}-hint`}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing (AED, VAT inclusive)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field id={fid("price")} label="Price (AED)" required>
                <input
                  id={fid("price")}
                  type="number"
                  inputMode="decimal"
                  required
                  min="0"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(event) => setSellingPrice(event.target.value)}
                  className={inputClass}
                  placeholder="450"
                />
              </Field>
              <Field id={fid("mrp")} label="Compare-at price (AED)" hint={discountHint}>
                <input
                  id={fid("mrp")}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={mrp}
                  onChange={(event) => setMrp(event.target.value)}
                  className={inputClass}
                  placeholder="Same as price"
                  aria-describedby={`${fid("mrp")}-hint`}
                />
              </Field>
              <Field
                id={fid("bargain")}
                label="Max concierge discount (AED)"
                hint="Most the shopping concierge may knock off. 0 disables offers."
              >
                <input
                  id={fid("bargain")}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={maxBargainDiscount}
                  onChange={(event) => setMaxBargainDiscount(event.target.value)}
                  className={inputClass}
                  aria-describedby={`${fid("bargain")}-hint`}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor={fid("upload")} className="text-sm font-medium">
                Upload from device
              </label>
              <label
                htmlFor={fid("upload")}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-4 text-sm transition-colors hover:border-brand focus-within:ring-2 focus-within:ring-ring/50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" /> Choose images (JPG, PNG, WebP · max 10 MB each)
                  </>
                )}
                <input
                  id={fid("upload")}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="sr-only"
                />
              </label>
            </div>

            <Field id={fid("image-url")} label="Or add an image URL / path" hint="e.g. https://res.cloudinary.com/… or /products/fluted-vase/1.webp">
              <div className="flex gap-2">
                <input
                  id={fid("image-url")}
                  type="text"
                  value={newImageUrl}
                  onChange={(event) => setNewImageUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addImageUrl();
                    }
                  }}
                  className={inputClass}
                  placeholder="/products/slug/1.webp"
                  aria-describedby={`${fid("image-url")}-hint`}
                />
                <Button type="button" variant="outline" onClick={addImageUrl} aria-label="Add image URL">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </Field>

            {images.length > 0 ? (
              <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Product images in display order">
                {images.map((src, index) => (
                  <li key={`${src}-${index}`} className="space-y-2 rounded-lg border border-border p-2">
                    <div className="relative aspect-square overflow-hidden rounded bg-muted">
                      <Image
                        src={normalizeProductImage(src)}
                        alt={`Image ${index + 1}`}
                        fill
                        sizes="160px"
                        className="object-cover"
                        unoptimized
                      />
                      {index === 0 && (
                        <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-neutral-950">
                          Main
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground" title={src}>
                      {src}
                    </p>
                    <div className="flex justify-between gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setImages((current) => move(current, index, index - 1))}
                        disabled={index === 0}
                        aria-label={`Move image ${index + 1} earlier`}
                      >
                        <ArrowUp className="h-4 w-4 -rotate-90" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setImages((current) => move(current, index, index + 1))}
                        disabled={index === images.length - 1}
                        aria-label={`Move image ${index + 1} later`}
                      >
                        <ArrowDown className="h-4 w-4 -rotate-90" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No images yet. The first image is used as the main photo.</p>
            )}
          </CardContent>
        </Card>

        {/* Options */}
        <Card>
          <CardHeader>
            <CardTitle>Options &amp; stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,14rem)_1fr]">
              <Field id={fid("size-label")} label="Option name" hint="What shoppers choose, e.g. Size or Dimensions.">
                <input
                  id={fid("size-label")}
                  type="text"
                  list={fid("size-label-list")}
                  value={sizeLabel}
                  onChange={(event) => setSizeLabel(event.target.value)}
                  className={inputClass}
                  aria-describedby={`${fid("size-label")}-hint`}
                />
                <datalist id={fid("size-label-list")}>
                  {SIZE_LABEL_SUGGESTIONS.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </Field>
              <ChipListEditor
                id={fid("sizes")}
                label={`${sizeLabel || "Option"} values`}
                values={sizes}
                onChange={setSizes}
                placeholder="20 cm, 30 cm"
                hint={`Separate several with commas. Leave just "${DEFAULT_OPTION}" for single-option pieces.`}
              />
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,14rem)_1fr]">
                <Field id={fid("color-label")} label="Colour / finish name" hint="Heading shown above the swatches.">
                  <input
                    id={fid("color-label")}
                    type="text"
                    list={fid("color-label-list")}
                    value={colorLabel}
                    onChange={(event) => setColorLabel(event.target.value)}
                    className={inputClass}
                    aria-describedby={`${fid("color-label")}-hint`}
                  />
                  <datalist id={fid("color-label-list")}>
                    {COLOR_LABEL_SUGGESTIONS.map((value) => (
                      <option key={value} value={value} />
                    ))}
                  </datalist>
                </Field>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{colorLabel || "Colour"} swatches</p>
                  {colors.length === 0 && (
                    <p className="text-xs text-muted-foreground">No swatches — the product is sold in a single finish.</p>
                  )}
                  <ul className="space-y-2">
                    {colors.map((color, index) => {
                      const rowId = fid(`color-${index}`);
                      return (
                        <li key={index} className="space-y-2 rounded-lg border border-border p-2">
                          <div className="flex flex-wrap items-end gap-2">
                            <div className="min-w-[8rem] flex-1 space-y-1">
                              <label htmlFor={`${rowId}-name`} className="text-xs text-muted-foreground">
                                Name
                              </label>
                              <input
                                id={`${rowId}-name`}
                                type="text"
                                value={color.name}
                                onChange={(event) => renameColor(index, event.target.value)}
                                className={inputClass}
                                placeholder="Warm Ivory"
                              />
                            </div>
                            <div className="space-y-1">
                              <label htmlFor={`${rowId}-picker`} className="text-xs text-muted-foreground">
                                Swatch
                              </label>
                              <input
                                id={`${rowId}-picker`}
                                type="color"
                                value={HEX_PATTERN.test(color.hex) && color.hex.length === 7 ? color.hex : "#000000"}
                                onChange={(event) => updateColor(index, { hex: event.target.value })}
                                className="h-9 w-12 cursor-pointer rounded border border-border bg-background"
                              />
                            </div>
                            <div className="w-28 space-y-1">
                              <label htmlFor={`${rowId}-hex`} className="text-xs text-muted-foreground">
                                Hex
                              </label>
                              <input
                                id={`${rowId}-hex`}
                                type="text"
                                value={color.hex}
                                onChange={(event) => updateColor(index, { hex: event.target.value })}
                                className={`${inputClass} font-mono`}
                                aria-invalid={!HEX_PATTERN.test(color.hex)}
                              />
                            </div>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setColors((current) => move(current, index, index - 1))}
                                disabled={index === 0}
                                aria-label={`Move ${color.name || "swatch"} up`}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setColors((current) => move(current, index, index + 1))}
                                disabled={index === colors.length - 1}
                                aria-label={`Move ${color.name || "swatch"} down`}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setColors((current) => current.filter((_, i) => i !== index))}
                                aria-label={`Remove ${color.name || "swatch"}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <details>
                            <summary className="cursor-pointer text-xs text-muted-foreground">
                              Images for this {colorLabel.toLowerCase() || "colour"} ({color.images.length})
                            </summary>
                            <label htmlFor={`${rowId}-images`} className="sr-only">
                              Image URLs for {color.name || "this swatch"}, one per line
                            </label>
                            <textarea
                              id={`${rowId}-images`}
                              value={color.images.join("\n")}
                              onChange={(event) => updateColor(index, { images: linesToList(event.target.value) })}
                              className={`${inputClass} mt-2 min-h-[70px] font-mono text-xs`}
                              placeholder="One image URL or /path per line"
                            />
                          </details>
                        </li>
                      );
                    })}
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setColors((current) => [...current, { name: "", hex: "#C8A96A", images: [] }])}
                  >
                    <Plus className="h-4 w-4" /> Add {colorLabel.toLowerCase() || "colour"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Stock per variant</h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <caption className="sr-only">Stock for each {sizeLabel} and {colorLabel} combination</caption>
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th scope="col" className="p-2 text-left font-medium">
                        {sizeLabel || "Option"}
                      </th>
                      {matrix.colourNames.length > 0 ? (
                        matrix.colourNames.map((colourName, index) => (
                          <th key={`${colourName}-${index}`} scope="col" className="p-2 text-center font-medium">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                aria-hidden="true"
                                className="h-3 w-3 rounded-full border border-border"
                                style={{ backgroundColor: colors.find((color) => color.name.trim() === colourName)?.hex }}
                              />
                              {colourName}
                            </span>
                          </th>
                        ))
                      ) : (
                        <th scope="col" className="p-2 text-center font-medium">
                          Stock
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.rows.map((row) => (
                      <tr key={row.size} className="border-b border-border last:border-0">
                        <th scope="row" className="p-2 text-left font-medium">
                          {row.size}
                        </th>
                        {row.cells.map((cell) => (
                          <td key={cell.key} className="p-2">
                            <label htmlFor={fid(`stock-${cell.key}`)} className="sr-only">
                              Stock for {row.size}
                              {cell.color ? ` / ${cell.color}` : ""}
                            </label>
                            <input
                              id={fid(`stock-${cell.key}`)}
                              type="number"
                              inputMode="numeric"
                              min="0"
                              step="1"
                              value={variantStock[cell.key] ?? "0"}
                              onChange={(event) =>
                                setVariantStock((current) => ({ ...current, [cell.key]: event.target.value }))
                              }
                              className={`${inputClass} min-w-[4.5rem] text-center`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground">
                {matrix.rows.length * Math.max(matrix.colourNames.length, 1)} variant(s) · Total stock{" "}
                <span className={totalStock === 0 ? "font-semibold text-destructive" : "font-semibold text-foreground"}>
                  {totalStock}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id={fid("features")} label="Features" hint="One per line.">
                <textarea
                  id={fid("features")}
                  value={features}
                  onChange={(event) => setFeatures(event.target.value)}
                  className={`${inputClass} min-h-[120px]`}
                  placeholder={"Hand-carved\nWaterproof lining"}
                  aria-describedby={`${fid("features")}-hint`}
                />
              </Field>
              <Field id={fid("care")} label="Care instructions" hint="One per line.">
                <textarea
                  id={fid("care")}
                  value={careInstructions}
                  onChange={(event) => setCareInstructions(event.target.value)}
                  className={`${inputClass} min-h-[120px]`}
                  placeholder={"Wipe with a soft dry cloth\nAvoid direct sunlight"}
                  aria-describedby={`${fid("care")}-hint`}
                />
              </Field>
            </div>
            <Field id={fid("tags")} label="Tags" hint="Comma separated. Used by search and filters.">
              <input
                id={fid("tags")}
                type="text"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                className={inputClass}
                placeholder="vase, travertine, gift"
                aria-describedby={`${fid("tags")}-hint`}
              />
            </Field>
          </CardContent>
        </Card>

        {/* Merchandising */}
        <Card>
          <CardHeader>
            <CardTitle>Merchandising</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Checkbox
                id={fid("active")}
                label="Visible in store"
                hint="Untick to hide without deleting."
                checked={isActive}
                onChange={setIsActive}
              />
              <Checkbox id={fid("new")} label="New arrival" checked={isNew} onChange={setIsNew} />
              <Checkbox id={fid("featured")} label="Best seller" checked={isFeatured} onChange={setIsFeatured} />
            </div>

            <Field
              id={fid("order")}
              label="Display order"
              hint="Higher numbers appear first. Use steps of 100 for easy reordering; 0 = newest first."
              className="max-w-xs"
            >
              <input
                id={fid("order")}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={displayOrder}
                onChange={(event) => setDisplayOrder(event.target.value)}
                className={inputClass}
                aria-describedby={`${fid("order")}-hint`}
              />
            </Field>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Collections</legend>
              {collections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No collections yet. <Link href="/admin/collections" className="underline">Create one</Link>.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {collections.map((collection) => (
                    <Checkbox
                      key={collection.id}
                      id={fid(`collection-${collection.id}`)}
                      label={`${collection.name}${collection.isActive ? "" : " (hidden)"}`}
                      checked={collectionIds.includes(collection.id)}
                      onChange={(checked) => toggleCollection(collection.id, checked)}
                    />
                  ))}
                </div>
              )}
            </fieldset>
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
              Delete product
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => router.push("/admin/products")} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || uploading} className="bg-brand text-neutral-950 hover:bg-brand/90 sm:min-w-40">
            {saving || isNavigating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Create product"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
