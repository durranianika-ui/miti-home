import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ListingPage } from "@/components/features/listing-page"
import { BRAND } from "@/lib/brand"
import { buildCategoryPath } from "@/lib/public-cache"
import { categoryFaq } from "@/lib/seo"
import { getCategoryBySlug, getNavigationCategories } from "@/lib/taxonomy"

type Props = { params: Promise<{ category: string }> }

export async function generateStaticParams() {
    try {
        const categories = await getNavigationCategories()
        return categories.map((category) => ({ category: category.slug }))
    } catch {
        return []
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { category: slug } = await params
    const category = await getCategoryBySlug(slug)

    if (!category) {
        return { title: "Category not found", robots: { index: false, follow: false } }
    }

    const title = category.seoTitle || category.name
    const description = category.seoDescription || category.description || `Shop ${category.name} at ${BRAND.name}.`
    return {
        title,
        description,
        alternates: { canonical: buildCategoryPath(category.slug) },
        openGraph: {
            title: `${title} | ${BRAND.name}`,
            description,
            url: buildCategoryPath(category.slug),
            ...(category.image ? { images: [{ url: category.image, alt: category.name }] } : {}),
        },
    }
}

export default async function CategoryPage({ params }: Props) {
    const { category: slug } = await params
    const category = await getCategoryBySlug(slug)
    if (!category) notFound()

    return (
        <ListingPage
            title={category.name}
            eyebrow="Shop by category"
            subtitle={category.description ?? undefined}
            scope={{ category: category.slug }}
            breadcrumbs={[
                { name: "Home", url: "/" },
                { name: "Shop", url: "/shop" },
                { name: category.name, url: buildCategoryPath(category.slug) },
            ]}
            faq={categoryFaq(category.name)}
        />
    )
}
