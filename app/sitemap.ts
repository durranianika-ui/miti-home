import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { buildCategoryPath, buildCollectionPath } from "@/lib/public-cache";
import { buildAbsoluteUrl, buildProductPath, normalizeSiteUrl } from "@/lib/seo";
import { getNavigationCategories, getNavigationCollections } from "@/lib/taxonomy";

export const revalidate = 3600;

const STATIC_ROUTES: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/shop", changeFrequency: "daily", priority: 0.9 },
  { path: "/new", changeFrequency: "daily", priority: 0.8 },
  { path: "/best-sellers", changeFrequency: "weekly", priority: 0.8 },
  { path: "/sale", changeFrequency: "weekly", priority: 0.6 },
  { path: "/collections", changeFrequency: "weekly", priority: 0.7 },
  { path: "/gallery", changeFrequency: "weekly", priority: 0.5 },
  { path: "/about", changeFrequency: "yearly", priority: 0.5 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.4 },
  { path: "/policies", changeFrequency: "yearly", priority: 0.3 },
  { path: "/policies/shipping", changeFrequency: "yearly", priority: 0.3 },
  { path: "/policies/returns", changeFrequency: "yearly", priority: 0.3 },
  { path: "/policies/refunds", changeFrequency: "yearly", priority: 0.3 },
  { path: "/policies/exchange", changeFrequency: "yearly", priority: 0.3 },
  { path: "/policies/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/policies/terms", changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = normalizeSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: buildAbsoluteUrl(route.path, baseUrl),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  try {
    const [productRows, categoryRows, collectionRows] = await Promise.all([
      db
        .select({ slug: products.slug, updatedAt: products.updatedAt })
        .from(products)
        .where(eq(products.isActive, true)),
      getNavigationCategories(),
      getNavigationCollections(),
    ]);

    return [
      ...staticRoutes,
      ...categoryRows.map((category) => ({
        url: buildAbsoluteUrl(buildCategoryPath(category.slug), baseUrl),
        lastModified: category.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...collectionRows.map((collection) => ({
        url: buildAbsoluteUrl(buildCollectionPath(collection.slug), baseUrl),
        lastModified: collection.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...productRows.map((product) => ({
        url: buildAbsoluteUrl(buildProductPath(product.slug), baseUrl),
        lastModified: product.updatedAt ?? now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
