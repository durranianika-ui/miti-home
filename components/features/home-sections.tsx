"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef } from "react"
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion"
import { ArrowRight, Heart, House, Leaf, ShoppingBag } from "lucide-react"
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal"
import { SectionHeading } from "@/components/features/product-grid"
import { ViewportPrefetchLink } from "@/components/ui/viewport-prefetch-link"
import { normalizeProductImage } from "@/lib/image"
import { cn } from "@/lib/utils"

export type CategoryTile = {
    href: string
    name: string
    description?: string | null
    image: string | null
    count: number
}

/** Shop by Category — image-led tiles built from the live taxonomy. */
export function CategoryTiles({ categories }: { categories: CategoryTile[] }) {
    if (categories.length === 0) return null
    // A tall lead tile only when the remaining tiles fill complete 2-up rows beside it.
    const featureFirst = categories.length % 2 === 1 && categories.length > 1

    return (
        <section className="bg-background px-5 py-16 md:px-12 md:py-24">
            <ScrollReveal>
                <SectionHeading eyebrow="Shop by category" title="Every corner, considered" />
            </ScrollReveal>
            <StaggerContainer
                amount={0.05}
                className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-3"
            >
                {categories.map((category, index) => (
                    <StaggerItem
                        key={category.href}
                        className={cn(
                            "w-[70vw] max-w-[320px] flex-none snap-start sm:w-auto sm:max-w-none",
                            featureFirst && index === 0 && "lg:row-span-2",
                        )}
                    >
                        <ViewportPrefetchLink href={category.href} className="group relative block h-full overflow-hidden bg-muted">
                            <div className={cn("relative aspect-[4/5] sm:aspect-[5/4]", featureFirst && index === 0 && "lg:aspect-auto lg:h-full lg:min-h-[36rem]")}>
                                <Image
                                    src={normalizeProductImage(category.image)}
                                    alt=""
                                    fill
                                    sizes="(max-width: 640px) 70vw, (max-width: 1024px) 50vw, 33vw"
                                    className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.05]"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white md:p-7">
                                    <div>
                                        <h3 className="font-display text-xl leading-tight md:text-2xl">{category.name}</h3>
                                        <p className="mt-1.5 font-heading text-[10px] uppercase tracking-[0.24em] text-white/75">
                                            {category.count} {category.count === 1 ? "piece" : "pieces"}
                                        </p>
                                    </div>
                                    <span className="flex h-10 w-10 flex-none translate-x-1 items-center justify-center rounded-full border border-white/40 opacity-80 transition-all duration-500 group-hover:translate-x-0 group-hover:border-brand group-hover:bg-brand group-hover:text-neutral-950 group-hover:opacity-100">
                                        <ArrowRight className="h-4 w-4" />
                                    </span>
                                </div>
                            </div>
                        </ViewportPrefetchLink>
                    </StaggerItem>
                ))}
            </StaggerContainer>
        </section>
    )
}

/** Editorial collection story — split layout with a gentle parallax on the imagery. */
export function EditorialStory({
    eyebrow,
    title,
    body,
    cta,
    href,
    images,
}: {
    eyebrow: string
    title: string
    body: string
    cta: string
    href: string
    images: { src: string; alt: string }[]
}) {
    const ref = useRef<HTMLElement>(null)
    const shouldReduceMotion = useReducedMotion()
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
    const lift = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [60, -60])

    return (
        <section ref={ref} className="border-t border-border/60 bg-background px-5 py-16 md:px-12 md:py-28">
            <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
                <div className="grid grid-cols-[1.25fr_1fr] items-start gap-3 md:gap-5">
                    <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                        <Image src={images[0]?.src} alt={images[0]?.alt ?? ""} fill sizes="(max-width: 1024px) 55vw, 35vw" className="object-cover" />
                    </div>
                    <motion.div style={{ y: lift }} className="relative mt-16 aspect-[3/4] overflow-hidden bg-muted md:mt-28">
                        <Image src={images[1]?.src ?? images[0]?.src} alt={images[1]?.alt ?? ""} fill sizes="(max-width: 1024px) 45vw, 25vw" className="object-cover" />
                    </motion.div>
                </div>
                <ScrollReveal className="max-w-md">
                    <p className="mb-5 font-heading text-[10px] font-medium uppercase tracking-[0.34em] text-brand-strong">{eyebrow}</p>
                    <h2 className="font-display text-4xl leading-[1.08] md:text-6xl">{title}</h2>
                    <div className="brand-rule my-8 w-40 text-[10px]"><span className="h-1.5 w-1.5 rotate-45 bg-brand" /></div>
                    <p className="text-base leading-8 text-muted-foreground">{body}</p>
                    <Link
                        href={href}
                        className="group mt-10 inline-flex h-12 items-center gap-3 bg-foreground px-7 font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-background transition-colors duration-500 hover:bg-brand hover:text-neutral-950"
                    >
                        {cta}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" />
                    </Link>
                </ScrollReveal>
            </div>
        </section>
    )
}

/** Full-bleed lifestyle banner with a slow parallax zoom. */
export function LifestyleBanner({
    image,
    alt,
    eyebrow,
    title,
    cta,
    href,
}: {
    image: string
    alt: string
    eyebrow: string
    title: string
    cta: string
    href: string
}) {
    const ref = useRef<HTMLElement>(null)
    const shouldReduceMotion = useReducedMotion()
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
    const y = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? ["0%", "0%"] : ["-5%", "5%"])
    const scale = useTransform(scrollYProgress, [0, 0.5, 1], shouldReduceMotion ? [1, 1, 1] : [1.2, 1.13, 1.2])

    return (
        <section ref={ref} className="relative h-[78svh] min-h-[480px] overflow-hidden bg-[#2a2622] md:h-[92svh]">
            <motion.div style={{ y, scale }} className="absolute inset-0 will-change-transform">
                <Image src={image} alt={alt} fill sizes="100vw" className="object-cover" />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/10" />
            <div className="relative z-10 flex h-full flex-col items-center justify-end px-6 pb-16 text-center text-white md:pb-24">
                <ScrollReveal>
                    <p className="mb-5 font-heading text-[10px] font-medium uppercase tracking-[0.4em] text-[#e9dcc0]">{eyebrow}</p>
                    <h2 className="font-display-caps mx-auto max-w-[18ch] text-3xl leading-[1.2] md:text-5xl">{title}</h2>
                    <Link
                        href={href}
                        className="group mt-10 inline-flex h-12 items-center gap-3 border border-white/50 px-7 font-heading text-[11px] font-medium uppercase tracking-[0.22em] transition-colors duration-500 hover:border-brand hover:bg-brand hover:text-neutral-950"
                    >
                        {cta}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" />
                    </Link>
                </ScrollReveal>
            </div>
        </section>
    )
}

const PILLAR_ICONS = [House, ShoppingBag, Heart, Leaf]

/** The Miti Home brand story — pillars from the brand book. */
export function BrandStory({
    title,
    body,
    pillars,
}: {
    title: string
    body: string
    pillars: readonly { title: string; body: string }[]
}) {
    return (
        <section className="border-t border-border/60 bg-background px-5 py-16 md:px-12 md:py-28">
            <div className="mx-auto max-w-6xl">
                <ScrollReveal className="mx-auto max-w-3xl text-center">
                    <p className="mb-5 font-heading text-[10px] font-medium uppercase tracking-[0.34em] text-brand-strong">Our story</p>
                    <h2 className="font-display text-3xl leading-tight md:text-5xl">{title}</h2>
                    <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-muted-foreground">{body}</p>
                </ScrollReveal>
                <StaggerContainer className="mt-14 grid grid-cols-2 gap-px overflow-hidden border border-border/70 bg-border/70 md:mt-20 lg:grid-cols-4">
                    {pillars.map((pillar, index) => {
                        const Icon = PILLAR_ICONS[index % PILLAR_ICONS.length]
                        return (
                            <StaggerItem key={pillar.title} className="flex flex-col items-center gap-4 bg-background px-4 py-8 text-center md:px-8 md:py-10">
                                <Icon className="h-6 w-6 stroke-[1.25] text-brand" aria-hidden="true" />
                                <h3 className="font-heading text-[11px] font-medium uppercase tracking-[0.22em]">{pillar.title}</h3>
                                <p className="text-sm leading-6 text-muted-foreground">{pillar.body}</p>
                            </StaggerItem>
                        )
                    })}
                </StaggerContainer>
                <div className="mt-12 text-center">
                    <Link
                        href="/about"
                        className="group inline-flex items-center gap-2 border-b border-foreground/25 pb-1 font-heading text-[11px] font-medium uppercase tracking-[0.2em] transition-colors duration-500 hover:border-brand hover:text-brand-strong"
                    >
                        Read our story
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" />
                    </Link>
                </div>
            </div>
        </section>
    )
}
