import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/structured-data"
import { BRAND, CONTACT } from "@/lib/brand"
import {
    COD_ALLOWED_EMIRATES,
    COD_ENABLED,
    COD_FEE,
    COD_MAX_ORDER_TOTAL,
    DELIVERY_ESTIMATE,
    FREE_SHIPPING_THRESHOLD_DISPLAY,
    SHIPPING_EMIRATES,
    SHIPPING_FEE,
    UAE_EMIRATES,
} from "@/lib/constants"
import { formatPrice } from "@/lib/money"
import { normalizeSiteUrl } from "@/lib/seo"

const LAST_UPDATED = "18 September 2026"

export const metadata: Metadata = {
    title: "Delivery Policy",
    description: `${BRAND.name} delivers across the UAE ${DELIVERY_ESTIMATE}. ${formatPrice(SHIPPING_FEE)} delivery, complimentary on orders of ${FREE_SHIPPING_THRESHOLD_DISPLAY} or more${
        COD_ENABLED ? "; cash on delivery available" : ""
    }.`,
    alternates: {
        canonical: "/policies/shipping",
    },
    openGraph: {
        title: `Delivery Policy | ${BRAND.name}`,
        description: `Delivery across the UAE ${DELIVERY_ESTIMATE}. Complimentary on orders of ${FREE_SHIPPING_THRESHOLD_DISPLAY} or more.`,
        url: "/policies/shipping",
    },
}

function listJoin(items: readonly string[]) {
    if (items.length <= 1) return items.join("")
    return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-4">
            <h2 className="font-heading text-[11px] font-medium uppercase tracking-[0.26em] text-foreground">{title}</h2>
            <div className="space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
        </section>
    )
}

export default function ShippingPolicyPage() {
    const baseUrl = normalizeSiteUrl()
    const allEmirates = SHIPPING_EMIRATES.length === UAE_EMIRATES.length
    const codEverywhere = COD_ALLOWED_EMIRATES.length === SHIPPING_EMIRATES.length

    const charges = [
        { label: `Orders under ${FREE_SHIPPING_THRESHOLD_DISPLAY}`, value: formatPrice(SHIPPING_FEE) },
        { label: `Orders of ${FREE_SHIPPING_THRESHOLD_DISPLAY} or more`, value: "Complimentary" },
        ...(COD_ENABLED ? [{ label: "Cash on delivery handling", value: `+ ${formatPrice(COD_FEE)}` }] : []),
    ]

    return (
        <div className="min-h-screen bg-background">
            <JsonLd
                data={breadcrumbJsonLd(baseUrl, [
                    { name: "Home", url: "/" },
                    { name: "Customer Care", url: "/policies" },
                    { name: "Delivery Policy", url: "/policies/shipping" },
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
                    <h1 className="font-display mt-4 text-4xl leading-tight md:text-6xl">Delivery</h1>
                    <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
                        Carefully packed in {BRAND.city} and delivered to your door, {DELIVERY_ESTIMATE}.
                    </p>
                    <p className="mt-6 text-xs text-muted-foreground">Last updated {LAST_UPDATED}</p>
                </div>
            </header>

            <div className="mx-auto max-w-3xl space-y-12 px-4 py-16 sm:px-6 md:px-12 md:py-24">
                <Section title="Where we deliver">
                    <p>
                        We deliver within the United Arab Emirates only
                        {allEmirates ? ", to all seven emirates: " : ", currently to "}
                        {listJoin(SHIPPING_EMIRATES)}. We are not able to ship outside the UAE at present.
                    </p>
                </Section>

                <Section title="Delivery times">
                    <p>
                        Orders are delivered {DELIVERY_ESTIMATE} once confirmed. Timings are estimates and may be longer
                        during public holidays, peak seasons or for more remote addresses. We will always let you know if
                        your order is going to take longer than expected.
                    </p>
                </Section>

                <Section title="Delivery charges">
                    <p>All prices, including delivery charges, are in UAE dirhams (AED) and include VAT.</p>
                    <dl className="divide-y divide-border border-y border-border">
                        {charges.map((row) => (
                            <div key={row.label} className="flex items-baseline justify-between gap-4 py-4">
                                <dt className="text-sm text-foreground">{row.label}</dt>
                                <dd className="text-sm tabular-nums text-foreground">{row.value}</dd>
                            </div>
                        ))}
                    </dl>
                </Section>

                {COD_ENABLED ? (
                    <Section title="Cash on delivery">
                        <p>
                            You can pay in cash when your order arrives
                            {codEverywhere ? "" : ` in ${listJoin(COD_ALLOWED_EMIRATES)}`}. A handling fee of{" "}
                            {formatPrice(COD_FEE)} is added at checkout. Cash on delivery is available on orders up to{" "}
                            {formatPrice(COD_MAX_ORDER_TOTAL)}; larger orders are paid by card.
                        </p>
                        <p>Please have the exact amount ready — our courier partners may not always carry change.</p>
                    </Section>
                ) : null}

                <Section title="Large and furniture pieces">
                    <p>
                        Furniture and oversized pieces are delivered by arrangement. Our team will contact you after you
                        order to agree a delivery date and time, and to check access — lifts, parking, loading bays and
                        any building permits your community requires.
                    </p>
                </Section>

                <Section title="Receiving your order">
                    <p>
                        Please inspect your order when it arrives. If the outer packaging is visibly damaged, note it with
                        the courier and take a photograph before opening. If anything inside is damaged or incorrect, let
                        us know within 48 hours of delivery with photographs of the item and its packaging, and we will put
                        it right — see our <Link href="/policies/returns" className="text-foreground underline underline-offset-4">returns policy</Link>.
                    </p>
                </Section>

                <Section title="Following your order">
                    <p>
                        You will receive an email confirming your order, and another as its status changes. You can view
                        your orders at any time from{" "}
                        <Link href="/orders" className="text-foreground underline underline-offset-4">
                            My orders
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
