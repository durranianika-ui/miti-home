import "server-only";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { collectionProducts, collections, products } from "@/lib/db/schema";
import { getPublicProductMutationPaths } from "@/lib/public-cache";

/**
 * Revalidates every public surface that shows the given products — their
 * detail pages, their category and collection pages and the shared listings.
 * Used after orders and cancellations change stock.
 */
export async function revalidatePublicInventory(productIds: string[]) {
  if (productIds.length === 0) return;

  try {
    const [productRows, collectionRows] = await Promise.all([
      db
        .select({ slug: products.slug, category: products.category })
        .from(products)
        .where(inArray(products.id, productIds)),
      db
        .select({ slug: collections.slug })
        .from(collectionProducts)
        .innerJoin(collections, eq(collections.id, collectionProducts.collectionId))
        .where(inArray(collectionProducts.productId, productIds)),
    ]);

    const paths = new Set<string>();
    for (const row of productRows) {
      for (const path of getPublicProductMutationPaths({
        nextSlug: row.slug,
        categorySlugs: [row.category],
        collectionSlugs: collectionRows.map((collection) => collection.slug),
      })) {
        paths.add(path);
      }
    }

    for (const path of paths) revalidatePath(path);
  } catch (error) {
    // Revalidation must never fail the write that triggered it.
    console.error("Public cache revalidation failed:", error instanceof Error ? error.message : error);
  }
}
