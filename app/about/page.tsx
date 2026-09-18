import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { JsonLd, breadcrumbJsonLd, organizationJsonLd, webSiteJsonLd } from "@/components/seo/structured-data"
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/scroll-reveal"
import { BRAND } from "@/lib/brand"
import { normalizeSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
    title: "Our Story",
    description: `${BRAND.name} is a ${BRAND.city}-based home lifestyle brand curating beautiful, useful and unexpected products for modern living — décor, lighting, smart storage and entertaining essentials, delivered across the UAE.`,
    alternates: {
        canonical: "/about",
    },
    openGraph: {
        title: `Our Story | ${BRAND.name}`,
        description: `${BRAND.promise} A ${BRAND.city}-based home lifestyle brand curating beautiful, useful and unexpected products for modern living.`,
        url: "/about",
    },
}

const whatWeDo = [
    { title: "We discover", body: "We research global trends, makers and products to find pieces worth bringing home." },
    { title: "We curate", body: "We select only what meets our standards of beauty, quality and usefulness." },
    {
        title: "We create experience",
        body: "From our website to our packaging, every touchpoint is designed to feel considered and luxurious.",
    },
    { title: "We deliver", body: `Fast, reliable delivery across ${BRAND.city} and the UAE.` },
]

const whatWeSell = [
    {
        title: "Home Décor",
        href: "/shop/home-decor",
        image: "/products/deer-family-sculpture-set/2.webp",
        alt: "Three polished silver deer sculptures of different heights in a warmly lit alcove",
    },
    {
        title: "Lighting",
        href: "/shop/lighting",
        image: "/products/teardrop-smoked-glass-pendant/1.webp",
        alt: "Teardrop smoked glass pendant light hanging beside a grey upholstered bed",
    },
    {
        title: "Smart Storage & Organisation",
        href: "/shop/smart-storage",
        image: "/products/vanity-tissue-tray-organiser/1.webp",
        alt: "Cream leather vanity tray with built-in tissue box holding perfume bottles and a diffuser",
    },
    {
        title: "Home Entertainment",
        href: "/shop/home-entertainment",
        image: "/products/kinetic-perpetual-motion-sculpture/1.webp",
        alt: "Brushed silver kinetic perpetual-motion sculpture on a black base",
    },
    {
        title: "Why Didn't I Have This Before?",
        href: "/shop/clever-finds",
        image: "/products/astronaut-digital-clock/1.webp",
        alt: "White astronaut figure with a mirrored helmet holding a digital clock on a desk",
    },
]

const processSteps = [
    { title: "Research", body: "Global trends, makers and materials." },
    { title: "Shortlist", body: "Only pieces that are beautiful, useful or unexpected." },
    { title: "Sample & test", body: "Each piece is sampled and checked for quality." },
    { title: "Launch", body: "Photographed, described and introduced with care." },
    { title: "Measure & scale", body: "We listen to what you love and grow from there." },
]

const whyMiti = [
    "Curated, not crowded",
    "Design-led and lifestyle-focused",
    "Quality over quantity",
    "Unique and unexpected finds",
    "Strong content and community",
    "A luxury experience at every touchpoint",
]

const whatWeDont = [
    "We don't sell everything",
    "We don't compete on price",
    "We don't compromise on quality",
    "We don't follow trends blindly",
    "We don't look like generic stores",
]

const ourCustomer = [
    { title: "Design conscious", body: "Notices the details, and cares how a room looks and feels." },
    { title: "Modern lifestyle", body: "Wants a home that works as beautifully as it looks." },
    { title: "Experience seekers", body: "Enjoys discovery, hosting and the small rituals of home." },
    { title: "Value quality", body: "Would rather own fewer, better things." },
]

const eyebrow = "font-heading text-[10px] font-medium uppercase tracking-[0.34em] text-brand-strong"

function BrandRule({ className = "" }: { className?: string }) {
    return (
        <div className={`brand-rule w-40 text-[10px] ${className}`}>
            <span className="h-1.5 w-1.5 rotate-45 bg-brand" />
        </div>
    )
}

export default function AboutPage() {
    const baseUrl = normalizeSiteUrl()

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <JsonLd
                data={breadcrumbJsonLd(baseUrl, [
                    { name: "Home", url: "/" },
                    { name: "Our Story", url: "/about" },
                ])}
            />
            <JsonLd
                data={{
                    "@context": "https://schema.org",
                    "@graph": [organizationJsonLd(baseUrl), webSiteJsonLd(baseUrl)],
                }}
            />

            {/* Hero */}
            <section className="px-4 pb-16 pt-16 sm:px-6 md:px-12 md:pb-24 md:pt-24">
                <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2 md:gap-16">
                    <div>
                        <p className={eyebrow}>Our story</p>
                        <h1 className="font-display mt-6 text-4xl leading-[1.1] sm:text-5xl md:text-6xl">
                            {BRAND.promise}
                        </h1>
                        <BrandRule className="mt-10" />
                        <p className="mt-10 max-w-lg text-base leading-8 text-muted-foreground">
                            {BRAND.name} is a {BRAND.city}-based home lifestyle brand that curates beautiful, useful and
                            unexpected products for modern living. We discover the finest pieces for your home — from
                            statement décor and unique lighting to smart storage solutions and entertaining essentials —
                            to help you create beautiful spaces and a better you.
                        </p>
                    </div>
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
                        <Image
                            src="/products/resting-figures-sculpture-pair/1.webp"
                            alt="Two abstract ceramic figure sculptures, one sand and one terracotta, resting against a stack of books in dappled light"
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            priority
                            className="object-cover"
                        />
                    </div>
                </div>
            </section>

            {/* Brand statement */}
            <section className="bg-secondary px-4 py-16 sm:px-6 md:px-12 md:py-28">
                <ScrollReveal className="mx-auto max-w-4xl text-center">
                    <p className={eyebrow}>Our brand</p>
                    <p className="font-display mt-8 text-3xl leading-snug md:text-5xl md:leading-tight">
                        Modern luxury living — warm, calm and timeless.
                    </p>
                    <p className="font-display-caps mt-8 text-xs text-muted-foreground md:text-sm">
                        Not just a store. A lifestyle.
                    </p>
                </ScrollReveal>
            </section>

            {/* What we do */}
            <section className="px-4 py-16 sm:px-6 md:px-12 md:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="max-w-2xl">
                        <p className={eyebrow}>What we do</p>
                        <h2 className="font-display mt-5 text-3xl leading-tight md:text-5xl">
                            Every piece is found, chosen and delivered with intent
                        </h2>
                    </div>
                    <StaggerContainer className="mt-12 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
                        {whatWeDo.map((item, index) => (
                            <StaggerItem key={item.title} className="bg-background p-6 md:p-8">
                                <p className="font-heading text-[11px] tabular-nums tracking-[0.1em] text-brand-strong">
                                    {String(index + 1).padStart(2, "0")}
                                </p>
                                <h3 className="font-heading mt-6 text-[12px] font-medium uppercase tracking-[0.24em]">
                                    {item.title}
                                </h3>
                                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.body}</p>
                            </StaggerItem>
                        ))}
                    </StaggerContainer>
                </div>
            </section>

            {/* What we sell */}
            <section className="border-t border-border px-4 py-16 sm:px-6 md:px-12 md:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                        <div className="max-w-2xl">
                            <p className={eyebrow}>What we sell</p>
                            <h2 className="font-display mt-5 text-3xl leading-tight md:text-5xl">
                                Beautiful, useful and unexpected
                            </h2>
                        </div>
                        <Link
                            href="/shop"
                            className="inline-flex items-center gap-1.5 font-heading text-[10px] uppercase tracking-[0.22em] text-brand-strong underline-offset-4 hover:underline"
                        >
                            Shop everything <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                    </div>
                    <StaggerContainer className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-5">
                        {whatWeSell.map((category) => (
                            <StaggerItem key={category.href}>
                                <Link href={category.href} className="group block">
                                    <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                                        <Image
                                            src={category.image}
                                            alt={category.alt}
                                            fill
                                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                                        />
                                    </div>
                                    <h3 className="font-heading mt-4 text-[11px] font-medium uppercase leading-5 tracking-[0.2em] transition-colors duration-300 group-hover:text-brand-strong">
                                        {category.title}
                                    </h3>
                                </Link>
                            </StaggerItem>
                        ))}
                    </StaggerContainer>
                </div>
            </section>

            {/* Our process */}
            <section className="bg-neutral-950 px-4 py-16 text-neutral-50 sm:px-6 md:px-12 md:py-24">
                <div className="mx-auto max-w-7xl">
                    <p className="font-heading text-[10px] font-medium uppercase tracking-[0.34em] text-brand">
                        Our process
                    </p>
                    <h2 className="font-display mt-5 max-w-2xl text-3xl leading-tight md:text-5xl">
                        From discovery to your door
                    </h2>
                    <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
                        {processSteps.map((step, index) => (
                            <li key={step.title} className="border-t border-white/20 pt-6">
                                <p className="font-heading text-[11px] tabular-nums tracking-[0.1em] text-brand">
                                    {String(index + 1).padStart(2, "0")}
                                </p>
                                <h3 className="font-heading mt-4 text-[12px] font-medium uppercase tracking-[0.22em]">
                                    {step.title}
                                </h3>
                                <p className="mt-3 text-sm leading-7 text-white/70">{step.body}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* Why Miti Home / what we don't do */}
            <section className="px-4 py-16 sm:px-6 md:px-12 md:py-24">
                <div className="mx-auto grid max-w-7xl gap-16 md:grid-cols-2 md:gap-20">
                    <ScrollReveal>
                        <p className={eyebrow}>Why {BRAND.name}</p>
                        <h2 className="font-display mt-5 text-3xl leading-tight md:text-4xl">What we stand for</h2>
                        <ul className="mt-10 divide-y divide-border border-y border-border">
                            {whyMiti.map((item) => (
                                <li key={item} className="flex items-center gap-4 py-4 text-base">
                                    <span aria-hidden="true" className="h-1.5 w-1.5 flex-shrink-0 rotate-45 bg-brand" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </ScrollReveal>
                    <ScrollReveal delay={0.08}>
                        <p className={eyebrow}>By design</p>
                        <h2 className="font-display mt-5 text-3xl leading-tight md:text-4xl">What we don&apos;t do</h2>
                        <ul className="mt-10 divide-y divide-border border-y border-border">
                            {whatWeDont.map((item) => (
                                <li key={item} className="py-4 text-base text-muted-foreground">
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </ScrollReveal>
                </div>
            </section>

            {/* Our customer */}
            <section className="border-t border-border bg-secondary px-4 py-16 sm:px-6 md:px-12 md:py-24">
                <div className="mx-auto max-w-7xl">
                    <p className={eyebrow}>Who we curate for</p>
                    <h2 className="font-display mt-5 max-w-2xl text-3xl leading-tight md:text-5xl">
                        For people who care how home feels
                    </h2>
                    <StaggerContainer className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                        {ourCustomer.map((trait) => (
                            <StaggerItem key={trait.title}>
                                <h3 className="font-heading text-[12px] font-medium uppercase tracking-[0.22em]">
                                    {trait.title}
                                </h3>
                                <p className="mt-3 text-sm leading-7 text-muted-foreground">{trait.body}</p>
                            </StaggerItem>
                        ))}
                    </StaggerContainer>
                </div>
            </section>

            {/* Vision & mission */}
            <section className="px-4 py-16 sm:px-6 md:px-12 md:py-28">
                <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-2 md:gap-20">
                    <ScrollReveal>
                        <p className={eyebrow}>Our vision</p>
                        <p className="font-display mt-6 text-2xl leading-snug md:text-3xl">{BRAND.vision}</p>
                    </ScrollReveal>
                    <ScrollReveal delay={0.08}>
                        <p className={eyebrow}>Our mission</p>
                        <p className="font-display mt-6 text-2xl leading-snug md:text-3xl">{BRAND.mission}</p>
                    </ScrollReveal>
                </div>
            </section>

            {/* Close */}
            <section className="border-t border-border px-4 py-16 sm:px-6 md:px-12 md:py-24">
                <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
                    <BrandRule />
                    <p className="font-display-caps mt-8 text-lg md:text-2xl">{BRAND.signOff}</p>
                    <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                        <Link
                            href="/shop"
                            className="inline-flex h-12 items-center justify-center bg-foreground px-7 font-heading text-[11px] uppercase tracking-[0.22em] text-background transition-colors duration-300 hover:bg-brand hover:text-neutral-950"
                        >
                            Explore the collection
                        </Link>
                        <Link
                            href="/contact"
                            className="inline-flex h-12 items-center justify-center border border-foreground px-7 font-heading text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors duration-300 hover:border-brand hover:bg-brand hover:text-neutral-950"
                        >
                            Contact us
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}
