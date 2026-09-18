import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ComboClient } from "@/components/features/combo-client"
import { getActiveComboStaticParams, getComboDetails } from "@/lib/combos"
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/structured-data"
import { normalizeProductImage } from "@/lib/image"
import { formatPrice } from "@/lib/money"
import { SITE_NAME, buildProductPath, normalizeSiteUrl } from "@/lib/seo"

type ComboDetails = NonNullable<Awaited<ReturnType<typeof getComboDetails>>>

async function getCombo(id: string) {
  return getComboDetails(id)
}

// Server-side twins of the pricing helpers in combo-section (a client module).
function comboTitle(combo: ComboDetails) {
  return `${combo.productA.name} & ${combo.productB.name}`
}

function getComboPricing(combo: ComboDetails) {
  const total = Number(combo.productA.sellingPrice) + Number(combo.productB.sellingPrice)
  const saving = Math.min(Math.max(0, Number(combo.discountAmount) || 0), total)
  return { total, saving, setPrice: total - saving }
}

export async function generateStaticParams() {
  return getActiveComboStaticParams()
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const combo = await getCombo(id)

  if (!combo) {
    return {
      title: "Set not available",
      description: `This ${SITE_NAME} set is no longer available.`,
      robots: { index: false, follow: false },
    }
  }

  const { productA, productB } = combo
  const { saving, setPrice } = getComboPricing(combo)
  const name = comboTitle(combo)
  const path = `/combo/${id}`
  const title = `${name} — Complete the Set`
  const description = `${productA.name} and ${productB.name}, curated to sit together. ${formatPrice(setPrice)} as a set${
    saving > 0 ? ` (save ${formatPrice(saving)})` : ""
  }, VAT included, delivered across the UAE by ${SITE_NAME}.`
  const images = [productA.images?.[0], productB.images?.[0]]
    .filter((image): image is string => Boolean(image))
    .map((image) => ({ url: normalizeProductImage(image), alt: name }))

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      ...(images.length > 0 ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
    },
  }
}

export default async function ComboPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const combo = await getCombo(id)

  if (!combo) notFound()

  const baseUrl = normalizeSiteUrl()
  const path = `/combo/${id}`

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(baseUrl, [
            { name: "Home", url: "/" },
            { name: "Shop", url: "/shop" },
            { name: comboTitle(combo), url: path },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: comboTitle(combo),
            url: `${baseUrl}${path}`,
            numberOfItems: 2,
            itemListElement: [combo.productA, combo.productB].map((product, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: product.name,
              url: `${baseUrl}${buildProductPath(product.slug || product.id)}`,
            })),
          },
        ]}
      />

      <ComboClient id={id} initialCombo={combo} />
    </>
  )
}
