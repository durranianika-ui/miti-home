import { BRAND, CONTACT, DEFAULT_SITE_URL as BRAND_SITE_URL } from "./brand.ts";
import {
  CURRENCY,
  DELIVERY_ESTIMATE,
  FREE_SHIPPING_THRESHOLD,
  FREE_SHIPPING_THRESHOLD_DISPLAY,
  SHIPPING_FEE,
} from "./constants.ts";

export const SITE_NAME = BRAND.name;
export const SITE_BRAND_LINE = BRAND.tagline;
export const DEFAULT_SITE_URL = BRAND_SITE_URL;
export const DEFAULT_OG_IMAGE = "/brand/og-image.jpg";

export const SITE_TITLE = `${BRAND.name} | ${BRAND.tagline} — Curated Home Décor & Lifestyle in the UAE`;

export const SITE_DESCRIPTION =
  "Miti Home is a Dubai-based home lifestyle brand curating statement décor, sculptural lighting, smart storage and entertaining essentials — delivered across the UAE.";

export const SEO_CONTACT = {
  email: CONTACT.email,
  phone: CONTACT.phone ?? "",
  locality: BRAND.city,
  region: BRAND.city,
  country: BRAND.countryCode,
  availableLanguage: ["English", "Arabic"],
};

export const SEO_SHIPPING = {
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  standardShippingFee: SHIPPING_FEE,
  currency: CURRENCY,
  country: BRAND.countryCode,
};

export function normalizeSiteUrl(baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_SITE_URL) {
  return baseUrl.replace(/\/+$/, "");
}

export function buildAbsoluteUrl(path: string, baseUrl?: string) {
  const normalizedBase = normalizeSiteUrl(baseUrl);
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${normalizedBase}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildProductPath(slug: string) {
  return `/product/${slug}`;
}

export function buildProductUrl(slug: string, baseUrl?: string) {
  return buildAbsoluteUrl(buildProductPath(slug), baseUrl);
}

export function isProductUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Query parameters that create filtered/sorted variants of a listing. */
export const CATALOG_NOINDEX_PARAMS = new Set([
  "search",
  "size",
  "color",
  "material",
  "category",
  "availability",
  "sort",
  "minPrice",
  "maxPrice",
  "isNew",
  "isFeatured",
]);

export function shouldNoindexCatalogQuery(searchParams: URLSearchParams) {
  for (const key of searchParams.keys()) {
    if (CATALOG_NOINDEX_PARAMS.has(key)) return true;
  }
  return false;
}

/** Shared buying-questions answered on every category page (FAQ rich results). */
export function categoryFaq(categoryName: string) {
  return [
    {
      question: `Do you deliver ${categoryName.toLowerCase()} across the UAE?`,
      answer: `Yes. ${BRAND.name} delivers to all seven emirates, usually ${DELIVERY_ESTIMATE.replace(/ across the UAE$/, "")}. Delivery is complimentary on orders over ${FREE_SHIPPING_THRESHOLD_DISPLAY}.`,
    },
    {
      question: "Are prices inclusive of VAT?",
      answer: "Yes. All prices are shown in UAE dirhams (AED) and include 5% VAT.",
    },
    {
      question: "Can I pay on delivery?",
      answer: "Cash on delivery is available across the UAE for eligible orders. Card payment is offered at checkout when available.",
    },
  ];
}
