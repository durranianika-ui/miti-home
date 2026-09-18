import { NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { parsePublicProductPagination } from "@/lib/checkout/validation";
import { parseCatalogSearchParams } from "@/lib/catalog-query";
import { getCatalogProducts, getCollectionCatalogProducts } from "@/lib/product-catalog";

export async function GET(req: NextRequest) {
  await connection();

  try {
    const { searchParams } = new URL(req.url);
    const query = parseCatalogSearchParams(searchParams);
    const { limit, offset } = parsePublicProductPagination(
      searchParams.get("limit"),
      searchParams.get("offset")
    );

    const result = query.collection && !query.search
      ? await getCollectionCatalogProducts(query.collection, query)
      : await getCatalogProducts({ ...query, limit, offset, includeTotal: true });

    return NextResponse.json({
      products: result.products,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { error: "We couldn't load products right now." },
      { status: 500 }
    );
  }
}
