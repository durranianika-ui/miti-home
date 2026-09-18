import { BRAND, SOCIAL_LINKS } from "./brand.ts";
import {
  buildAbsoluteUrl,
  buildProductUrl,
  DEFAULT_OG_IMAGE,
  SEO_CONTACT,
  SEO_SHIPPING,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "./seo.ts";

type CollectionProduct = {
  name: string;
  slug: string;
  image?: string | null;
  sellingPrice?: string | number | null;
};

export function organizationJsonLd(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": `${baseUrl}/#organization`,
    name: SITE_NAME,
    alternateName: `${SITE_NAME} — ${BRAND.tagline}`,
    slogan: BRAND.promise,
    url: baseUrl,
    logo: buildAbsoluteUrl("/brand/miti-home-logo.png", baseUrl),
    image: buildAbsoluteUrl(DEFAULT_OG_IMAGE, baseUrl),
    description: SITE_DESCRIPTION,
    address: {
      "@type": "PostalAddress",
      addressLocality: SEO_CONTACT.locality,
      addressCountry: SEO_CONTACT.country,
    },
    areaServed: {
      "@type": "Country",
      name: BRAND.country,
    },
    currenciesAccepted: SEO_SHIPPING.currency,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: SEO_CONTACT.email,
      ...(SEO_CONTACT.phone ? { telephone: SEO_CONTACT.phone } : {}),
      availableLanguage: SEO_CONTACT.availableLanguage,
      areaServed: SEO_CONTACT.country,
    },
    sameAs: SOCIAL_LINKS.map((link) => link.href),
  };
}

export function webSiteJsonLd(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    name: SITE_NAME,
    url: baseUrl,
    inLanguage: "en-AE",
    description: BRAND.shortDescription,
    publisher: { "@id": `${baseUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/shop?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(
  baseUrl: string,
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildAbsoluteUrl(item.url, baseUrl),
    })),
  };
}

export function collectionJsonLd(
  baseUrl: string,
  collection: {
    name: string;
    description: string;
    url: string;
    products?: CollectionProduct[];
  }
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.name,
    description: collection.description,
    url: buildAbsoluteUrl(collection.url, baseUrl),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: baseUrl,
    },
    ...(collection.products?.length
      ? {
          mainEntity: {
            "@type": "ItemList",
            itemListElement: collection.products.map((product, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: product.name,
              url: buildProductUrl(product.slug, baseUrl),
              ...(product.image ? { image: buildAbsoluteUrl(product.image, baseUrl) } : {}),
              ...(product.sellingPrice
                ? {
                    offers: {
                      "@type": "Offer",
                      priceCurrency: SEO_SHIPPING.currency,
                      price: Number(product.sellingPrice).toFixed(2),
                    },
                  }
                : {}),
            })),
          },
        }
      : {}),
  };
}

function priceValidUntil(from = new Date()) {
  const date = new Date(from);
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

export function productJsonLd(
  baseUrl: string,
  product: {
    name: string;
    description?: string | null;
    images?: string[] | null;
    sellingPrice: string;
    mrp: string;
    stock: number;
    id: string;
    sku?: string | null;
    slug: string;
    category: string;
    categoryName?: string | null;
    material?: string | null;
    brand?: string;
    sizes?: string[] | null;
    colors?: { name: string; hex: string }[] | null;
    updatedAt?: Date | null;
  }
) {
  const price = parseFloat(product.sellingPrice);
  const sizes = (product.sizes ?? []).filter((size) => size !== "Standard");

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || `${product.name} — curated by ${SITE_NAME}.`,
    image: product.images?.length
      ? product.images.map((image) => buildAbsoluteUrl(image, baseUrl))
      : [buildAbsoluteUrl(DEFAULT_OG_IMAGE, baseUrl)],
    brand: {
      "@type": "Brand",
      name: product.brand || SITE_NAME,
    },
    sku: product.sku || product.slug,
    mpn: product.slug,
    category: product.categoryName || product.category,
    ...(product.material ? { material: product.material } : {}),
    ...(sizes.length ? { size: sizes } : {}),
    ...(product.colors?.length ? { color: product.colors.map((c) => c.name) } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: SEO_SHIPPING.currency,
      price: price.toFixed(2),
      priceValidUntil: priceValidUntil(product.updatedAt ?? undefined),
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      url: buildProductUrl(product.slug, baseUrl),
      seller: { "@id": `${baseUrl}/#organization` },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: price >= SEO_SHIPPING.freeShippingThreshold ? "0" : String(SEO_SHIPPING.standardShippingFee),
          currency: SEO_SHIPPING.currency,
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: SEO_SHIPPING.country,
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: SEO_SHIPPING.country,
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
        url: buildAbsoluteUrl("/policies/returns", baseUrl),
      },
    },
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
