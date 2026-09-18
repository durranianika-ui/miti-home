"use client";

import { use, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Check } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { normalizeProductImage } from "@/lib/image";
import { formatPrice } from "@/lib/money";
import { buildProductPath } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { ViewportPrefetchLink } from "@/components/ui/viewport-prefetch-link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComboProductVariant {
  id: string;
  productId: string;
  size: string;
  color: string | null;
  stock: number;
}

export interface ComboProductColor {
  name: string;
  hex: string;
  images?: string[];
}

export interface ComboProduct {
  id: string;
  name: string;
  slug?: string | null;
  sellingPrice: string;
  mrp: string;
  images: string[];
  sizes: string[];
  sizeLabel?: string | null;
  colors: ComboProductColor[];
  colorLabel?: string | null;
  variants: ComboProductVariant[];
  category: string;
  stock?: number | null;
  material?: string | null;
  dimensions?: string | null;
}

export interface Combo {
  id: string;
  discountAmount: string;
  productA: ComboProduct;
  productB: ComboProduct;
}

// ---------------------------------------------------------------------------
// Pricing & option helpers (shared with the combo detail page)
// ---------------------------------------------------------------------------

export const STANDARD_OPTION = "Standard";
export const LOW_STOCK_THRESHOLD = 3;

export function getComboPricing(combo: Combo) {
  const total = Number(combo.productA.sellingPrice) + Number(combo.productB.sellingPrice);
  const saving = Math.min(Math.max(0, Number(combo.discountAmount) || 0), total);
  return { total, saving, setPrice: total - saving };
}

export function comboTitle(combo: Combo) {
  return `${combo.productA.name} & ${combo.productB.name}`;
}

export function productHref(product: ComboProduct) {
  return buildProductPath(product.slug || product.id);
}

function variantKey(size: string, color: string | null) {
  return `${size}|${color}`;
}

export type ComboOptions = ReturnType<typeof useComboOptions>;

/**
 * Selection state for one product in a set. Auto-selects a lone "Standard"
 * option (and hides its selector) and a lone colour; everything else is
 * stock-aware against the product's variant rows.
 */
export function useComboOptions(product: ComboProduct) {
  const sizes = product.sizes.length > 0 ? product.sizes : [STANDARD_OPTION];
  const colors = product.colors;
  const hasColors = colors.length > 0;
  const hasVariants = product.variants.length > 0;
  const productStock = Math.max(0, Number(product.stock ?? 0));
  const sizeLabel = product.sizeLabel?.trim() || "Size";
  const colorLabel = product.colorLabel?.trim() || "Colour";
  const hideSizeSelector = sizes.length === 1 && sizes[0] === STANDARD_OPTION;
  const hideColorSelector = colors.length === 1;

  const variants = product.variants;
  // O(1) stock lookups while rendering option buttons.
  const variantMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const variant of variants) {
      map.set(variantKey(variant.size, variant.color), variant.stock);
    }
    return map;
  }, [variants]);

  const [size, setSizeState] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [color, setColor] = useState<string | null>(colors.length === 1 ? colors[0].name : null);

  const stockFor = (optionSize: string, optionColor: string | null) =>
    hasVariants ? variantMap.get(variantKey(optionSize, optionColor)) ?? 0 : productStock;

  const isSizeAvailable = (optionSize: string) => {
    if (!hasVariants) return productStock > 0;
    return variants.some((variant) => variant.size === optionSize && variant.stock > 0);
  };

  const isColorAvailable = (colorName: string) => {
    if (!hasVariants) return productStock > 0;
    if (size) return stockFor(size, colorName) > 0;
    return variants.some((variant) => variant.color === colorName && variant.stock > 0);
  };

  const setSize = (next: string) => {
    setSizeState(next);
    // Drop a colour that is not stocked in the newly chosen option.
    if (color && colors.length > 1 && hasVariants && stockFor(next, color) <= 0) {
      setColor(null);
    }
  };

  const selectionComplete = Boolean(size && (!hasColors || color));
  const selectedStock = selectionComplete && size ? stockFor(size, hasColors ? color : null) : null;
  const ready = selectedStock !== null && selectedStock > 0;
  const lowStock = ready && selectedStock !== null && selectedStock <= LOW_STOCK_THRESHOLD ? selectedStock : null;

  const selectedColor = colors.find((option) => option.name === color) ?? null;
  const image = normalizeProductImage(selectedColor?.images?.[0] ?? product.images?.[0]);

  return {
    product,
    sizes,
    colors,
    hasColors,
    sizeLabel,
    colorLabel,
    hideSizeSelector,
    hideColorSelector,
    size,
    color,
    setSize,
    setColor,
    isSizeAvailable,
    isColorAvailable,
    selectionComplete,
    selectedStock,
    ready,
    lowStock,
    selectedColor,
    image,
  };
}

/** Builds a cart line for `addCombo`. Option labels ride along so the cart can say "Finish: Mirror Silver". */
export function buildComboCartLine(options: ComboOptions) {
  const { product } = options;
  const line = {
    id: product.id,
    name: product.name,
    price: Number(product.sellingPrice),
    displayPrice: formatPrice(product.sellingPrice),
    image: options.image,
    size: options.size ?? STANDARD_OPTION,
    color: options.color || undefined,
    sizeLabel: options.sizeLabel,
    colorLabel: options.colorLabel,
  };
  return line;
}

// ---------------------------------------------------------------------------
// Option picker
// ---------------------------------------------------------------------------

export function ComboOptionPicker({
  options,
  idPrefix,
  size = "sm",
}: {
  options: ComboOptions;
  idPrefix: string;
  size?: "sm" | "md";
}) {
  const {
    product,
    sizes,
    colors,
    hasColors,
    sizeLabel,
    colorLabel,
    hideSizeSelector,
    hideColorSelector,
  } = options;
  const legendClass = "font-heading text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground";
  const showSoldOut = options.selectionComplete && !options.ready;

  return (
    <div className="space-y-4">
      {!hideSizeSelector && (
        <fieldset className="space-y-2">
          <legend className={legendClass}>
            {sizeLabel}
            {options.size && <span className="ml-2 normal-case tracking-normal text-foreground">{options.size}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((option) => {
              const available = options.isSizeAvailable(option);
              const selected = options.size === option;
              return (
                <button
                  key={`${idPrefix}-size-${option}`}
                  type="button"
                  disabled={!available}
                  aria-pressed={selected}
                  aria-label={available ? `${sizeLabel} ${option} for ${product.name}` : `${sizeLabel} ${option} for ${product.name}, sold out`}
                  onClick={() => options.setSize(option)}
                  className={cn(
                    "border px-3 font-heading text-[10px] uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    size === "md" ? "h-10 min-w-12" : "h-9 min-w-10",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:border-foreground",
                    !available && "cursor-not-allowed border-border/50 text-muted-foreground line-through opacity-50 hover:border-border/50",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {hasColors && !hideColorSelector && (
        <fieldset className="space-y-2">
          <legend className={legendClass}>
            {colorLabel}
            {options.color && <span className="ml-2 normal-case tracking-normal text-foreground">{options.color}</span>}
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((colorOption) => {
              const available = options.isColorAvailable(colorOption.name);
              const selected = options.color === colorOption.name;
              return (
                <button
                  key={`${idPrefix}-color-${colorOption.name}`}
                  type="button"
                  disabled={!available}
                  aria-pressed={selected}
                  title={colorOption.name}
                  aria-label={
                    available
                      ? `${colorLabel} ${colorOption.name} for ${product.name}`
                      : `${colorLabel} ${colorOption.name} for ${product.name}, unavailable`
                  }
                  onClick={() => options.setColor(colorOption.name)}
                  className={cn(
                    "rounded-full border border-border transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    size === "md" ? "h-8 w-8" : "h-7 w-7",
                    selected && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                    !available && "cursor-not-allowed opacity-30",
                  )}
                  style={{ backgroundColor: colorOption.hex }}
                />
              );
            })}
          </div>
        </fieldset>
      )}

      {hasColors && hideColorSelector && options.color && (
        <p className="text-xs text-muted-foreground">
          {colorLabel}: <span className="text-foreground">{options.color}</span>
        </p>
      )}

      <p className="min-h-4 text-xs text-muted-foreground" aria-live="polite">
        {options.lowStock !== null
          ? `Only ${options.lowStock} left`
          : showSoldOut
            ? "Currently unavailable in this selection"
            : null}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function ComboProductTile({ product, href, image }: { product: ComboProduct; href: string; image: string }) {
  return (
    <ViewportPrefetchLink href={href} className="group block space-y-3">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 22vw"
          className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.03]"
        />
      </div>
      <div className="space-y-1">
        <p className="line-clamp-2 text-sm leading-snug text-foreground">{product.name}</p>
        <p className="text-xs tabular-nums text-muted-foreground">{formatPrice(product.sellingPrice)}</p>
      </div>
    </ViewportPrefetchLink>
  );
}

export function ComboCard({ combo, interactive }: { combo: Combo; interactive: boolean }) {
  const { addCombo } = useCart();
  const optionsA = useComboOptions(combo.productA);
  const optionsB = useComboOptions(combo.productB);
  const [added, setAdded] = useState(false);
  const { total, saving, setPrice } = getComboPricing(combo);
  const canAdd = optionsA.ready && optionsB.ready;

  const detailHref = `/combo/${combo.id}`;

  const handleAdd = () => {
    if (!canAdd) return;
    addCombo({
      comboId: combo.id,
      comboName: comboTitle(combo),
      maxDiscountAmount: saving,
      items: [buildComboCartLine(optionsA), buildComboCartLine(optionsB)],
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <article className="flex h-full flex-col border border-border bg-background" aria-label={comboTitle(combo)}>
      <div className="grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-5">
        <ComboProductTile
          product={combo.productA}
          href={interactive ? productHref(combo.productA) : detailHref}
          image={optionsA.image}
        />
        <ComboProductTile
          product={combo.productB}
          href={interactive ? productHref(combo.productB) : detailHref}
          image={optionsB.image}
        />
      </div>

      {interactive && (
        <div className="grid gap-6 border-t border-border p-4 sm:grid-cols-2 sm:p-5">
          <div className="space-y-3">
            <p className="line-clamp-1 text-xs text-foreground">{combo.productA.name}</p>
            <ComboOptionPicker options={optionsA} idPrefix={`${combo.id}-a`} />
          </div>
          <div className="space-y-3">
            <p className="line-clamp-1 text-xs text-foreground">{combo.productB.name}</p>
            <ComboOptionPicker options={optionsB} idPrefix={`${combo.id}-b`} />
          </div>
        </div>
      )}

      <div className="mt-auto space-y-4 border-t border-border p-4 sm:p-5">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="font-heading text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground">Together</p>
            <p className="flex items-baseline gap-2 tabular-nums">
              <span className="text-base text-foreground">{formatPrice(setPrice)}</span>
              {saving > 0 && <span className="text-xs text-muted-foreground line-through">{formatPrice(total)}</span>}
            </p>
          </div>
          {saving > 0 && (
            <p className="text-right text-xs text-brand-strong">Save {formatPrice(saving)} as a set</p>
          )}
        </div>

        {interactive ? (
          <button
            type="button"
            disabled={!canAdd}
            onClick={handleAdd}
            className="flex h-11 w-full items-center justify-center gap-2 bg-foreground font-heading text-[11px] uppercase tracking-[0.22em] text-background transition-colors hover:bg-brand hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-foreground disabled:hover:text-background"
          >
            {added ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Added to bag
              </>
            ) : canAdd ? (
              "Add the set to bag"
            ) : (
              "Select options"
            )}
          </button>
        ) : (
          <ViewportPrefetchLink
            href={detailHref}
            className="flex h-11 w-full items-center justify-center border border-foreground font-heading text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            View the set
          </ViewportPrefetchLink>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

function isPromise<T>(value: unknown): value is Promise<T> {
  return Boolean(value) && typeof (value as { then?: unknown }).then === "function";
}

export function ComboSection({
  limit = 6,
  interactive = true,
  mobileLimit = 3,
  initialCombos,
}: {
  limit?: number;
  interactive?: boolean;
  mobileLimit?: number;
  initialCombos?: Combo[] | Promise<Combo[]>;
}) {
  const resolvedInitialCombos = isPromise<Combo[]>(initialCombos) ? use(initialCombos) : initialCombos;

  const { data: combos = [], isLoading: loading } = useQuery({
    queryKey: ["combos", limit],
    queryFn: async () => {
      const response = await fetch(`/api/combos?limit=${limit}`);
      if (!response.ok) throw new Error("Failed to load sets");
      const data = await response.json();
      return (data.combos || []) as Combo[];
    },
    initialData: resolvedInitialCombos,
    enabled: resolvedInitialCombos === undefined,
    staleTime: 1000 * 60 * 5,
  });

  if (!loading && combos.length === 0) {
    return null;
  }

  return (
    <section className="bg-background px-6 py-16 md:px-12 md:py-24" aria-labelledby="complete-the-set-heading">
      <div className="mb-10 flex flex-col items-center text-center md:mb-14">
        <p className="mb-3 font-heading text-[10px] font-medium uppercase tracking-[0.3em] text-brand-strong">Better together</p>
        <h2 id="complete-the-set-heading" className="font-display text-3xl font-light tracking-tight sm:text-4xl md:text-5xl">
          Complete the set
        </h2>
        <p className="mt-4 max-w-md text-sm text-muted-foreground">
          Pieces chosen to sit beautifully side by side, with a quiet saving when you bring them home together.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-hidden="true">
          {Array.from({ length: Math.min(limit, 2) }, (_, index) => (
            <div key={index} className="border border-border p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="aspect-square animate-pulse bg-muted" />
                <div className="aspect-square animate-pulse bg-muted" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 w-2/3 animate-pulse bg-muted" />
                <div className="h-3 w-1/2 animate-pulse bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {combos.map((combo, index) => (
            <div key={combo.id} className={index >= mobileLimit ? "hidden md:block" : undefined}>
              <ComboCard combo={combo} interactive={interactive} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
