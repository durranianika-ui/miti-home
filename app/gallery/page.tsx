import type { Metadata } from "next";
import { GalleryClient, type MitiGalleryItem } from "@/components/features/gallery-client";
import { JsonLd, breadcrumbJsonLd, collectionJsonLd } from "@/components/seo/structured-data";
import { BRAND } from "@/lib/brand";
import { getCatalogProducts } from "@/lib/product-catalog";
import { normalizeProductImage } from "@/lib/image";
import { buildProductPath, normalizeSiteUrl } from "@/lib/seo";
import { getCategoryNameMap } from "@/lib/taxonomy";

const GALLERY_TITLE = `The Gallery — ${BRAND.name}`;
const GALLERY_DESCRIPTION = `Wander through the ${BRAND.name} collection: sculptural décor, ambient lighting, smart storage and unexpected finds for modern living, delivered across the UAE.`;

export const metadata: Metadata = {
  title: "The Gallery",
  description: GALLERY_DESCRIPTION,
  alternates: {
    canonical: "/gallery",
  },
  openGraph: {
    title: GALLERY_TITLE,
    description: GALLERY_DESCRIPTION,
    url: "/gallery",
  },
};

export default async function GalleryPage() {
  const baseUrl = normalizeSiteUrl();
  const [{ products }, categoryNames] = await Promise.all([
    getCatalogProducts({ limit: 24 }),
    getCategoryNameMap(),
  ]);

  const galleryItems: MitiGalleryItem[] = products.map((product) => ({
    id: product.id,
    title: product.name,
    src: normalizeProductImage(product.images[0]),
    href: buildProductPath(product.slug),
    price: product.sellingPrice,
    category: categoryNames.get(product.category),
  }));

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(baseUrl, [
          { name: "Home", url: "/" },
          { name: "Gallery", url: "/gallery" },
        ])}
      />
      <JsonLd
        data={collectionJsonLd(baseUrl, {
          name: GALLERY_TITLE,
          description: GALLERY_DESCRIPTION,
          url: "/gallery",
          products: products.map((product) => ({
            name: product.name,
            slug: product.slug,
            image: product.images[0],
            sellingPrice: product.sellingPrice,
          })),
        })}
      />
      <h1 className="sr-only">{GALLERY_TITLE}</h1>
      <GalleryClient items={galleryItems} />
    </>
  );
}
