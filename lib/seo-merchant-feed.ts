import { buildAbsoluteUrl, buildProductUrl, DEFAULT_OG_IMAGE, normalizeSiteUrl, SEO_SHIPPING, SITE_NAME } from "./seo.ts";

type MerchantFeedProduct = {
  id: string;
  slug: string;
  sku?: string | null;
  name: string;
  description?: string | null;
  images?: string[] | null;
  sellingPrice: string | number;
  mrp: string | number;
  stock: number;
  category: string;
  categoryName?: string | null;
  material?: string | null;
};

type MerchantFeedInput = {
  baseUrl?: string;
  products: MerchantFeedProduct[];
  updatedAt?: Date;
};

/** Google product taxonomy: Home & Garden > Decor. */
const GOOGLE_PRODUCT_CATEGORY = "Home &amp; Garden &gt; Decor";

function escapeXml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function price(value: string | number) {
  const numericValue = Number(value);
  return `${Number.isFinite(numericValue) ? numericValue.toFixed(2) : "0.00"} ${SEO_SHIPPING.currency}`;
}

function descriptionFor(product: MerchantFeedProduct) {
  return product.description?.trim() || `${product.name} — curated by ${SITE_NAME}.`;
}

export function buildGoogleMerchantFeed({ baseUrl, products, updatedAt = new Date() }: MerchantFeedInput) {
  const siteUrl = normalizeSiteUrl(baseUrl);

  const items = products.map((product) => {
    const image = product.images?.[0] ? buildAbsoluteUrl(product.images[0], siteUrl) : buildAbsoluteUrl(DEFAULT_OG_IMAGE, siteUrl);
    const additionalImages = (product.images ?? []).slice(1, 10).map(
      (extra) => `      <g:additional_image_link>${escapeXml(buildAbsoluteUrl(extra, siteUrl))}</g:additional_image_link>`,
    );
    const sellingPrice = Number(product.sellingPrice);
    const mrp = Number(product.mrp);
    const hasSalePrice = Number.isFinite(mrp) && Number.isFinite(sellingPrice) && mrp > sellingPrice;

    return `    <item>
      <g:id>${escapeXml(product.sku || product.id)}</g:id>
      <title>${escapeXml(product.name)}</title>
      <description>${escapeXml(descriptionFor(product))}</description>
      <link>${escapeXml(buildProductUrl(product.slug, siteUrl))}</link>
      <g:image_link>${escapeXml(image)}</g:image_link>
${additionalImages.join("\n")}
      <g:availability>${product.stock > 0 ? "in_stock" : "out_of_stock"}</g:availability>
      <g:price>${escapeXml(price(hasSalePrice ? product.mrp : product.sellingPrice))}</g:price>
      ${hasSalePrice ? `<g:sale_price>${escapeXml(price(product.sellingPrice))}</g:sale_price>` : ""}
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(SITE_NAME)}</g:brand>
      <g:mpn>${escapeXml(product.slug)}</g:mpn>
      <g:identifier_exists>no</g:identifier_exists>
      <g:product_type>${escapeXml(product.categoryName || product.category)}</g:product_type>
      <g:google_product_category>${GOOGLE_PRODUCT_CATEGORY}</g:google_product_category>
      ${product.material ? `<g:material>${escapeXml(product.material)}</g:material>` : ""}
      <g:shipping>
        <g:country>${SEO_SHIPPING.country}</g:country>
        <g:service>Standard</g:service>
        <g:price>${escapeXml(price(Number(product.sellingPrice) >= SEO_SHIPPING.freeShippingThreshold ? 0 : SEO_SHIPPING.standardShippingFee))}</g:price>
      </g:shipping>
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(SITE_NAME)} product feed</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>Active ${escapeXml(SITE_NAME)} catalogue for Google Merchant Center.</description>
    <lastBuildDate>${updatedAt.toUTCString()}</lastBuildDate>
${items.join("\n")}
  </channel>
</rss>`;
}
