"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal"
import { ProductCard, ProductCardSkeleton, type ProductCardProduct } from "@/components/features/product-card"
import { cn } from "@/lib/utils"

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <section className="bg-background px-5 py-16 md:px-12 md:py-24" aria-hidden="true">
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
                {Array.from({ length: count }).map((_, i) => (
                    <ProductCardSkeleton key={i} className={i >= 6 ? "hidden md:block" : undefined} />
                ))}
            </div>
        </section>
    )
}

export function SectionHeading({
    eyebrow,
    title,
    description,
    align = "center",
}: {
    eyebrow?: string
    title: string
    description?: string
    align?: "center" | "left"
}) {
    return (
        <div className={cn("mb-10 flex flex-col md:mb-14", align === "center" ? "items-center text-center" : "items-start text-left")}>
            {eyebrow && (
                <p className="mb-4 font-heading text-[10px] font-medium uppercase tracking-[0.34em] text-brand-strong">{eyebrow}</p>
            )}
            <h2 className="font-display text-3xl leading-tight sm:text-4xl md:text-5xl">{title}</h2>
            {description && <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">{description}</p>}
        </div>
    )
}

/**
 * Merchandising row/grid for home and editorial sections. Products arrive
 * pre-filtered from the server so the section renders on first paint.
 */
export function ProductGrid({
    title,
    eyebrow,
    description,
    products,
    layout = "grid",
    mobileLimit = 4,
    maxProducts = 8,
    viewAllHref,
    viewAllLabel = "View all",
    hideWhenEmpty = true,
    className,
}: {
    title?: string
    eyebrow?: string
    description?: string
    products: ProductCardProduct[]
    layout?: "grid" | "scroll"
    mobileLimit?: number
    maxProducts?: number
    viewAllHref?: string
    viewAllLabel?: string
    hideWhenEmpty?: boolean
    className?: string
}) {
    const visible = products.slice(0, maxProducts)

    if (visible.length === 0 && hideWhenEmpty) return null

    return (
        <section className={cn("bg-background px-5 py-16 md:px-12 md:py-24", className)}>
            {title && (
                <ScrollReveal>
                    <SectionHeading eyebrow={eyebrow} title={title} description={description} />
                </ScrollReveal>
            )}

            {visible.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">New pieces are on their way.</p>
            ) : layout === "scroll" ? (
                <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 scrollbar-hide md:-mx-12 md:scroll-px-12 md:gap-6 md:px-12">
                    {visible.map((product) => (
                        <div key={product.id} className="w-[62vw] max-w-[300px] flex-none snap-start sm:w-[260px]">
                            <ProductCard product={product} sizes="(max-width: 640px) 62vw, 300px" />
                        </div>
                    ))}
                </div>
            ) : (
                <StaggerContainer amount={0.01} className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-4">
                    {visible.map((product, index) => (
                        <StaggerItem key={product.id} className={index >= mobileLimit ? "hidden md:block" : undefined}>
                            <ProductCard product={product} />
                        </StaggerItem>
                    ))}
                </StaggerContainer>
            )}

            {viewAllHref && visible.length > 0 && (
                <ScrollReveal delay={0.2}>
                    <div className="mt-12 text-center md:mt-14">
                        <Link
                            href={viewAllHref}
                            className="group inline-flex items-center gap-2 border-b border-foreground/25 pb-1 font-heading text-[11px] font-medium uppercase tracking-[0.2em] text-foreground transition-colors duration-500 hover:border-brand hover:text-brand-strong"
                        >
                            {viewAllLabel}
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" />
                        </Link>
                    </div>
                </ScrollReveal>
            )}
        </section>
    )
}
