import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/structured-data"
import { BRAND, CONTACT } from "@/lib/brand"
import { EXCHANGE_WINDOW_DAYS } from "@/lib/constants"
import { normalizeSiteUrl } from "@/lib/seo"

const LAST_UPDATED = "18 September 2026"

export const metadata: Metadata = {
    title: "Exchange Policy",
    description: `Exchange a ${BRAND.name} piece for a different finish or size of the same product within ${EXCHANGE_WINDOW_DAYS} days of delivery, subject to stock.`,
    alternates: {
        canonical: "/policies/exchange",
    },
    openGraph: {
        title: `Exchange Policy | ${BRAND.name}`,
        description: `Exchanges within ${EXCHANGE_WINDOW_DAYS} days of delivery for a different finish or size of the same product.`,
        url: "/policies/exchange",
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

export default function ExchangePolicyPage() {
    const baseUrl = normalizeSiteUrl()
    const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent("Exchange request")}`

    return (
        <div className="min-h-screen bg-background">
            <JsonLd
                data={breadcrumbJsonLd(baseUrl, [
                    { name: "Home", url: "/" },
                    { name: "Customer Care", url: "/policies" },
                    { name: "Exchange Policy", url: "/policies/exchange" },
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
                    <h1 className="font-display mt-4 text-4xl leading-tight md:text-6xl">Exchanges</h1>
                    <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
                        Sometimes a piece looks different in your space. Within {EXCHANGE_WINDOW_DAYS} days of delivery,
                        you can exchange it for another finish or size of the same product.
                    </p>
                    <p className="mt-6 text-xs text-muted-foreground">Last updated {LAST_UPDATED}</p>
                </div>
            </header>

            <div className="mx-auto max-w-3xl space-y-12 px-4 py-16 sm:px-6 md:px-12 md:py-24">
                <Section title="What can be exchanged">
                    <p>
                        Exchanges are for a different finish, colour or size of the same product, subject to availability.
                        The item you send back must be unused and in its original packaging, and the same exclusions as
                        our{" "}
                        <Link href="/policies/returns" className="text-foreground underline underline-offset-4">
                            returns policy
                        </Link>{" "}
                        apply — final-sale, personalised or made-to-order pieces and opened hygiene items cannot be
                        exchanged.
                    </p>
                </Section>

                <Section title="If the option you want is unavailable">
                    <p>
                        If the finish or size you would like is out of stock, or you would prefer a different product
                        altogether, we will treat your request as a return and refund you — or issue store credit — as
                        described in our{" "}
                        <Link href="/policies/refunds" className="text-foreground underline underline-offset-4">
                            refunds policy
                        </Link>
                        .
                    </p>
                </Section>

                <Section title="Price differences">
                    <p>
                        Where the new option is priced differently, we will confirm the difference with you before we
                        dispatch it — you pay any balance, and we refund anything owed to you.
                    </p>
                </Section>

                <Section title="How to request an exchange">
                    <p>
                        Email{" "}
                        <a href={mailto} className="text-foreground underline underline-offset-4">
                            {CONTACT.email}
                        </a>{" "}
                        with your order number and the option you would like. We will confirm availability, arrange
                        collection of the original item and send the replacement once it is on its way back to us.
                    </p>
                </Section>

                <Section title="Damaged or incorrect items">
                    <p>
                        If an item arrived damaged or was not what you ordered, please tell us within 48 hours of delivery
                        with photographs. We will replace it at no cost to you.
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
