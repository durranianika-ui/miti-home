import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/structured-data"
import { BRAND, CONTACT, LEGAL } from "@/lib/brand"
import { COD_ENABLED, COD_FEE, COD_MAX_ORDER_TOTAL, PRICES_INCLUDE_VAT, VAT_RATE } from "@/lib/constants"
import { formatPrice } from "@/lib/money"
import { normalizeSiteUrl } from "@/lib/seo"

const LAST_UPDATED = "18 September 2026"

export const metadata: Metadata = {
    title: "Terms of Sale",
    description: `The terms that apply when you use the ${BRAND.name} website and buy from us: pricing in AED, orders, payment, cancellations and governing law.`,
    alternates: {
        canonical: "/policies/terms",
    },
    openGraph: {
        title: `Terms of Sale | ${BRAND.name}`,
        description: `Pricing, orders, payment and cancellations at ${BRAND.name}.`,
        url: "/policies/terms",
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

export default function TermsPage() {
    const baseUrl = normalizeSiteUrl()
    const vatPercent = `${Math.round(VAT_RATE * 1000) / 10}%`
    const identity = [
        LEGAL.tradeLicence ? `Trade licence ${LEGAL.tradeLicence}` : null,
        LEGAL.vatTrn ? `VAT TRN ${LEGAL.vatTrn}` : null,
    ].filter(Boolean)

    return (
        <div className="min-h-screen bg-background">
            <JsonLd
                data={breadcrumbJsonLd(baseUrl, [
                    { name: "Home", url: "/" },
                    { name: "Customer Care", url: "/policies" },
                    { name: "Terms of Sale", url: "/policies/terms" },
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
                    <h1 className="font-display mt-4 text-4xl leading-tight md:text-6xl">Terms of sale</h1>
                    <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
                        These terms apply when you use this website and when you buy from {BRAND.legalName}, based in{" "}
                        {BRAND.city}, {BRAND.country}
                        {identity.length > 0 ? ` (${identity.join(", ")})` : ""}. By placing an order you agree to them.
                    </p>
                    <p className="mt-6 text-xs text-muted-foreground">Last updated {LAST_UPDATED}</p>
                </div>
            </header>

            <div className="mx-auto max-w-3xl space-y-12 px-4 py-16 sm:px-6 md:px-12 md:py-24">
                <Section title="Using our website">
                    <p>
                        You may use this website to browse and buy for personal, non-commercial use. Please keep your
                        account details secure — you are responsible for activity under your account. All content on the
                        site, including photography and text, belongs to {BRAND.name} or its licensors and may not be
                        reused without permission.
                    </p>
                </Section>

                <Section title="Prices">
                    <p>
                        All prices are shown in UAE dirhams (AED)
                        {PRICES_INCLUDE_VAT ? ` and include VAT at ${vatPercent}` : `; VAT at ${vatPercent} is added at checkout`}.
                        Delivery charges{COD_ENABLED ? " and any cash-on-delivery fee" : ""} are shown before you pay. We
                        work hard to keep prices accurate; if we find an error in the price of an item you have ordered, we
                        will contact you before dispatch so you can confirm at the correct price or cancel for a full
                        refund.
                    </p>
                </Section>

                <Section title="Product imagery and descriptions">
                    <p>
                        We photograph and describe our pieces as accurately as we can. Colours and finishes can look
                        slightly different depending on your screen, and natural materials such as wood, stone, ceramic
                        and glass vary from piece to piece — these variations are part of their character, not a fault.
                        Dimensions are approximate.
                    </p>
                </Section>

                <Section title="Your order">
                    <p>
                        When you place an order, we send an email acknowledging it. A contract is formed when we accept
                        your order, which happens when we confirm it or dispatch it. We may decline or cancel an order —
                        for example if an item is unavailable, a pricing error has occurred or we cannot deliver to the
                        address given — and will refund any payment in full if we do.
                    </p>
                </Section>

                <Section title="Payment">
                    <p>
                        You can pay by card through our payment provider&apos;s secure hosted page
                        {COD_ENABLED
                            ? `, or in cash on delivery on orders up to ${formatPrice(COD_MAX_ORDER_TOTAL)} (a ${formatPrice(COD_FEE)} handling fee applies)`
                            : ""}
                        . Card orders are confirmed once payment has been authorised.
                    </p>
                </Section>

                <Section title="Cancellations">
                    <p>
                        {COD_ENABLED ? (
                            <>
                                You can cancel a cash-on-delivery order yourself from your{" "}
                                <Link href="/orders" className="text-foreground underline underline-offset-4">
                                    order page
                                </Link>{" "}
                                until we begin preparing it for dispatch. To cancel a card-paid order before dispatch, contact us and we will cancel it and refund
                                your card in full.
                            </>
                        ) : (
                            <>To cancel an order before dispatch, contact us and we will cancel it and refund you in full.</>
                        )}{" "}
                        Once an order has been dispatched, our{" "}
                        <Link href="/policies/returns" className="text-foreground underline underline-offset-4">
                            returns policy
                        </Link>{" "}
                        applies.
                    </p>
                </Section>

                <Section title="Delivery, returns and refunds">
                    <p>
                        Delivery, returns, refunds and exchanges are covered by our{" "}
                        <Link href="/policies/shipping" className="text-foreground underline underline-offset-4">
                            delivery
                        </Link>
                        ,{" "}
                        <Link href="/policies/returns" className="text-foreground underline underline-offset-4">
                            returns
                        </Link>
                        ,{" "}
                        <Link href="/policies/refunds" className="text-foreground underline underline-offset-4">
                            refunds
                        </Link>{" "}
                        and{" "}
                        <Link href="/policies/exchange" className="text-foreground underline underline-offset-4">
                            exchange
                        </Link>{" "}
                        policies, which form part of these terms. Your personal data is handled as set out in our{" "}
                        <Link href="/policies/privacy" className="text-foreground underline underline-offset-4">
                            privacy policy
                        </Link>
                        .
                    </p>
                </Section>

                <Section title="Our responsibility to you">
                    <p>
                        Nothing in these terms limits your rights under UAE consumer protection law. Beyond those rights,
                        our liability for any order is limited to the price you paid for it, and we are not responsible for
                        indirect or unforeseeable losses, or for delays caused by events outside our reasonable control.
                        Please follow the care and use instructions provided with each product.
                    </p>
                </Section>

                <Section title="Governing law">
                    <p>
                        These terms are governed by the laws of the United Arab Emirates as applied in the Emirate of
                        Dubai, and the courts of Dubai have jurisdiction over any dispute. We always hope to resolve any
                        concern with you directly first.
                    </p>
                </Section>

                <Section title="Changes to these terms">
                    <p>
                        We may update these terms from time to time. The version in force when you place your order is
                        the one that applies to it.
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
