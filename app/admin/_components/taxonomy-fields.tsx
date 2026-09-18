"use client";

import { useId } from "react";
import Image from "next/image";
import { slugify } from "@/lib/admin-product-input";
import { normalizeProductImage } from "@/lib/image";
import { inputClass } from "../_lib/format";

export type TaxonomyValues = {
  name: string;
  slug: string;
  description: string;
  image: string;
  seoTitle: string;
  seoDescription: string;
  displayOrder: string;
  isActive: boolean;
};

export function emptyTaxonomyValues(): TaxonomyValues {
  return {
    name: "",
    slug: "",
    description: "",
    image: "",
    seoTitle: "",
    seoDescription: "",
    displayOrder: "0",
    isActive: true,
  };
}

export function taxonomyValuesFrom(row: {
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  displayOrder: number;
  isActive: boolean;
}): TaxonomyValues {
  return {
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    image: row.image ?? "",
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    displayOrder: String(row.displayOrder),
    isActive: row.isActive,
  };
}

export function taxonomyPayload(values: TaxonomyValues) {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    description: values.description.trim() || null,
    image: values.image.trim() || null,
    seoTitle: values.seoTitle.trim() || null,
    seoDescription: values.seoDescription.trim() || null,
    displayOrder: Math.max(0, Number.parseInt(values.displayOrder, 10) || 0),
    isActive: values.isActive,
  };
}

/**
 * Name / slug / description / image / SEO / order / active fields shared by the
 * category and collection editors. `autoSlug` keeps the slug in step with the
 * name until the admin edits the slug by hand.
 */
export function TaxonomyFields({
  values,
  onChange,
  autoSlug,
  onSlugEdited,
  urlPrefix,
}: {
  values: TaxonomyValues;
  onChange: (values: TaxonomyValues) => void;
  autoSlug: boolean;
  onSlugEdited: () => void;
  urlPrefix: string;
}) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const set = <K extends keyof TaxonomyValues>(key: K, value: TaxonomyValues[K]) => onChange({ ...values, [key]: value });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={id("name")} className="text-sm font-medium">
            Name <span className="text-destructive">*</span>
          </label>
          <input
            id={id("name")}
            type="text"
            required
            value={values.name}
            onChange={(event) =>
              onChange({
                ...values,
                name: event.target.value,
                slug: autoSlug ? slugify(event.target.value) : values.slug,
              })
            }
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={id("slug")} className="text-sm font-medium">
            Slug <span className="text-destructive">*</span>
          </label>
          <input
            id={id("slug")}
            type="text"
            required
            value={values.slug}
            onChange={(event) => {
              onSlugEdited();
              set("slug", event.target.value.toLowerCase());
            }}
            className={inputClass}
            aria-describedby={id("slug-hint")}
          />
          <p id={id("slug-hint")} className="text-xs text-muted-foreground">
            URL: {urlPrefix}
            {values.slug || "…"}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={id("description")} className="text-sm font-medium">
          Description
        </label>
        <textarea
          id={id("description")}
          value={values.description}
          onChange={(event) => set("description", event.target.value)}
          className={`${inputClass} min-h-[90px]`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <label htmlFor={id("image")} className="text-sm font-medium">
            Image URL
          </label>
          <input
            id={id("image")}
            type="text"
            value={values.image}
            onChange={(event) => set("image", event.target.value)}
            className={inputClass}
            placeholder="https://res.cloudinary.com/… or /categories/lighting.webp"
          />
        </div>
        {values.image.trim() && /^(https?:\/\/|\/)/.test(values.image.trim()) && (
          <Image
            src={normalizeProductImage(values.image)}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 rounded border border-border object-cover"
            unoptimized
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={id("seo-title")} className="text-sm font-medium">
            SEO title
          </label>
          <input
            id={id("seo-title")}
            type="text"
            value={values.seoTitle}
            onChange={(event) => set("seoTitle", event.target.value)}
            className={inputClass}
            maxLength={70}
            aria-describedby={id("seo-title-hint")}
          />
          <p id={id("seo-title-hint")} className="text-xs text-muted-foreground">
            {values.seoTitle.length}/70 · Defaults to the name.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={id("seo-description")} className="text-sm font-medium">
            SEO description
          </label>
          <textarea
            id={id("seo-description")}
            value={values.seoDescription}
            onChange={(event) => set("seoDescription", event.target.value)}
            className={`${inputClass} min-h-[70px]`}
            maxLength={170}
            aria-describedby={id("seo-description-hint")}
          />
          <p id={id("seo-description-hint")} className="text-xs text-muted-foreground">
            {values.seoDescription.length}/170
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div className="w-36 space-y-1.5">
          <label htmlFor={id("order")} className="text-sm font-medium">
            Display order
          </label>
          <input
            id={id("order")}
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={values.displayOrder}
            onChange={(event) => set("displayOrder", event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <input
            id={id("active")}
            type="checkbox"
            checked={values.isActive}
            onChange={(event) => set("isActive", event.target.checked)}
            className="h-4 w-4 accent-[var(--brand)]"
          />
          <label htmlFor={id("active")} className="text-sm font-medium">
            Visible in store
          </label>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Lower display order numbers are listed first.</p>
    </div>
  );
}
