import { db } from "@/lib/db";
import { categories, collectionProducts, collections, productSearchIndexState, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  buildProductSearchText,
  buildProductVectorMetadata,
  createProductImageSearchHash,
  createProductSearchHash,
  getProductImageHashMap,
  getProductImageVectorId,
  getStaleProductImageUrls,
  getProductTextVectorId,
  normalizeProductImageUrls,
  type ProductSearchSource,
} from "@/lib/product-search";
import {
  generateProductDocumentSearchEmbedding,
  generateProductImageSearchEmbedding,
} from "@/lib/product-search-embedding";
import {
  deleteProductSearchVectors,
  deleteProductSearchVectorsByIds,
  upsertProductSearchVectors,
  type ProductSearchVector,
} from "@/lib/product-search-pinecone";

type ProductIndexRow = typeof products.$inferSelect;
type ProductSearchSyncOptions = {
  force?: boolean;
};

const productIndexColumns = {
  id: products.id,
  name: products.name,
  description: products.description,
  category: products.category,
  tags: products.tags,
  material: products.material,
  dimensions: products.dimensions,
  careInstructions: products.careInstructions,
  features: products.features,
  images: products.images,
  sizes: products.sizes,
  colors: products.colors,
  isActive: products.isActive,
  isNew: products.isNew,
  isFeatured: products.isFeatured,
  stock: products.stock,
  sellingPrice: products.sellingPrice,
  searchText: products.searchText,
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function toSearchSource(
  product: Pick<ProductIndexRow, keyof typeof productIndexColumns>,
  taxonomy: { categoryName: string | null; collectionNames: string[] },
): ProductSearchSource & { id: string } {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    categoryName: taxonomy.categoryName,
    collectionNames: taxonomy.collectionNames,
    tags: product.tags || [],
    material: product.material,
    dimensions: product.dimensions,
    careInstructions: product.careInstructions || [],
    features: product.features || [],
    images: product.images || [],
    sizes: product.sizes || [],
    colors: product.colors || [],
    isActive: product.isActive,
    isNew: product.isNew,
    isFeatured: product.isFeatured,
    stock: product.stock,
    sellingPrice: product.sellingPrice,
  };
}

async function loadTaxonomyNames(productId: string, categorySlug: string) {
  const [[category], collectionRows] = await Promise.all([
    db.select({ name: categories.name }).from(categories).where(eq(categories.slug, categorySlug)),
    db
      .select({ name: collections.name })
      .from(collectionProducts)
      .innerJoin(collections, eq(collections.id, collectionProducts.collectionId))
      .where(eq(collectionProducts.productId, productId)),
  ]);
  return { categoryName: category?.name ?? null, collectionNames: collectionRows.map((row) => row.name) };
}

/** Dense (semantic) search is optional: it needs Gemini embeddings and a Pinecone index. */
export function isSemanticSearchConfigured() {
  return Boolean(process.env.GEMINI_API_KEYS?.trim() && process.env.PINECONE_API_KEY?.trim());
}

/**
 * Rebuilds the lexical search document (name, description, category and
 * collection names, tags, materials, options). Always runs, with or without
 * semantic search configured.
 */
export async function refreshProductSearchText(productId: string) {
  const [product] = await db.select(productIndexColumns).from(products).where(eq(products.id, productId));
  if (!product) return null;
  const source = toSearchSource(product, await loadTaxonomyNames(productId, product.category));
  const searchText = buildProductSearchText(source);
  if (searchText !== product.searchText) {
    await db.update(products).set({ searchText }).where(eq(products.id, productId));
  }
  return { product, source, searchText };
}

async function markProductSearchIndexFailed(productId: string, error: unknown) {
  await db
    .insert(productSearchIndexState)
    .values({
      productId,
      status: "failed",
      lastError: errorMessage(error).slice(0, 1000),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: productSearchIndexState.productId,
      set: {
        status: "failed",
        lastError: errorMessage(error).slice(0, 1000),
        updatedAt: new Date(),
      },
    });
}

export async function markProductSearchIndexPending(productId: string) {
  await db
    .insert(productSearchIndexState)
    .values({
      productId,
      status: "pending",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: productSearchIndexState.productId,
      set: {
        status: "pending",
        updatedAt: new Date(),
      },
    });
}

export async function syncProductSearchIndex(productId: string, options: ProductSearchSyncOptions = {}) {
  const refreshed = await refreshProductSearchText(productId);

  if (!refreshed) {
    if (isSemanticSearchConfigured()) await deleteProductSearchVectors(productId);
    return { productId, status: "deleted" as const };
  }

  if (!isSemanticSearchConfigured()) {
    return { productId, status: "lexical-only" as const };
  }

  const [state] = await db
    .select()
    .from(productSearchIndexState)
    .where(eq(productSearchIndexState.productId, productId));

  const { source, searchText } = refreshed;
  const searchTextHash = createProductSearchHash(searchText);
  const nextImageHashes = getProductImageHashMap(source.images);
  const currentImageHashes = state?.imageHashes || {};
  const images = normalizeProductImageUrls(source.images);
  const vectors: ProductSearchVector[] = [];

  if (options.force || state?.searchTextHash !== searchTextHash) {
    vectors.push({
      id: getProductTextVectorId(productId),
      values: await generateProductDocumentSearchEmbedding({
        title: source.name,
        searchText,
      }),
      metadata: buildProductVectorMetadata({
        product: source,
        kind: "text",
        hash: searchTextHash,
      }),
    });
  }

  for (const [imageIndex, imageUrl] of images.entries()) {
    const imageHash = createProductImageSearchHash(imageUrl);
    if (!options.force && currentImageHashes[imageUrl] === imageHash) continue;

    vectors.push({
      id: getProductImageVectorId(productId, imageUrl),
      values: await generateProductImageSearchEmbedding(imageUrl),
      metadata: buildProductVectorMetadata({
        product: source,
        kind: "image",
        hash: imageHash,
        imageUrl,
        imageIndex,
      }),
    });
  }

  const removedImageUrls = getStaleProductImageUrls(currentImageHashes, nextImageHashes);
  if (removedImageUrls.length > 0) {
    await deleteProductSearchVectorsByIds(
      removedImageUrls.map((imageUrl) => getProductImageVectorId(productId, imageUrl)),
    );
  }

  if (options.force && vectors.length > 0) {
    await deleteProductSearchVectors(productId);
  }

  await upsertProductSearchVectors(vectors);

  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({
        searchText,
      })
      .where(eq(products.id, productId));

    await tx
      .insert(productSearchIndexState)
      .values({
        productId,
        searchTextHash,
        imageHashes: nextImageHashes,
        status: "synced",
        lastError: null,
        syncedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: productSearchIndexState.productId,
        set: {
          searchTextHash,
          imageHashes: nextImageHashes,
          status: "synced",
          lastError: null,
          syncedAt: new Date(),
          updatedAt: new Date(),
        },
      });
  });

  return {
    productId,
    status: "synced" as const,
    upserted: vectors.length,
    removed: removedImageUrls.length,
  };
}

export async function syncProductSearchIndexAfterMutation(productId: string, options: ProductSearchSyncOptions = {}) {
  try {
    await markProductSearchIndexPending(productId);
    return await syncProductSearchIndex(productId, options);
  } catch (error) {
    await markProductSearchIndexFailed(productId, error);
    console.warn("Product saved, but search indexing is pending retry:", errorMessage(error));
    return { productId, status: "failed" as const, error: errorMessage(error) };
  }
}

export async function deleteProductSearchIndexAfterMutation(productId: string) {
  if (!isSemanticSearchConfigured()) return;
  try {
    await deleteProductSearchVectors(productId);
  } catch (error) {
    console.warn("Product deleted, but Pinecone vector cleanup failed:", errorMessage(error));
  }
}
