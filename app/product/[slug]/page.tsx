import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import { ProductClient } from "@/components/features/product-client"
import { getActiveProductStaticParams, getProductDetailsBySlugOrId } from "@/lib/product-detail"
import { buildCategoryPath } from "@/lib/public-cache"
import { buildProductPath, DEFAULT_OG_IMAGE, isProductUuid, normalizeSiteUrl, SITE_NAME } from "@/lib/seo"
import { formatPrice } from "@/lib/money"
import { CURRENCY } from "@/lib/constants"
import {
    JsonLd,
    productJsonLd,
    breadcrumbJsonLd,
} from "@/components/seo/structured-data"

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
    try {
        return await getActiveProductStaticParams()
    } catch {
        // No database at build time: product pages render on first request instead.
        return []
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const product = await getProductDetailsBySlugOrId(slug)

    if (product && isProductUuid(slug)) {
        permanentRedirect(buildProductPath(product.slug))
    }

    if (!product) {
        return {
            title: "Piece not found",
            description: "This piece is no longer available.",
            robots: { index: false, follow: false },
        }
    }

    const price = Number(product.sellingPrice)
    const mrp = Number(product.mrp)
    const description =
        product.description ||
        `${product.name}${product.categoryName ? ` — ${product.categoryName.toLowerCase()}` : ""} from ${SITE_NAME}. ${formatPrice(price)}, delivered across the UAE.`

    return {
        title: product.name,
        description,
        alternates: { canonical: buildProductPath(product.slug) },
        openGraph: {
            title: `${product.name} — ${formatPrice(price)} | ${SITE_NAME}`,
            description,
            url: buildProductPath(product.slug),
            type: "website",
            images: product.images?.length
                ? product.images.map((img) => ({ url: img, width: 1200, height: 1200, alt: product.name }))
                : [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
        },
        twitter: {
            card: "summary_large_image",
            title: `${product.name} | ${SITE_NAME}`,
            description,
            images: product.images?.length ? product.images : [DEFAULT_OG_IMAGE],
        },
        other: {
            "product:price:amount": price.toFixed(2),
            "product:price:currency": CURRENCY,
            ...(mrp > price && {
                "product:original_price:amount": mrp.toFixed(2),
                "product:original_price:currency": CURRENCY,
            }),
            "product:availability": product.stock > 0 ? "in stock" : "out of stock",
        },
    }
}

export default async function ProductPage({ params }: Props) {
    const { slug } = await params
    const product = await getProductDetailsBySlugOrId(slug)
    const baseUrl = normalizeSiteUrl()

    if (!product) notFound()

    if (isProductUuid(slug)) {
        permanentRedirect(buildProductPath(product.slug))
    }

    return (
        <>
            <JsonLd
                data={productJsonLd(baseUrl, {
                    name: product.name,
                    description: product.description,
                    images: product.images,
                    sellingPrice: product.sellingPrice,
                    mrp: product.mrp,
                    stock: product.stock,
                    id: product.id,
                    sku: product.sku,
                    slug: product.slug,
                    category: product.category,
                    categoryName: product.categoryName,
                    material: product.material,
                    sizes: product.sizes,
                    colors: product.colors,
                    updatedAt: product.updatedAt,
                })}
            />
            <JsonLd
                data={breadcrumbJsonLd(baseUrl, [
                    { name: "Home", url: "/" },
                    { name: "Shop", url: "/shop" },
                    ...(product.categoryName ? [{ name: product.categoryName, url: buildCategoryPath(product.category) }] : []),
                    { name: product.name, url: buildProductPath(product.slug) },
                ])}
            />
            <ProductClient initialProduct={product} />
        </>
    )
}
