export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { buildGoogleMerchantFeed } from "@/lib/seo-merchant-feed";
import { normalizeSiteUrl } from "@/lib/seo";
import { getCategoryNameMap } from "@/lib/taxonomy";
import { eq } from "drizzle-orm";

export async function GET() {
  const [rows, categoryNames] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: products.slug,
        sku: products.sku,
        name: products.name,
        description: products.description,
        images: products.images,
        sellingPrice: products.sellingPrice,
        mrp: products.mrp,
        stock: products.stock,
        category: products.category,
        material: products.material,
      })
      .from(products)
      .where(eq(products.isActive, true)),
    getCategoryNameMap(),
  ]);

  return new Response(
    buildGoogleMerchantFeed({
      baseUrl: normalizeSiteUrl(),
      products: rows.map((row) => ({ ...row, categoryName: categoryNames.get(row.category) ?? null })),
    }),
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=1800, s-maxage=3600",
        "X-Robots-Tag": "noindex, follow",
      },
    }
  );
}
