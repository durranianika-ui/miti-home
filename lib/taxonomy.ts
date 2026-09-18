import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { categories, collectionProducts, collections, products } from "@/lib/db/schema";

export type Category = typeof categories.$inferSelect;
export type Collection = typeof collections.$inferSelect;

export type CategoryWithCount = Category & { productCount: number; coverImage: string | null };
export type CollectionWithCount = Collection & { productCount: number; coverImage: string | null };

/**
 * Active categories that currently have at least one active product, in
 * merchandising order. Navigation is built from this so empty categories
 * never appear to shoppers.
 */
export const getNavigationCategories = cache(async (): Promise<CategoryWithCount[]> => {
  const rows = await db
    .select({
      category: categories,
      productCount: sql<number>`count(${products.id})`.mapWith(Number),
      firstImage: sql<string | null>`(array_agg(${products.images}->>0 ORDER BY ${products.displayOrder} DESC, ${products.createdAt} DESC))[1]`,
    })
    .from(categories)
    .leftJoin(products, and(eq(products.category, categories.slug), eq(products.isActive, true)))
    .where(eq(categories.isActive, true))
    .groupBy(categories.id)
    .orderBy(asc(categories.displayOrder), asc(categories.name));

  return rows
    .filter((row) => row.productCount > 0)
    .map((row) => ({
      ...row.category,
      productCount: row.productCount,
      coverImage: row.category.image || row.firstImage,
    }));
});

export const getCategoryBySlug = cache(async (slug: string) => {
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.slug, slug), eq(categories.isActive, true)));
  return category ?? null;
});

export const getCategoryNameMap = cache(async () => {
  const rows = await db.select({ slug: categories.slug, name: categories.name }).from(categories);
  return new Map(rows.map((row) => [row.slug, row.name]));
});

export async function getAllCategories() {
  return db.select().from(categories).orderBy(asc(categories.displayOrder), asc(categories.name));
}

/** Active collections with at least one active product. */
export const getNavigationCollections = cache(async (): Promise<CollectionWithCount[]> => {
  const rows = await db
    .select({
      collection: collections,
      productCount: sql<number>`count(${products.id})`.mapWith(Number),
      firstImage: sql<string | null>`(array_agg(${products.images}->>0 ORDER BY ${collectionProducts.position} ASC))[1]`,
    })
    .from(collections)
    .leftJoin(collectionProducts, eq(collectionProducts.collectionId, collections.id))
    .leftJoin(products, and(eq(products.id, collectionProducts.productId), eq(products.isActive, true)))
    .where(eq(collections.isActive, true))
    .groupBy(collections.id)
    .orderBy(desc(collections.isFeatured), asc(collections.displayOrder), asc(collections.name));

  return rows
    .filter((row) => row.productCount > 0)
    .map((row) => ({
      ...row.collection,
      productCount: row.productCount,
      coverImage: row.collection.image || row.firstImage,
    }));
});

export const getCollectionBySlug = cache(async (slug: string) => {
  const [collection] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.slug, slug), eq(collections.isActive, true)));
  return collection ?? null;
});

export async function getAllCollections() {
  return db.select().from(collections).orderBy(asc(collections.displayOrder), asc(collections.name));
}

export async function getCollectionIdsForProduct(productId: string) {
  const rows = await db
    .select({ collectionId: collectionProducts.collectionId })
    .from(collectionProducts)
    .where(eq(collectionProducts.productId, productId));
  return rows.map((row) => row.collectionId);
}

export async function getCollectionSlugsForProducts(productIds: string[]) {
  if (productIds.length === 0) return [];
  const rows = await db
    .selectDistinct({ slug: collections.slug })
    .from(collectionProducts)
    .innerJoin(collections, eq(collections.id, collectionProducts.collectionId))
    .where(inArray(collectionProducts.productId, productIds));
  return rows.map((row) => row.slug);
}
