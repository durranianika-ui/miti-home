import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/seo/structured-data"
import { BRAND, CONTACT } from "@/lib/brand"
import {
    COD_ENABLED,
    COD_FEE,
    DELIVERY_ESTIMATE,
    EXCHANGE_WINDOW_DAYS,
    FREE_SHIPPING_THRESHOLD_DISPLAY,
    RETURN_WINDOW_DAYS,
    SHIPPING_FEE,
} from "@/lib/constants"
import { formatPrice } from "@/lib/money"
import { normalizeSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
    title: "Customer Care & Policies",
    description: `Delivery, returns, refunds, exchanges, privacy and terms of sale for ${BRAND.name} — curated home décor delivered across the UAE.`,
    alternates: {
        canonical: "/policies",
    },
    openGraph: {
        title: `Customer Care & Policies | ${BRAND.name}`,
        description: `How ${BRAND.name} delivers, returns, refunds and exchanges across the UAE. Complimentary delivery on orders over ${FREE_SHIPPING_THRESHOLD_DISPLAY}.`,
        url: "/policies",
    },
}

const policies = [
    {
        title: "Delivery",
        description: `Delivery ${DELIVERY_ESTIMATE}. Complimentary on orders over ${FREE_SHIPPING_THRESHOLD_DISPLAY}.`,
        href: "/policies/shipping",
    },
    {
        title: "Returns",
        description: `Changed your mind? Return unused pieces within ${RETURN_WINDOW_DAYS} days of delivery.`,
        href: "/policies/returns",
    },
    {
        title: "Refunds",
        description: "How and when your money comes back — card, cash on delivery or store credit.",
        href: "/policies/refunds",
    },
    {
        title: "Exchanges",
        description: `A different finish or size of the same piece, within ${EXCHANGE_WINDOW_DAYS} days of delivery.`,
        href: "/policies/exchange",
    },
    {
        title: "Privacy",
        description: "What we collect, why we collect it and the choices you have.",
        href: "/policies/privacy",
    },
    {
        title: "Terms of sale",
        description: "Pricing, orders, payment, cancellations and the law that applies.",
        href: "/policies/terms",
    },
    {
        title: "Contact us",
        description: "Speak with our customer care team in Dubai.",
        href: "/contact",
    },
]

export default function PoliciesPage() {
    const baseUrl = normalizeSiteUrl()

    const summary = [
        {
            label: "Delivery",
            text: `${DELIVERY_ESTIMATE}. ${formatPrice(SHIPPING_FEE)} per order, complimentary over ${FREE_SHIPPING_THRESHOLD_DISPLAY}.${
                COD_ENABLED ? ` Cash on delivery available (${formatPrice(COD_FEE)} fee).` : ""
            }`,
        },
        {
            label: "Returns",
            text: `Within ${RETURN_WINDOW_DAYS} days of delivery, unused and in the original packaging.`,
        },
        {
            label: "Refunds",
            text: "To your original card, or by bank transfer or store credit for cash-on-delivery orders.",
        },
        {
            label: "Exchanges",
            text: `Within ${EXCHANGE_WINDOW_DAYS} days for a different finish or size of the same piece, subject to availability.`,
        },
    ]

    return (
        <div className="min-h-screen bg-background">
            <JsonLd
                data={breadcrumbJsonLd(baseUrl, [
                    { name: "Home", url: "/" },
                    { name: "Customer Care", url: "/policies" },
                ])}
            />
            <JsonLd
                data={faqJsonLd([
                    {
                        question: `Where does ${BRAND.name} deliver?`,
                        answer: `We deliver across the United Arab Emirates, ${DELIVERY_ESTIMATE}. Delivery is ${formatPrice(SHIPPING_FEE)} per order and complimentary on orders over ${FREE_SHIPPING_THRESHOLD_DISPLAY}.`,
                    },
                    {
                        question: `What is ${BRAND.name}'s return policy?`,
                        answer: `Unused items in their original packaging can be returned within ${RETURN_WINDOW_DAYS} days of delivery. Items marked final sale, personalised or made-to-order pieces and opened hygiene items cannot be returned.`,
                    },
                    {
                        question: "How are refunds paid?",
                        answer: "Card payments are refunded to the original card. Cash-on-delivery orders are refunded by bank transfer or as single-use store credit — the choice is yours.",
                    },
                    {
                        question: `Can I exchange an item?`,
                        answer: `Yes — within ${EXCHANGE_WINDOW_DAYS} days of delivery you can exchange a piece for a different finish or size of the same product, subject to stock.`,
                    },
                ])}
            />

            <header className="border-b border-border px-4 py-16 sm:px-6 md:px-12 md:py-24">
                <div className="mx-auto max-w-5xl">
                    <p className="font-heading text-[10px] font-medium uppercase tracking-[0.34em] text-brand-strong">
                        Customer care
                    </p>
                    <h1 className="font-display mt-5 text-4xl leading-tight md:text-6xl">Policies &amp; care</h1>
                    <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
                        The details behind every {BRAND.name} order — written plainly, so you always know what to expect.
                    </p>
                </div>
            </header>

            <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:px-12 md:py-24">
                <ul className="grid grid-cols-1 border-l border-t border-border sm:grid-cols-2">
                    {policies.map((policy) => (
                        <li key={policy.href} className="border-b border-r border-border">
                            <Link
                                href={policy.href}
                                className="group flex h-full flex-col justify-between gap-6 p-6 transition-colors duration-300 hover:bg-secondary md:p-8"
                            >
                                <div>
                                    <h2 className="font-heading text-[11px] font-medium uppercase tracking-[0.26em] text-foreground">
                                        {policy.title}
                                    </h2>
                                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{policy.description}</p>
                                </div>
                                <span className="inline-flex items-center gap-1.5 font-heading text-[10px] uppercase tracking-[0.22em] text-brand-strong">
                                    Read more
                                    <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>

                <section className="mt-16 bg-secondary p-6 md:mt-20 md:p-10" aria-labelledby="summary-heading">
                    <h2
                        id="summary-heading"
                        className="font-heading text-[10px] font-medium uppercase tracking-[0.34em] text-brand-strong"
                    >
                        At a glance
                    </h2>
                    <dl className="mt-6 divide-y divide-border">
                        {summary.map((row) => (
                            <div key={row.label} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-6">
                                <dt className="font-heading text-[11px] uppercase tracking-[0.22em] text-foreground">{row.label}</dt>
                                <dd className="text-sm leading-6 text-muted-foreground">{row.text}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <p className="mt-12 text-xs text-muted-foreground">
                    Questions? Contact us at{" "}
                    <a href={`mailto:${CONTACT.email}`} className="underline underline-offset-4 hover:text-foreground">
                        {CONTACT.email}
                    </a>
                </p>
            </div>
        </div>
    )
}
