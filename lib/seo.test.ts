import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAbsoluteUrl,
  buildProductPath,
  buildProductUrl,
  categoryFaq,
  DEFAULT_SITE_URL,
  isProductUuid,
  normalizeSiteUrl,
  shouldNoindexCatalogQuery,
  SITE_NAME,
} from "./seo.ts";
import { buildGoogleMerchantFeed } from "./seo-merchant-feed.ts";
import {
  collectionJsonLd,
  organizationJsonLd,
  productJsonLd,
  webSiteJsonLd,
} from "./structured-data.ts";

const BASE = "https://mitihome.ae";

test("SEO URL helpers normalize base URLs and product slugs", () => {
  assert.equal(SITE_NAME, "Miti Home");
  assert.equal(DEFAULT_SITE_URL, BASE);
  assert.equal(normalizeSiteUrl(`${BASE}/`), BASE);
  assert.equal(buildAbsoluteUrl("/shop/lighting", `${BASE}/`), `${BASE}/shop/lighting`);
  assert.equal(buildProductPath("moai-tissue-box-silver"), "/product/moai-tissue-box-silver");
  assert.equal(buildProductUrl("moai-tissue-box-silver", `${BASE}/`), `${BASE}/product/moai-tissue-box-silver`);
});

test("SEO URL helpers identify UUID product URLs separately from slugs", () => {
  assert.equal(isProductUuid("3f0f2a6a-1c8a-4b38-a6da-2450a03f23bb"), true);
  assert.equal(isProductUuid("moai-tissue-box-silver"), false);
});

test("catalog query duplicate policy noindexes search, filter and sort variants only", () => {
  assert.equal(shouldNoindexCatalogQuery(new URLSearchParams()), false);
  assert.equal(shouldNoindexCatalogQuery(new URLSearchParams("search=vase")), true);
  assert.equal(shouldNoindexCatalogQuery(new URLSearchParams("color=Silver")), true);
  assert.equal(shouldNoindexCatalogQuery(new URLSearchParams("sort=price-asc")), true);
  assert.equal(shouldNoindexCatalogQuery(new URLSearchParams("utm_source=instagram")), false);
});

test("category FAQ answers UAE delivery, VAT and COD questions", () => {
  const faq = categoryFaq("Lighting");
  assert.equal(faq.length, 3);
  assert.match(faq[0].question, /lighting/);
  assert.match(faq[1].answer, /AED/);
  assert.match(faq[1].answer, /VAT/);
});

test("structured data uses Miti Home organization, search, product and collection URLs in AED", () => {
  const organization = organizationJsonLd(BASE);
  const website = webSiteJsonLd(BASE);
  const product = productJsonLd(BASE, {
    id: "3f0f2a6a-1c8a-4b38-a6da-2450a03f23bb",
    slug: "moai-tissue-box-silver",
    sku: null,
    name: "Moai Tissue Box",
    description: "Silver-plated ceramic tissue box.",
    images: ["/products/moai-tissue-box-silver/1.webp"],
    sellingPrice: "239",
    mrp: "239",
    stock: 4,
    category: "home-decor",
    categoryName: "Home Décor",
    material: "Silver-plated ceramic",
    sizes: ["Standard"],
    colors: [],
    updatedAt: new Date("2026-09-18T00:00:00.000Z"),
  });
  const collection = collectionJsonLd(BASE, {
    name: "The Silver Edit",
    description: "Mirror-finish pieces.",
    url: "/collections/the-silver-edit",
    products: [{ name: "Moai Tissue Box", slug: "moai-tissue-box-silver", image: "/products/moai-tissue-box-silver/1.webp", sellingPrice: "239" }],
  });

  assert.equal(organization["@type"], "OnlineStore");
  assert.equal(organization.name, "Miti Home");
  assert.equal(organization.address.addressLocality, "Dubai");
  assert.equal(organization.address.addressCountry, "AE");
  assert.equal(website.potentialAction.target.urlTemplate, `${BASE}/shop?search={search_term_string}`);
  assert.equal(product.offers.priceCurrency, "AED");
  assert.equal(product.offers.url, `${BASE}/product/moai-tissue-box-silver`);
  assert.equal(product.sku, "moai-tissue-box-silver");
  assert.equal(product.material, "Silver-plated ceramic");
  assert.equal("size" in product, false, "the Standard option is not exposed as a size");
  assert.equal(product.offers.hasMerchantReturnPolicy.applicableCountry, "AE");
  assert.equal(product.offers.priceValidUntil, "2027-09-18");
  assert.equal(collection.mainEntity.itemListElement[0].url, `${BASE}/product/moai-tissue-box-silver`);
  assert.equal(collection.mainEntity.itemListElement[0].offers.priceCurrency, "AED");
});

test("merchant feed serializes active products with slug links, AED prices and no invented review data", () => {
  const feed = buildGoogleMerchantFeed({
    baseUrl: BASE,
    updatedAt: new Date("2026-09-18T00:00:00.000Z"),
    products: [
      {
        id: "3f0f2a6a-1c8a-4b38-a6da-2450a03f23bb",
        slug: "glass-dome-propagation-vase",
        sku: "MH-VASE-01",
        name: "Glass Dome Propagation Vase",
        description: "Ribbed vessel under a bell dome.",
        images: ["/products/glass-dome-propagation-vase/1.webp", "/products/glass-dome-propagation-vase/2.webp"],
        sellingPrice: "99",
        mrp: "129",
        stock: 4,
        category: "home-decor",
        categoryName: "Home Décor",
        material: "Glass",
      },
    ],
  });

  assert.match(feed, /<g:id>MH-VASE-01<\/g:id>/);
  assert.match(feed, /<link>https:\/\/mitihome\.ae\/product\/glass-dome-propagation-vase<\/link>/);
  assert.match(feed, /<g:price>129\.00 AED<\/g:price>/);
  assert.match(feed, /<g:sale_price>99\.00 AED<\/g:sale_price>/);
  assert.match(feed, /<g:additional_image_link>/);
  assert.match(feed, /<g:country>AE<\/g:country>/);
  assert.match(feed, /Home &amp;amp; Garden|Home &amp; Garden/);
  assert.doesNotMatch(feed, /review|rating|INR|Apparel/i);
});
