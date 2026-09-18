import { db } from "@/lib/db";
import { collectionProducts, collections, products, productVariants } from "@/lib/db/schema";
import { and, asc, desc, eq, gt, inArray, sql, type SQL } from "drizzle-orm";
import { generateProductQuerySearchEmbedding } from "@/lib/product-search-embedding";
import { queryProductSemanticCandidates } from "@/lib/product-search-pinecone";
import { isSemanticSearchConfigured } from "@/lib/product-search-index";
import type { SemanticProductCandidate } from "@/lib/product-search";
import type { CatalogQuery, CatalogSort } from "@/lib/catalog-query";

export type { CatalogQuery, CatalogSort } from "@/lib/catalog-query";

export type CatalogProduct = Pick<
  typeof products.$inferSelect,
  | "id"
  | "name"
  | "slug"
  | "sellingPrice"
  | "mrp"
  | "maxBargainDiscount"
  | "category"
  | "isNew"
  | "isFeatured"
  | "stock"
  | "material"
  | "sizeLabel"
  | "colorLabel"
> & {
  images: string[];
  sizes: string[];
  colors: { name: string; hex: string; images?: string[] }[];
  availableSizes: string[];
};

type CatalogProductRow = Omit<CatalogProduct, "images" | "sizes" | "colors" | "availableSizes"> & {
  images: string[] | null;
  sizes: string[] | null;
  colors: { name: string; hex: string; images?: string[] }[] | null;
};

const catalogProductColumns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  sellingPrice: products.sellingPrice,
  mrp: products.mrp,
  maxBargainDiscount: products.maxBargainDiscount,
  images: products.images,
  category: products.category,
  material: products.material,
  sizeLabel: products.sizeLabel,
  colorLabel: products.colorLabel,
  sizes: products.sizes,
  colors: products.colors,
  isNew: products.isNew,
  isFeatured: products.isFeatured,
  stock: products.stock,
};

function collectionMembership(slug: string) {
  return sql`EXISTS (
    SELECT 1
    FROM ${collectionProducts}
    INNER JOIN ${collections} ON ${collections.id} = ${collectionProducts.collectionId}
    WHERE ${collectionProducts.productId} = ${products.id}
      AND ${collections.slug} = ${slug}
      AND ${collections.isActive} = true
  )`;
}

/** Builds the WHERE clause shared by listing, counting and hybrid search. */
function buildCatalogConditions(query: CatalogQuery): SQL {
  const conditions: SQL[] = [sql`${products.isActive} = true`];

  if (query.category) conditions.push(sql`${products.category} = ${query.category}`);
  if (query.collection) conditions.push(collectionMembership(query.collection));
  if (query.minPrice) conditions.push(sql`${products.sellingPrice} >= ${query.minPrice}`);
  if (query.maxPrice) conditions.push(sql`${products.sellingPrice} <= ${query.maxPrice}`);
  if (query.isNew) conditions.push(sql`${products.isNew} = true`);
  if (query.isFeatured) conditions.push(sql`${products.isFeatured} = true`);
  if (query.onSale) conditions.push(sql`${products.mrp} > ${products.sellingPrice}`);
  if (query.availability === "in-stock") conditions.push(sql`${products.stock} > 0`);
  if (query.material) conditions.push(sql`${products.material} ILIKE ${`%${query.material}%`}`);

  if (query.color) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM json_array_elements(coalesce(${products.colors}, '[]'::json)) AS product_color
      WHERE lower(product_color->>'name') = lower(${query.color})
    )`);
  }

  if (query.size) {
    conditions.push(sql`(
      EXISTS (
        SELECT 1 FROM ${productVariants}
        WHERE ${productVariants.productId} = ${products.id}
          AND ${productVariants.size} = ${query.size}
          AND ${productVariants.stock} > 0
      )
    )`);
  }

  return sql.join(conditions, sql` AND `);
}

function orderByFor(sort: CatalogSort | null | undefined) {
  switch (sort) {
    case "newest":
      return [desc(products.createdAt), desc(products.displayOrder)];
    case "price-asc":
      return [asc(products.sellingPrice), desc(products.displayOrder)];
    case "price-desc":
      return [desc(products.sellingPrice), desc(products.displayOrder)];
    case "name":
      return [asc(products.name)];
    default:
      return [desc(products.displayOrder), desc(products.createdAt)];
  }
}

function buildPineconeMetadataFilter(query: CatalogQuery) {
  const filters: object[] = [{ isActive: { $eq: true } }];

  if (query.category) filters.push({ category: { $eq: query.category } });
  if (query.minPrice) filters.push({ price: { $gte: Number(query.minPrice) } });
  if (query.maxPrice) filters.push({ price: { $lte: Number(query.maxPrice) } });
  if (query.isNew) filters.push({ isNew: { $eq: true } });
  if (query.isFeatured) filters.push({ isFeatured: { $eq: true } });

  return filters.length === 1 ? filters[0] : { $and: filters };
}

function semanticCandidateSql(candidates: SemanticProductCandidate[], where: SQL) {
  if (candidates.length === 0) return sql``;

  const values = candidates.map((candidate) => sql`(
    ${candidate.productId}::uuid,
    ${candidate.kind === "text" ? "text_semantic" : "image_semantic"}::text,
    ${candidate.rank}::bigint
  )`);

  return sql`
    UNION ALL
    SELECT semantic_candidates.id, semantic_candidates.source, semantic_candidates.rank
    FROM (VALUES ${sql.join(values, sql`, `)}) AS semantic_candidates(id, source, rank)
    INNER JOIN ${products} ON ${products.id} = semantic_candidates.id
    WHERE ${where}
  `;
}

async function addAvailableSizes(productRows: CatalogProductRow[]): Promise<CatalogProduct[]> {
  const productIds = productRows.map((product) => product.id);
  const availableVariantRows = productIds.length > 0
    ? await db
        .select({
          productId: productVariants.productId,
          size: productVariants.size,
        })
        .from(productVariants)
        .where(and(inArray(productVariants.productId, productIds), gt(productVariants.stock, 0)))
    : [];

  const availableSizesByProductId = availableVariantRows.reduce<Map<string, Set<string>>>((acc, variant) => {
    const sizes = acc.get(variant.productId) || new Set<string>();
    sizes.add(variant.size);
    acc.set(variant.productId, sizes);
    return acc;
  }, new Map());

  return productRows.map((product) => {
    const available = availableSizesByProductId.get(product.id);
    const declared = product.sizes || [];
    // Keep the merchant's option order rather than the variant query order.
    const availableSizes = available
      ? declared.filter((size) => available.has(size)).concat([...available].filter((size) => !declared.includes(size)))
      : product.stock > 0 ? declared : [];
    return {
      ...product,
      images: product.images || [],
      sizes: declared,
      colors: product.colors || [],
      availableSizes,
    };
  });
}

export async function getCatalogProducts(query: CatalogQuery = {}) {
  const search = query.search?.trim();
  if (search) {
    return getHybridCatalogProducts({ ...query, search });
  }

  const where = buildCatalogConditions(query);
  const productQuery = db
    .select(catalogProductColumns)
    .from(products)
    .where(where)
    .orderBy(...orderByFor(query.sort));

  const productRowsPromise: Promise<CatalogProductRow[]> = (
    query.limit === undefined
      ? productQuery
      : productQuery.limit(query.limit).offset(query.offset || 0)
  ).then((rows) => rows as CatalogProductRow[]);

  const [productRows, countRows] = await Promise.all([
    productRowsPromise,
    query.includeTotal
      ? db.select({ count: sql<number>`count(*)` }).from(products).where(where)
      : Promise.resolve([{ count: 0 }]),
  ]);

  const productsWithAvailableSizes = await addAvailableSizes(productRows);

  return {
    products: productsWithAvailableSizes,
    total: query.includeTotal ? Number(countRows[0]?.count || 0) : productsWithAvailableSizes.length,
    limit: query.limit ?? productsWithAvailableSizes.length,
    offset: query.offset || 0,
  };
}

/** Products in a collection, in the collection's merchandising order. */
export async function getCollectionCatalogProducts(collectionSlug: string, query: CatalogQuery = {}) {
  if (query.sort && query.sort !== "featured") {
    return getCatalogProducts({ ...query, collection: collectionSlug });
  }

  const where = buildCatalogConditions({ ...query, collection: collectionSlug });
  const rows = await db
    .select(catalogProductColumns)
    .from(products)
    .innerJoin(collectionProducts, eq(collectionProducts.productId, products.id))
    .innerJoin(collections, eq(collections.id, collectionProducts.collectionId))
    .where(and(where, eq(collections.slug, collectionSlug)))
    .orderBy(asc(collectionProducts.position));

  const productsWithSizes = await addAvailableSizes(rows as CatalogProductRow[]);
  return { products: productsWithSizes, total: productsWithSizes.length, limit: productsWithSizes.length, offset: 0 };
}

export type CatalogFacets = {
  categories: { slug: string; count: number }[];
  colors: { name: string; hex: string; count: number }[];
  materials: { name: string; count: number }[];
  sizes: { name: string; count: number }[];
  price: { min: number; max: number };
};

/**
 * Filter options available within a listing scope (category / collection /
 * flags), so the filter panel only offers choices that return products.
 */
export async function getCatalogFacets(scope: CatalogQuery = {}): Promise<CatalogFacets> {
  const where = buildCatalogConditions({
    category: scope.category,
    collection: scope.collection,
    isNew: scope.isNew,
    isFeatured: scope.isFeatured,
    onSale: scope.onSale,
  });

  const rows = await db
    .select({
      category: products.category,
      material: products.material,
      colors: products.colors,
      sizes: products.sizes,
      sellingPrice: products.sellingPrice,
    })
    .from(products)
    .where(where);

  const categoryCounts = new Map<string, number>();
  const colorCounts = new Map<string, { name: string; hex: string; count: number }>();
  const materialCounts = new Map<string, number>();
  const sizeCounts = new Map<string, number>();
  let min = Infinity;
  let max = 0;

  for (const row of rows) {
    categoryCounts.set(row.category, (categoryCounts.get(row.category) ?? 0) + 1);
    for (const color of row.colors ?? []) {
      const key = color.name.toLowerCase();
      const entry = colorCounts.get(key) ?? { name: color.name, hex: color.hex, count: 0 };
      entry.count += 1;
      colorCounts.set(key, entry);
    }
    if (row.material) {
      // Materials are free text ("Glass, wood"); facet on each primary material word.
      for (const part of row.material.split(/,|with|&/i).map((value) => value.trim()).filter(Boolean)) {
        const name = part.replace(/^(glazed|matte|high-fired|silver-plated|brushed|smoked)\s+/i, "");
        const label = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        if (label.length > 2 && label.length < 24) materialCounts.set(label, (materialCounts.get(label) ?? 0) + 1);
      }
    }
    for (const size of row.sizes ?? []) {
      if (size !== "Standard") sizeCounts.set(size, (sizeCounts.get(size) ?? 0) + 1);
    }
    const price = Number(row.sellingPrice);
    if (Number.isFinite(price)) {
      min = Math.min(min, price);
      max = Math.max(max, price);
    }
  }

  return {
    categories: [...categoryCounts].map(([slug, count]) => ({ slug, count })),
    colors: [...colorCounts.values()].sort((a, b) => b.count - a.count),
    materials: [...materialCounts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    sizes: [...sizeCounts].map(([name, count]) => ({ name, count })),
    price: { min: Number.isFinite(min) ? min : 0, max },
  };
}

async function getHybridCatalogProducts(query: CatalogQuery & { search: string }) {
  const limit = query.limit ?? 24;
  const offset = query.offset ?? 0;
  const where = buildCatalogConditions(query);
  let semanticCandidates: SemanticProductCandidate[] = [];

  if (query.search.length >= 2 && isSemanticSearchConfigured()) {
    try {
      const embedding = await generateProductQuerySearchEmbedding(query.search);
      semanticCandidates = await queryProductSemanticCandidates({
        embedding,
        filter: buildPineconeMetadataFilter(query),
        topK: 80,
      });
    } catch (error) {
      console.warn(
        "Semantic product search unavailable; falling back to lexical ranking.",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const result = await db.execute<CatalogProductRow & { total: number }>(sql`
    WITH search_query AS (
      SELECT
        websearch_to_tsquery('english', ${query.search}) AS ts_query,
        lower(${query.search}) AS normalized_query,
        lower(${query.search}) || '%' AS prefix_query,
        '%' || lower(${query.search}) || '%' AS contains_query
    ),
    candidates AS (
      SELECT id, 'exact' AS source, exact_rank AS rank
      FROM (
        SELECT
          ${products.id} AS id,
          row_number() OVER (
            ORDER BY ${products.displayOrder} DESC,
                     ${products.createdAt} DESC
          ) AS exact_rank
        FROM ${products}, search_query
        WHERE ${where}
          AND (
            lower(${products.name}) = search_query.normalized_query
            OR lower(${products.category}) = search_query.normalized_query
            OR lower(replace(${products.category}, '-', ' ')) = search_query.normalized_query
          )
        LIMIT 80
      ) exact_matches

      UNION ALL

      SELECT id, 'prefix' AS source, prefix_rank AS rank
      FROM (
        SELECT
          ${products.id} AS id,
          row_number() OVER (
            ORDER BY ${products.displayOrder} DESC,
                     ${products.createdAt} DESC
          ) AS prefix_rank
        FROM ${products}, search_query
        WHERE ${where}
          AND lower(${products.name}) LIKE search_query.prefix_query
        LIMIT 80
      ) prefix_matches

      UNION ALL

      SELECT id, 'substring' AS source, substring_rank AS rank
      FROM (
        SELECT
          ${products.id} AS id,
          row_number() OVER (
            ORDER BY ${products.displayOrder} DESC,
                     ${products.createdAt} DESC
          ) AS substring_rank
        FROM ${products}, search_query
        WHERE ${where}
          AND lower(${products.searchText}) LIKE search_query.contains_query
        LIMIT 80
      ) substring_matches

      UNION ALL

      SELECT id, 'keyword' AS source, keyword_rank AS rank
      FROM (
        SELECT
          ${products.id} AS id,
          row_number() OVER (
            ORDER BY ts_rank_cd(${products.searchTokens}, search_query.ts_query) DESC,
                     ${products.displayOrder} DESC,
                     ${products.createdAt} DESC
          ) AS keyword_rank
        FROM ${products}, search_query
        WHERE ${where}
          AND ${products.searchTokens} @@ search_query.ts_query
        LIMIT 80
      ) keyword_matches

      UNION ALL

      SELECT id, 'typo' AS source, typo_rank AS rank
      FROM (
        SELECT
          ${products.id} AS id,
          row_number() OVER (
            ORDER BY word_similarity(${query.search}, ${products.name}) DESC,
                     similarity(${products.name}, ${query.search}) DESC,
                     ${products.displayOrder} DESC,
                     ${products.createdAt} DESC
          ) AS typo_rank
        FROM ${products}
        WHERE ${where}
          AND (
            similarity(${products.name}, ${query.search}) > 0.18
            OR word_similarity(${query.search}, ${products.name}) > 0.25
          )
        LIMIT 80
      ) typo_matches

      ${semanticCandidateSql(semanticCandidates, where)}
    ),
    fused AS (
      SELECT
        id,
        sum(
          CASE source
            WHEN 'exact' THEN 100.0 + (1.0 / (60 + rank))
            WHEN 'prefix' THEN 80.0 + (1.0 / (60 + rank))
            WHEN 'substring' THEN 60.0 + (1.0 / (60 + rank))
            WHEN 'keyword' THEN 30.0 + (1.3 / (60 + rank))
            WHEN 'typo' THEN 20.0 + (0.9 / (60 + rank))
            WHEN 'text_semantic' THEN 10.0 + (1.0 / (60 + rank))
            WHEN 'image_semantic' THEN 8.0 + (0.8 / (60 + rank))
            ELSE 0
          END
        ) AS search_score
      FROM candidates
      GROUP BY id
    ),
    ranked_products AS (
      SELECT
        ${products.id} AS id,
        ${products.name} AS name,
        ${products.slug} AS slug,
        ${products.sellingPrice} AS "sellingPrice",
        ${products.mrp} AS mrp,
        ${products.maxBargainDiscount} AS "maxBargainDiscount",
        ${products.images} AS images,
        ${products.category} AS category,
        ${products.material} AS material,
        ${products.sizeLabel} AS "sizeLabel",
        ${products.colorLabel} AS "colorLabel",
        ${products.sizes} AS sizes,
        ${products.colors} AS colors,
        ${products.isNew} AS "isNew",
        ${products.isFeatured} AS "isFeatured",
        ${products.stock} AS stock,
        count(*) OVER() AS total
      FROM fused
      INNER JOIN ${products} ON ${products.id} = fused.id
      ORDER BY fused.search_score DESC, ${products.displayOrder} DESC, ${products.createdAt} DESC
      LIMIT ${limit}
      OFFSET ${offset}
    )
    SELECT * FROM ranked_products
  `);

  const productRows = result.rows as (CatalogProductRow & { total: number })[];
  const productsWithAvailableSizes = await addAvailableSizes(productRows);

  return {
    products: productsWithAvailableSizes,
    total: Number(productRows[0]?.total || 0),
    limit,
    offset,
  };
}
