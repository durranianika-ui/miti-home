import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gt, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { getCatalogProducts } from "@/lib/product-catalog";
import { getCategoryNameMap } from "@/lib/taxonomy";
import {
  buildGeneralSearchPhrases,
  mergeMerchandisingSuggestionPool,
  type SearchSuggestionProductSource,
} from "@/lib/search-suggestions";

const PRODUCT_SUGGESTION_LIMIT = 3;
const TERM_SUGGESTION_LIMIT = 4;
const BUCKET_LIMIT = 12;
const MIN_PHRASE_MATCHES = 2;

export const dynamic = "force-dynamic";

const suggestionProductColumns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  sellingPrice: products.sellingPrice,
  mrp: products.mrp,
  images: products.images,
  category: products.category,
  isNew: products.isNew,
  isFeatured: products.isFeatured,
  stock: products.stock,
};

const phraseProductColumns = {
  id: products.id,
  name: products.name,
  category: products.category,
  tags: products.tags,
  material: products.material,
  features: products.features,
  colors: products.colors,
  isNew: products.isNew,
  isFeatured: products.isFeatured,
  displayOrder: products.displayOrder,
  stock: products.stock,
  searchText: products.searchText,
};

function getSeed(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  return searchParams.get("seed")?.trim().slice(0, 64) || `${Date.now()}`;
}

async function getMerchandisingBucket(extraCondition?: SQL) {
  return db
    .select(suggestionProductColumns)
    .from(products)
    .where(and(eq(products.isActive, true), gt(products.stock, 0), extraCondition))
    .orderBy(desc(products.displayOrder), desc(products.createdAt))
    .limit(BUCKET_LIMIT);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim().slice(0, 80) || "";
    const seed = getSeed(req);

    const [phraseRows, categoryNames] = await Promise.all([
      db
        .select(phraseProductColumns)
        .from(products)
        .where(and(eq(products.isActive, true), gt(products.stock, 0)))
        .orderBy(desc(products.displayOrder), desc(products.createdAt)),
      getCategoryNameMap(),
    ]);

    const phraseProducts: SearchSuggestionProductSource[] = phraseRows.map((product) => ({
      ...product,
      categoryName: categoryNames.get(product.category) ?? null,
      tags: product.tags || [],
      features: product.features || [],
      colors: product.colors || [],
    }));

    const terms = buildGeneralSearchPhrases({
      products: phraseProducts,
      seed,
      limit: TERM_SUGGESTION_LIMIT,
      minMatches: MIN_PHRASE_MATCHES,
      query: query.length >= 2 ? query : undefined,
    });

    const withCategoryName = <T extends { category: string }>(product: T) => ({
      ...product,
      categoryName: categoryNames.get(product.category) ?? null,
    });

    if (query.length < 2) {
      const [featuredProducts, newProducts, displayOrderProducts] = await Promise.all([
        getMerchandisingBucket(eq(products.isFeatured, true)),
        getMerchandisingBucket(eq(products.isNew, true)),
        getMerchandisingBucket(),
      ]);
      return NextResponse.json({
        products: mergeMerchandisingSuggestionPool({
          featuredProducts,
          newProducts,
          displayOrderProducts,
          seed,
          limit: PRODUCT_SUGGESTION_LIMIT,
        }).map(withCategoryName),
        terms,
      });
    }

    const result = await getCatalogProducts({
      search: query,
      limit: 12,
      offset: 0,
      includeTotal: false,
    });

    return NextResponse.json({
      products: result.products
        .filter((product) => product.stock > 0)
        .slice(0, PRODUCT_SUGGESTION_LIMIT)
        .map(withCategoryName),
      terms,
    });
  } catch (error) {
    console.error("Failed to fetch search suggestions:", error);
    return NextResponse.json(
      { error: "Search suggestions are unavailable right now." },
      { status: 500 },
    );
  }
}
