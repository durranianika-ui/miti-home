import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/structured-data"
import { BRAND, CONTACT } from "@/lib/brand"
import { RETURN_WINDOW_DAYS } from "@/lib/constants"
import { normalizeSiteUrl } from "@/lib/seo"

const LAST_UPDATED = "18 September 2026"

export const metadata: Metadata = {
    title: "Returns Policy",
    description: `Return unused ${BRAND.name} pieces in their original packaging within ${RETURN_WINDOW_DAYS} days of delivery. Damaged on arrival? Tell us within 48 hours.`,
    alternates: {
        canonical: "/policies/returns",
    },
    openGraph: {
        title: `Returns Policy | ${BRAND.name}`,
        description: `Returns within ${RETURN_WINDOW_DAYS} days of delivery, anywhere in the UAE.`,
        url: "/policies/returns",
    },
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-4">
            <h2 className="font-heading text-[11px] font-medium uppercase tracking-[0.26em] text-foreground">{title}</h2>
            <div className="space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
        </section>
    )
}

function Bullets({ items }: { items: ReactNode[] }) {
    return (
        <ul className="space-y-2">
            {items.map((item, index) => (
                <li key={index} className="flex gap-3">
                    <span aria-hidden="true" className="mt-[0.7em] h-1 w-1 flex-shrink-0 rotate-45 bg-brand" />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    )
}

export default function ReturnsPolicyPage() {
    const baseUrl = normalizeSiteUrl()
    const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent("Return request")}`

    return (
        <div className="min-h-screen bg-background">
            <JsonLd
                data={breadcrumbJsonLd(baseUrl, [
                    { name: "Home", url: "/" },
                    { name: "Customer Care", url: "/policies" },
                    { name: "Returns Policy", url: "/policies/returns" },
                ])}
            />

            <header className="border-b border-border px-4 py-16 sm:px-6 md:px-12 md:py-24">
                <div className="mx-auto max-w-3xl">
                    <Link
                        href="/policies"
                        className="inline-flex items-center gap-1.5 font-heading text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors duration-300 hover:text-foreground"
                    >
                        <ArrowLeft className="h-3 w-3" /> All policies
                    </Link>
                    <p className="mt-10 font-heading text-[10px] font-medium uppercase tracking-[0.34em] text-brand-strong">
                        Policy
                    </p>
                    <h1 className="font-display mt-4 text-4xl leading-tight md:text-6xl">Returns</h1>
                    <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
                        We choose every piece with care, and we want you to love it at home. If it isn&apos;t right, you
                        have {RETURN_WINDOW_DAYS} days from delivery to return it.
                    </p>
                    <p className="mt-6 text-xs text-muted-foreground">Last updated {LAST_UPDATED}</p>
                </div>
            </header>

            <div className="mx-auto max-w-3xl space-y-12 px-4 py-16 sm:px-6 md:px-12 md:py-24">
                <Section title="Your return window">
                    <p>
                        You can return most items within {RETURN_WINDOW_DAYS} days of the date they were delivered. To be
                        accepted, an item must be:
                    </p>
                    <Bullets
                        items={[
                            "Unused, undamaged and in the condition you received it",
                            "In its original packaging, with all inserts, accessories and protective wrapping",
                            "Accompanied by your order number",
                        ]}
                    />
                </Section>

                <Section title="Items we cannot take back">
                    <Bullets
                        items={[
                            "Items marked as final sale",
                            "Personalised, made-to-order or custom-sized pieces",
                            "Hygiene items that have been opened or used — for example bathroom and vanity accessories",
                        ]}
                    />
                    <p>This does not affect your rights if an item arrives damaged, faulty or incorrect.</p>
                </Section>

                <Section title="Damaged, faulty or incorrect items">
                    <p>
                        If something arrives damaged, faulty or is not what you ordered, please tell us within 48 hours of
                        delivery. Email us with your order number and clear photographs of the item and its packaging. We
                        will arrange a replacement, collection or full refund — including any delivery charge — at no cost
                        to you.
                    </p>
                </Section>

                <Section title="How to start a return">
                    <ol className="space-y-3">
                        {[
                            <>
                                Email{" "}
                                <a href={mailto} className="text-foreground underline underline-offset-4">
                                    {CONTACT.email}
                                </a>{" "}
                                with your order number, the item(s) you would like to return and the reason.
                            </>,
                            "We will confirm your return and arrange collection from your address. For change-of-mind returns, we will confirm any collection charge before booking it.",
                            "Pack the item securely in its original packaging, ready for collection.",
                            "Once it reaches us and passes inspection, we process your refund as described in our refunds policy.",
                        ].map((step, index) => (
                            <li key={index} className="grid grid-cols-[2rem_1fr] gap-2">
                                <span className="font-heading text-[11px] tabular-nums tracking-[0.1em] text-brand-strong">
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                                <span>{step}</span>
                            </li>
                        ))}
                    </ol>
                </Section>

                <Section title="Refunds and exchanges">
                    <p>
                        Read how your money is returned in our{" "}
                        <Link href="/policies/refunds" className="text-foreground underline underline-offset-4">
                            refunds policy
                        </Link>
                        , or, if you would prefer a different finish or size, see{" "}
                        <Link href="/policies/exchange" className="text-foreground underline underline-offset-4">
                            exchanges
                        </Link>
                        .
                    </p>
                </Section>

                <p className="border-t border-border pt-8 text-xs text-muted-foreground">
                    Questions? Contact us at{" "}
                    <a href={`mailto:${CONTACT.email}`} className="underline underline-offset-4 hover:text-foreground">
                        {CONTACT.email}
                    </a>
                </p>
            </div>
        </div>
    )
}
