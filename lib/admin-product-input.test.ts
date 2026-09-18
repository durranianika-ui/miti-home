import assert from "node:assert/strict"
import test from "node:test"
import {
  buildDefaultVariants,
  normalizeProductInput,
  normalizeProductPatch,
  slugify,
  type RawProductInput,
} from "./admin-product-input.ts"

const baseInput: RawProductInput = {
  name: " Knotted Stripe Vase ",
  slug: " knotted-stripe-vase ",
  description: "Monochrome ceramic vase",
  mrp: "189",
  sellingPrice: "159",
  maxBargainDiscount: "10",
  category: "home-decor",
  stock: 6,
  material: " Ceramic ",
  dimensions: "8.5 × 8.5 × 29 cm",
  images: ["/products/knotted-stripe-vase/1.webp"],
  sizes: ["Standard"],
  careInstructions: [],
  features: [],
  colors: [],
  tags: ["vase"],
  variants: [{ size: "Standard", color: null, stock: 6 }],
  isNew: true,
  isFeatured: false,
  isActive: true,
  displayOrder: 500,
}

test("normalizes server-action undefined sentinels before product insert", () => {
  const product = normalizeProductInput({
    ...baseInput,
    sku: "$undefined",
  })

  assert.equal(product.name, "Knotted Stripe Vase")
  assert.equal(product.slug, "knotted-stripe-vase")
  assert.equal(product.sku, null)
  assert.equal(product.material, "Ceramic")
  assert.equal(product.mrp, "189.00")
  assert.equal(product.sellingPrice, "159.00")
  assert.deepEqual(product.variants, [{ size: "Standard", color: null, stock: 6 }])
})

test("single-option products default to the Standard option and option labels", () => {
  const product = normalizeProductInput({ ...baseInput, sizes: undefined, variants: undefined })

  assert.deepEqual(product.sizes, ["Standard"])
  assert.equal(product.sizeLabel, "Size")
  assert.equal(product.colorLabel, "Colour")
})

test("rejects invalid product numerics, slugs and prices at the action boundary", () => {
  assert.throws(() => normalizeProductInput({ ...baseInput, stock: "1.5" }), /Stock must be a whole number/)
  assert.throws(() => normalizeProductInput({ ...baseInput, mrp: "free" }), /Compare-at price must be a valid amount/)
  assert.throws(() => normalizeProductInput({ ...baseInput, slug: "Bad Slug!" }), /Product slug may only contain/)
  assert.throws(() => normalizeProductInput({ ...baseInput, sellingPrice: "250" }), /cannot be higher than the compare-at price/)
  assert.throws(() => normalizeProductInput({ ...baseInput, sellingPrice: "0", mrp: "0" }), /greater than zero/)
})

test("validates finishes and rejects variants that do not match declared options", () => {
  assert.throws(
    () => normalizeProductInput({ ...baseInput, colors: [{ name: "Silver", hex: "silver" }] }),
    /hex value/,
  )
  assert.throws(
    () =>
      normalizeProductInput({
        ...baseInput,
        sizes: ["20 cm", "30 cm"],
        variants: [{ size: "40 cm", color: null, stock: 1 }],
      }),
    /not one of the product's options/,
  )
  assert.throws(
    () =>
      normalizeProductInput({
        ...baseInput,
        colors: [{ name: "Black", hex: "#111111" }],
        variants: [{ size: "Standard", color: null, stock: 1 }],
      }),
    /needs a colour/,
  )
})

test("rejects duplicate inventory dimensions before variant rows are created", () => {
  assert.throws(
    () =>
      normalizeProductInput({
        ...baseInput,
        variants: [
          { size: "Standard", color: null, stock: 1 },
          { size: "Standard", color: null, stock: 2 },
        ],
      }),
    /Duplicate variant/,
  )
})

test("normalizes partial product updates without forcing missing fields", () => {
  const patch = normalizeProductPatch({ name: "  Renamed Vase ", isFeatured: true })

  assert.deepEqual(patch, { name: "Renamed Vase", isFeatured: true })
})

test("default variant matrix splits stock across option × finish and preserves the total", () => {
  const variants = buildDefaultVariants(["20 cm", "30 cm"], [{ name: "Black" }, { name: "White" }], 7)

  assert.equal(variants.length, 4)
  assert.equal(variants.reduce((sum, variant) => sum + variant.stock, 0), 7)
  assert.deepEqual(variants[0], { size: "20 cm", color: "Black", stock: 2 })
})

test("slugify produces URL-safe slugs from product names", () => {
  assert.equal(slugify("Acacia Salt & Pepper Mill Set"), "acacia-salt-and-pepper-mill-set")
  assert.equal(slugify("  Café Décor — Édition  "), "cafe-decor-edition")
})
