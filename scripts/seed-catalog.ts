/**
 * Imports the Miti Home catalogue (data/catalog/miti-home-catalog.json) into
 * the database. Idempotent: categories, collections and products are upserted
 * by slug, so it is safe to re-run after editing the JSON.
 *
 *   npm run db:seed                 # upsert; keeps existing stock levels
 *   npm run db:seed -- --reset-stock  # also rebuild variant stock from placeholders
 *
 * Run `npm run catalog:images` first so /public/products/<slug>/ exists.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { and, eq, notInArray } from "drizzle-orm";
import { db } from "../lib/db/index.ts";
import { categories, collectionProducts, collections, combos, products, productVariants } from "../lib/db/schema.ts";
import { buildDefaultVariants, DEFAULT_OPTION } from "../lib/admin-product-input.ts";
import { buildProductSearchText } from "../lib/product-search.ts";

type CatalogColor = { name: string; hex: string; imageIndexes?: number[] };
type CatalogProduct = {
  slug: string;
  name: string;
  category: string;
  price: number;
  compareAt?: number;
  description?: string;
  material?: string;
  dimensions?: string;
  features?: string[];
  care?: string[];
  tags?: string[];
  sizeLabel?: string;
  sizes?: string[];
  colorLabel?: string;
  colors?: CatalogColor[];
  isNew?: boolean;
  isFeatured?: boolean;
  draft?: boolean;
  stock?: number;
  images: { source: string }[];
};
type Catalog = {
  categories: { slug: string; name: string; description?: string; seoTitle?: string; seoDescription?: string; displayOrder?: number }[];
  collections: { slug: string; name: string; eyebrow?: string; description?: string; isFeatured?: boolean; displayOrder?: number; products: string[] }[];
  combos?: { productA: string; productB: string; discount: number; displayOrder?: number }[];
  products: CatalogProduct[];
};

const ROOT = process.cwd();
const PLACEHOLDER_STOCK = 12;
const resetStock = process.argv.includes("--reset-stock");

function productImages(slug: string, count: number) {
  const images: string[] = [];
  for (let index = 1; index <= count; index += 1) {
    const relative = `/products/${slug}/${index}.webp`;
    if (fs.existsSync(path.join(ROOT, "public", relative))) images.push(relative);
  }
  return images;
}

async function main() {
  const catalog = JSON.parse(
    fs.readFileSync(path.join(ROOT, "data", "catalog", "miti-home-catalog.json"), "utf-8"),
  ) as Catalog;

  const categoryNames = new Map(catalog.categories.map((category) => [category.slug, category.name]));
  const collectionNamesByProduct = new Map<string, string[]>();
  for (const collection of catalog.collections) {
    for (const slug of collection.products) {
      collectionNamesByProduct.set(slug, [...(collectionNamesByProduct.get(slug) ?? []), collection.name]);
    }
  }

  // Categories
  for (const category of catalog.categories) {
    await db
      .insert(categories)
      .values({
        slug: category.slug,
        name: category.name,
        description: category.description ?? null,
        seoTitle: category.seoTitle ?? null,
        seoDescription: category.seoDescription ?? null,
        displayOrder: category.displayOrder ?? 0,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name: category.name,
          description: category.description ?? null,
          seoTitle: category.seoTitle ?? null,
          seoDescription: category.seoDescription ?? null,
          displayOrder: category.displayOrder ?? 0,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`✓ ${catalog.categories.length} categories`);

  // Products
  const productIds = new Map<string, string>();
  const total = catalog.products.length;
  let created = 0;

  for (const [position, item] of catalog.products.entries()) {
    if (!categoryNames.has(item.category)) throw new Error(`${item.slug}: unknown category ${item.category}`);

    const images = productImages(item.slug, item.images.length);
    if (images.length === 0) console.warn(`! ${item.slug}: no images in public/products — run npm run catalog:images`);

    const sizes = item.sizes?.length ? item.sizes : [DEFAULT_OPTION];
    const colors = (item.colors ?? []).map((color) => ({
      name: color.name,
      hex: color.hex,
      images: (color.imageIndexes ?? []).map((index) => images[index]).filter(Boolean),
    }));
    const price = item.price.toFixed(2);
    const compareAt = Math.max(item.compareAt ?? item.price, item.price).toFixed(2);

    const values = {
      name: item.name,
      slug: item.slug,
      description: item.description ?? null,
      mrp: compareAt,
      sellingPrice: price,
      category: item.category,
      tags: item.tags ?? [],
      images,
      material: item.material ?? null,
      dimensions: item.dimensions ?? null,
      careInstructions: item.care ?? [],
      features: item.features ?? [],
      sizeLabel: item.sizeLabel ?? "Size",
      colorLabel: item.colorLabel ?? "Colour",
      sizes,
      colors,
      isNew: item.isNew ?? false,
      isFeatured: item.isFeatured ?? false,
      isActive: !item.draft,
      displayOrder: (total - position) * 100,
      searchText: buildProductSearchText({
        name: item.name,
        description: item.description,
        category: item.category,
        categoryName: categoryNames.get(item.category),
        collectionNames: collectionNamesByProduct.get(item.slug) ?? [],
        tags: item.tags,
        material: item.material,
        dimensions: item.dimensions,
        features: item.features,
        careInstructions: item.care,
        sizes,
        colors,
      }),
      updatedAt: new Date(),
    };

    const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.slug, item.slug));
    let productId: string;
    if (existing) {
      await db.update(products).set(values).where(eq(products.id, existing.id));
      productId = existing.id;
    } else {
      const [row] = await db.insert(products).values({ ...values, stock: 0 }).returning({ id: products.id });
      productId = row.id;
      created += 1;
    }
    productIds.set(item.slug, productId);

    const variantCount = await db.$count(productVariants, eq(productVariants.productId, productId));
    if (!existing || resetStock || variantCount === 0) {
      const variants = buildDefaultVariants(sizes, colors, item.stock ?? PLACEHOLDER_STOCK);
      await db.transaction(async (tx) => {
        await tx.delete(productVariants).where(eq(productVariants.productId, productId));
        await tx.insert(productVariants).values(variants.map((variant) => ({ ...variant, productId })));
        await tx
          .update(products)
          .set({ stock: variants.reduce((sum, variant) => sum + variant.stock, 0) })
          .where(eq(products.id, productId));
      });
    }
  }
  console.log(`✓ ${total} products (${created} new, ${catalog.products.filter((p) => p.draft).length} drafts)`);

  // Collections
  for (const collection of catalog.collections) {
    const [row] = await db
      .insert(collections)
      .values({
        slug: collection.slug,
        name: collection.name,
        eyebrow: collection.eyebrow ?? null,
        description: collection.description ?? null,
        isFeatured: collection.isFeatured ?? false,
        displayOrder: collection.displayOrder ?? 0,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: collections.slug,
        set: {
          name: collection.name,
          eyebrow: collection.eyebrow ?? null,
          description: collection.description ?? null,
          isFeatured: collection.isFeatured ?? false,
          displayOrder: collection.displayOrder ?? 0,
          updatedAt: new Date(),
        },
      })
      .returning({ id: collections.id });

    const memberIds = collection.products.map((slug) => {
      const id = productIds.get(slug);
      if (!id) throw new Error(`Collection ${collection.slug}: unknown product ${slug}`);
      return id;
    });

    await db.transaction(async (tx) => {
      await tx
        .delete(collectionProducts)
        .where(and(eq(collectionProducts.collectionId, row.id), notInArray(collectionProducts.productId, memberIds)));
      for (const [index, productId] of memberIds.entries()) {
        await tx
          .insert(collectionProducts)
          .values({ collectionId: row.id, productId, position: index })
          .onConflictDoUpdate({
            target: [collectionProducts.collectionId, collectionProducts.productId],
            set: { position: index },
          });
      }
    });
  }
  console.log(`✓ ${catalog.collections.length} collections`);

  // "Complete the set" pairings
  for (const combo of catalog.combos ?? []) {
    const productAId = productIds.get(combo.productA);
    const productBId = productIds.get(combo.productB);
    if (!productAId || !productBId) throw new Error(`Combo ${combo.productA} + ${combo.productB}: unknown product`);
    await db
      .insert(combos)
      .values({ productAId, productBId, discountAmount: combo.discount.toFixed(2), displayOrder: combo.displayOrder ?? 0, isActive: true })
      .onConflictDoUpdate({
        target: [combos.productAId, combos.productBId],
        set: { discountAmount: combo.discount.toFixed(2), displayOrder: combo.displayOrder ?? 0, updatedAt: new Date() },
      });
  }
  console.log(`✓ ${(catalog.combos ?? []).length} sets`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
