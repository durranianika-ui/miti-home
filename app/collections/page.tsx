import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/structured-data"
import { StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal"
import { BRAND } from "@/lib/brand"
import { normalizeProductImage } from "@/lib/image"
import { buildCollectionPath } from "@/lib/public-cache"
import { normalizeSiteUrl } from "@/lib/seo"
import { getNavigationCollections } from "@/lib/taxonomy"

export const metadata: Metadata = {
    title: "Collections",
    description: "Editorial edits from Miti Home — The Silver Edit, Sculptural Forms, The Hosting Table and more.",
    alternates: { canonical: "/collections" },
    openGraph: {
        title: `Collections | ${BRAND.name}`,
        description: "Editorial edits from Miti Home.",
        url: "/collections",
    },
}

export default async function CollectionsIndexPage() {
    const collections = await getNavigationCollections()
    const baseUrl = normalizeSiteUrl()

    return (
        <div className="min-h-screen">
            <JsonLd data={breadcrumbJsonLd(baseUrl, [{ name: "Home", url: "/" }, { name: "Collections", url: "/collections" }])} />
            <div className="border-b border-border/60 px-5 py-14 md:px-12 md:py-20">
                <p className="mb-4 font-heading text-[10px] font-medium uppercase tracking-[0.34em] text-brand-strong">Curated edits</p>
                <h1 className="font-display text-4xl leading-[1.05] md:text-6xl">Collections</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                    Stories told in objects — each edit brings together pieces that belong in the same room, the same mood or the same moment.
                </p>
            </div>

            {collections.length === 0 ? (
                <p className="px-5 py-24 text-center text-sm text-muted-foreground">New collections are being curated.</p>
            ) : (
                <StaggerContainer className="grid gap-x-6 gap-y-14 px-5 py-14 sm:grid-cols-2 md:px-12 md:py-20 xl:grid-cols-3">
                    {collections.map((collection, index) => (
                        <StaggerItem key={collection.id}>
                            <Link href={buildCollectionPath(collection.slug)} className="group block">
                                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                                    <Image
                                        src={normalizeProductImage(collection.coverImage)}
                                        alt=""
                                        fill
                                        priority={index < 2}
                                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                                        className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.05]"
                                    />
                                </div>
                                <div className="mt-5 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-brand-strong">
                                            {collection.eyebrow ?? "Collection"} · {collection.productCount} pieces
                                        </p>
                                        <h2 className="mt-2 font-display text-2xl leading-tight md:text-3xl">{collection.name}</h2>
                                        {collection.description && (
                                            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{collection.description}</p>
                                        )}
                                    </div>
                                    <ArrowRight className="mt-6 h-4 w-4 flex-none transition-transform duration-500 group-hover:translate-x-1" />
                                </div>
                            </Link>
                        </StaggerItem>
                    ))}
                </StaggerContainer>
            )}
            <div className="pb-20 text-center">
                <Link href="/shop" className="border-b border-foreground/25 pb-1 font-heading text-[11px] uppercase tracking-[0.2em] hover:border-brand hover:text-brand-strong">
                    Shop everything
                </Link>
            </div>
        </div>
    )
}
