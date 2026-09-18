import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ListingPage } from "@/components/features/listing-page"
import { BRAND } from "@/lib/brand"
import { buildCollectionPath } from "@/lib/public-cache"
import { getCollectionBySlug, getNavigationCollections } from "@/lib/taxonomy"

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
    try {
        const collections = await getNavigationCollections()
        return collections.map((collection) => ({ slug: collection.slug }))
    } catch {
        return []
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const collection = await getCollectionBySlug(slug)
    if (!collection) return { title: "Collection not found", robots: { index: false, follow: false } }

    const title = collection.seoTitle || collection.name
    const description = collection.seoDescription || collection.description || `The ${collection.name} collection by ${BRAND.name}.`
    return {
        title,
        description,
        alternates: { canonical: buildCollectionPath(collection.slug) },
        openGraph: {
            title: `${title} | ${BRAND.name}`,
            description,
            url: buildCollectionPath(collection.slug),
            ...(collection.image ? { images: [{ url: collection.image, alt: collection.name }] } : {}),
        },
    }
}

export default async function CollectionPage({ params }: Props) {
    const { slug } = await params
    const collection = await getCollectionBySlug(slug)
    if (!collection) notFound()

    return (
        <ListingPage
            title={collection.name}
            eyebrow={collection.eyebrow ?? "Collection"}
            subtitle={collection.description ?? undefined}
            scope={{ collection: collection.slug }}
            breadcrumbs={[
                { name: "Home", url: "/" },
                { name: "Collections", url: "/collections" },
                { name: collection.name, url: buildCollectionPath(collection.slug) },
            ]}
        />
    )
}
