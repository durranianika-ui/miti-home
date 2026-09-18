import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/structured-data"
import { BRAND, CONTACT } from "@/lib/brand"
import { COD_ENABLED, COD_FEE } from "@/lib/constants"
import { formatPrice } from "@/lib/money"
import { normalizeSiteUrl } from "@/lib/seo"

const LAST_UPDATED = "18 September 2026"

export const metadata: Metadata = {
    title: "Refunds Policy",
    description: `How ${BRAND.name} refunds orders: card payments back to the original card, cash-on-delivery orders by bank transfer or store credit.`,
    alternates: {
        canonical: "/policies/refunds",
    },
    openGraph: {
        title: `Refunds Policy | ${BRAND.name}`,
        description: "Card refunds to the original payment method; cash-on-delivery refunds by bank transfer or store credit.",
        url: "/policies/refunds",
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

export default function RefundsPolicyPage() {
    const baseUrl = normalizeSiteUrl()

    return (
        <div className="min-h-screen bg-background">
            <JsonLd
                data={breadcrumbJsonLd(baseUrl, [
                    { name: "Home", url: "/" },
                    { name: "Customer Care", url: "/policies" },
                    { name: "Refunds Policy", url: "/policies/refunds" },
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
                    <h1 className="font-display mt-4 text-4xl leading-tight md:text-6xl">Refunds</h1>
                    <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
                        Once a return is approved, we refund you promptly and in the way that suits you best.
                    </p>
                    <p className="mt-6 text-xs text-muted-foreground">Last updated {LAST_UPDATED}</p>
                </div>
            </header>

            <div className="mx-auto max-w-3xl space-y-12 px-4 py-16 sm:px-6 md:px-12 md:py-24">
                <Section title="When refunds are issued">
                    <p>
                        We process your refund once the returned item has reached us and passed inspection, or as soon as
                        we have confirmed a damaged, faulty or incorrect item from your photographs. We will email you to
                        confirm the amount and method.
                    </p>
                </Section>

                <Section title="Card payments">
                    <p>
                        Orders paid by card are refunded to the original payment method. Once we have issued the refund,
                        it usually appears on your statement within 5–10 working days, depending on your bank.
                    </p>
                </Section>

                {COD_ENABLED ? (
                    <Section title="Cash on delivery orders">
                        <p>For orders paid in cash on delivery, you choose how you would like to be refunded:</p>
                        <dl className="divide-y divide-border border-y border-border">
                            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                                <dt className="text-sm text-foreground">Bank transfer</dt>
                                <dd>To a UAE bank account in your name. We will ask for the details we need by email.</dd>
                            </div>
                            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                                <dt className="text-sm text-foreground">Store credit</dt>
                                <dd>
                                    A single-use code for the full refund value, linked to your {BRAND.name} account and
                                    redeemable at checkout. We confirm its expiry date when we send it to you.
                                </dd>
                            </div>
                        </dl>
                    </Section>
                ) : null}

                <Section title="Delivery and handling fees">
                    <p>
                        Delivery charges{COD_ENABLED ? ` and the ${formatPrice(COD_FEE)} cash-on-delivery handling fee` : ""}{" "}
                        are non-refundable, except where an item arrived damaged, faulty or was not what you ordered — in
                        which case we refund them in full.
                    </p>
                </Section>

                <Section title="Cancelled orders">
                    <p>
                        If an order is cancelled before dispatch, any payment taken is refunded in full to the original
                        payment method. See our{" "}
                        <Link href="/policies/terms" className="text-foreground underline underline-offset-4">
                            terms of sale
                        </Link>{" "}
                        for how to cancel.
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
