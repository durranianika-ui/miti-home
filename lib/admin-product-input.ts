/**
 * Normalises admin product payloads before they touch the database.
 * Keep this file free of `@/` imports: it is loaded by the node test runner.
 */

/** Option value used when a product has no primary option (a single size). */
export const DEFAULT_OPTION = "Standard"

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

export type ProductVariantInput = {
  size: string
  color: string | null
  stock: number
}

export type ProductColorInput = {
  name: string
  hex: string
  images?: string[]
}

export type ProductInput = {
  name: string
  slug: string
  sku?: string | null
  description?: string | null
  mrp: string
  sellingPrice: string
  maxBargainDiscount?: string
  category: string
  tags?: string[]
  stock: number
  images?: string[]
  material?: string | null
  dimensions?: string | null
  careInstructions?: string[]
  features?: string[]
  sizeLabel?: string
  colorLabel?: string
  sizes?: string[]
  colors?: ProductColorInput[]
  variants?: ProductVariantInput[]
  collectionIds?: string[]
  isNew?: boolean
  isFeatured?: boolean
  isActive?: boolean
  displayOrder?: number
}

export type RawProductInput = Omit<Partial<ProductInput>, "colors" | "variants" | "collectionIds"> & {
  category?: unknown
  stock?: unknown
  displayOrder?: unknown
  colors?: unknown
  variants?: unknown
  collectionIds?: unknown
}

function isUnset(value: unknown) {
  return value === undefined || value === null || value === "$undefined"
}

function textOrNull(value: unknown) {
  if (isUnset(value)) return null
  if (typeof value !== "string") return String(value)
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function requiredText(value: unknown, label: string) {
  const text = textOrNull(value)
  if (!text) throw new Error(`${label} is required`)
  return text
}

function normalizeStringArray(value: unknown, label: string) {
  if (isUnset(value)) return []
  if (!Array.isArray(value)) throw new Error(`${label} must be a list`)
  return value.map((item) => requiredText(item, label)).filter(Boolean)
}

function ensureUnique<T>(items: T[], label: string, getKey: (item: T) => string) {
  const seen = new Set<string>()

  for (const item of items) {
    const key = getKey(item).trim().toLowerCase()
    if (seen.has(key)) throw new Error(`Duplicate ${label}: ${getKey(item)}`)
    seen.add(key)
  }

  return items
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback
}

function normalizeNonNegativeInt(value: unknown, label: string, fallback = 0) {
  if (isUnset(value) || value === "") return fallback
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isInteger(number)) throw new Error(`${label} must be a whole number`)
  if (number < 0) throw new Error(`${label} cannot be negative`)
  return number
}

function normalizeAmount(value: unknown, label: string, fallback?: string) {
  if (isUnset(value) || value === "") {
    if (fallback !== undefined) return fallback
    throw new Error(`${label} is required`)
  }

  const text = String(value).trim()
  const number = Number(text)
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${label} must be a valid amount`)
  }

  return number.toFixed(2)
}

export function normalizeSlug(value: unknown, label = "Slug") {
  const slug = requiredText(value, label).toLowerCase()
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`${label} may only contain lowercase letters, numbers and single hyphens`)
  }
  return slug
}

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

function normalizeColors(value: unknown) {
  if (isUnset(value)) return []
  if (!Array.isArray(value)) throw new Error("Colours must be a list")

  const colors = value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Colour is invalid")
    const color = item as Record<string, unknown>
    const hex = requiredText(color.hex, "Colour swatch")
    if (!HEX_PATTERN.test(hex)) throw new Error(`Colour swatch must be a hex value like #C8A96A (got ${hex})`)
    return {
      name: requiredText(color.name, "Colour name"),
      hex,
      images: normalizeStringArray(color.images, "Colour images"),
    }
  })

  return ensureUnique(colors, "colour", (color) => color.name)
}

function normalizeVariants(value: unknown) {
  if (isUnset(value)) return []
  if (!Array.isArray(value)) throw new Error("Variants must be a list")

  const variants = value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Variant is invalid")
    const variant = item as Record<string, unknown>
    return {
      size: requiredText(variant.size, "Variant option"),
      color: textOrNull(variant.color),
      stock: normalizeNonNegativeInt(variant.stock, "Variant stock"),
    }
  })

  return ensureUnique(
    variants,
    "variant",
    (variant) => `${variant.size}|${variant.color ?? ""}`
  )
}

function normalizeCommonProductInput(input: RawProductInput, partial: boolean) {
  const normalized: Partial<ProductInput> = {}

  if (!partial || "name" in input) normalized.name = requiredText(input.name, "Product name")
  if (!partial || "slug" in input) normalized.slug = normalizeSlug(input.slug, "Product slug")
  if ("sku" in input) normalized.sku = textOrNull(input.sku)
  if ("description" in input) normalized.description = textOrNull(input.description)
  if (!partial || "mrp" in input) normalized.mrp = normalizeAmount(input.mrp, "Compare-at price")
  if (!partial || "sellingPrice" in input) {
    normalized.sellingPrice = normalizeAmount(input.sellingPrice, "Price")
  }
  if ("maxBargainDiscount" in input) {
    normalized.maxBargainDiscount = normalizeAmount(input.maxBargainDiscount, "Max concierge discount", "0.00")
  } else if (!partial) {
    normalized.maxBargainDiscount = "0.00"
  }
  if (!partial || "category" in input) normalized.category = normalizeSlug(input.category, "Category")
  if ("tags" in input) normalized.tags = normalizeStringArray(input.tags, "Tags")
  if (!partial || "stock" in input) normalized.stock = normalizeNonNegativeInt(input.stock, "Stock")
  if ("images" in input) normalized.images = normalizeStringArray(input.images, "Images")
  if ("material" in input) normalized.material = textOrNull(input.material)
  if ("dimensions" in input) normalized.dimensions = textOrNull(input.dimensions)
  if ("careInstructions" in input) {
    normalized.careInstructions = normalizeStringArray(input.careInstructions, "Care instructions")
  }
  if ("features" in input) normalized.features = normalizeStringArray(input.features, "Features")
  if ("sizeLabel" in input) normalized.sizeLabel = textOrNull(input.sizeLabel) ?? "Size"
  if ("colorLabel" in input) normalized.colorLabel = textOrNull(input.colorLabel) ?? "Colour"
  if ("sizes" in input) {
    normalized.sizes = ensureUnique(normalizeStringArray(input.sizes, "Options"), "option", (size) => size)
  }
  if ("colors" in input) normalized.colors = normalizeColors(input.colors)
  if ("variants" in input) normalized.variants = normalizeVariants(input.variants)
  if ("collectionIds" in input) {
    normalized.collectionIds = ensureUnique(
      normalizeStringArray(input.collectionIds, "Collections"),
      "collection",
      (id) => id,
    )
  }
  if ("isNew" in input) normalized.isNew = normalizeBoolean(input.isNew, false)
  if ("isFeatured" in input) normalized.isFeatured = normalizeBoolean(input.isFeatured, false)
  if ("isActive" in input) normalized.isActive = normalizeBoolean(input.isActive, true)
  if ("displayOrder" in input) {
    normalized.displayOrder = normalizeNonNegativeInt(input.displayOrder, "Display order")
  }

  if (normalized.mrp && normalized.sellingPrice && Number(normalized.sellingPrice) > Number(normalized.mrp)) {
    throw new Error("Price cannot be higher than the compare-at price")
  }
  if (normalized.sellingPrice !== undefined && Number(normalized.sellingPrice) <= 0) {
    throw new Error("Price must be greater than zero")
  }

  return normalized
}

/** Every variant must reference a declared option and colour. */
function assertVariantsMatchOptions(input: Partial<ProductInput>) {
  if (!input.variants || input.variants.length === 0) return
  const sizes = new Set((input.sizes ?? []).map((size) => size.toLowerCase()))
  const colors = new Set((input.colors ?? []).map((color) => color.name.toLowerCase()))

  for (const variant of input.variants) {
    if (sizes.size > 0 && !sizes.has(variant.size.toLowerCase())) {
      throw new Error(`Variant option "${variant.size}" is not one of the product's options`)
    }
    if (variant.color && colors.size > 0 && !colors.has(variant.color.toLowerCase())) {
      throw new Error(`Variant colour "${variant.color}" is not one of the product's colours`)
    }
    if (colors.size > 0 && !variant.color) {
      throw new Error(`Variant "${variant.size}" needs a colour because the product has colours`)
    }
  }
}

export function normalizeProductInput(input: RawProductInput): ProductInput {
  const normalized = normalizeCommonProductInput(input, false) as ProductInput
  const withDefaults: ProductInput = {
    ...normalized,
    sku: normalized.sku ?? null,
    tags: normalized.tags ?? [],
    images: normalized.images ?? [],
    material: normalized.material ?? null,
    dimensions: normalized.dimensions ?? null,
    careInstructions: normalized.careInstructions ?? [],
    features: normalized.features ?? [],
    sizeLabel: normalized.sizeLabel ?? "Size",
    colorLabel: normalized.colorLabel ?? "Colour",
    sizes: normalized.sizes?.length ? normalized.sizes : [DEFAULT_OPTION],
    colors: normalized.colors ?? [],
    variants: normalized.variants ?? [],
    collectionIds: normalized.collectionIds ?? [],
    isNew: normalized.isNew ?? false,
    isFeatured: normalized.isFeatured ?? false,
    isActive: normalized.isActive ?? true,
    displayOrder: normalized.displayOrder ?? 0,
  }

  assertVariantsMatchOptions(withDefaults)
  return withDefaults
}

export function normalizeProductPatch(input: RawProductInput): Partial<ProductInput> {
  const normalized = normalizeCommonProductInput(input, true)
  if (normalized.sizes && normalized.sizes.length === 0) {
    normalized.sizes = [DEFAULT_OPTION]
  }
  if (normalized.variants && normalized.sizes) {
    assertVariantsMatchOptions(normalized)
  }
  return normalized
}

/**
 * Builds the variant matrix (option × colour) used when an admin gives a total
 * stock but no per-variant breakdown. Stock is split evenly; any remainder goes
 * to the first variants so the total is preserved.
 */
export function buildDefaultVariants(
  sizes: string[],
  colors: { name: string }[],
  totalStock: number,
): ProductVariantInput[] {
  const options = sizes.length > 0 ? sizes : [DEFAULT_OPTION]
  const combos: { size: string; color: string | null }[] = []
  for (const size of options) {
    if (colors.length > 0) {
      for (const color of colors) combos.push({ size, color: color.name })
    } else {
      combos.push({ size, color: null })
    }
  }
  const base = Math.floor(totalStock / combos.length)
  let remainder = totalStock - base * combos.length
  return combos.map((combo) => {
    const extra = remainder > 0 ? 1 : 0
    remainder -= extra
    return { ...combo, stock: base + extra }
  })
}
