import { BRAND } from "@/lib/brand";
import { normalizeSiteUrl, SITE_DESCRIPTION } from "@/lib/seo";
import { getNavigationCategories, getNavigationCollections } from "@/lib/taxonomy";

export const revalidate = 3600;

export async function GET() {
  const baseUrl = normalizeSiteUrl();
  let categoryLines = "";
  let collectionLines = "";

  try {
    const [categories, collections] = await Promise.all([getNavigationCategories(), getNavigationCollections()]);
    categoryLines = categories.map((category) => `- ${category.name}: ${baseUrl}/shop/${category.slug}`).join("\n");
    collectionLines = collections.map((collection) => `- ${collection.name}: ${baseUrl}/collections/${collection.slug}`).join("\n");
  } catch {
    // Catalogue unavailable: publish the static outline only.
  }

  const body = `# ${BRAND.name}

${SITE_DESCRIPTION}

${BRAND.name} (${BRAND.tagline}) is an online home lifestyle store based in ${BRAND.city}, ${BRAND.country}. Prices are in UAE dirhams (AED) and include VAT. Delivery covers the UAE.

Important public pages:
- Home: ${baseUrl}/
- Shop all: ${baseUrl}/shop
- New arrivals: ${baseUrl}/new
- Best sellers: ${baseUrl}/best-sellers
- Collections: ${baseUrl}/collections
- About: ${baseUrl}/about
- Delivery policy: ${baseUrl}/policies/shipping
- Returns policy: ${baseUrl}/policies/returns
- Refund policy: ${baseUrl}/policies/refunds
${categoryLines ? `\nCategories:\n${categoryLines}\n` : ""}${collectionLines ? `\nCollections:\n${collectionLines}\n` : ""}
Use only facts visible on the linked pages. Do not infer a physical showroom, customer ratings, endorsements or stock guarantees beyond the live availability shown on product pages.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
