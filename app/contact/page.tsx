import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/structured-data"
import { BRAND, CONTACT, SOCIAL_LINKS, whatsappHref } from "@/lib/brand"
import { normalizeSiteUrl } from "@/lib/seo"

export const metadata: Metadata = {
    title: "Contact Us",
    description: `Contact ${BRAND.name} customer care in ${BRAND.city} — questions about a piece, your order, delivery or returns across the UAE.`,
    alternates: {
        canonical: "/contact",
    },
    openGraph: {
        title: `Contact Us | ${BRAND.name}`,
        description: `Speak with ${BRAND.name} customer care in ${BRAND.city}.`,
        url: "/contact",
    },
}

function formatPhone(e164: string) {
    const digits = e164.replace(/\D/g, "")
    if (digits.startsWith("971") && digits.length === 12) {
        return `+971 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`
    }
    return e164
}

const labelClass = "font-heading text-[10px] font-medium uppercase tracking-[0.3em] text-brand-strong"
const linkClass =
    "inline-flex items-center gap-1.5 text-base text-foreground underline-offset-4 transition-colors duration-300 hover:text-brand-strong hover:underline"

export default function ContactPage() {
    const baseUrl = normalizeSiteUrl()
    const whatsapp = whatsappHref(`Hello ${BRAND.name}, I have a question.`)
    const mailto = `mailto:${CONTACT.email}`

    return (
        <div className="min-h-screen bg-background">
            <JsonLd
                data={breadcrumbJsonLd(baseUrl, [
                    { name: "Home", url: "/" },
                    { name: "Contact", url: "/contact" },
                ])}
            />

            <section className="px-4 pb-16 pt-16 sm:px-6 md:px-12 md:pb-24 md:pt-24">
                <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
                    <div>
                        <p className={labelClass}>Customer care</p>
                        <h1 className="font-display mt-5 text-4xl leading-tight md:text-6xl">
                            We&apos;d love to hear from you
                        </h1>
                        <p className="mt-6 max-w-lg text-sm leading-7 text-muted-foreground">
                            Whether you need help choosing a piece, have a question about an order, or would like to
                            arrange a return, our team in {BRAND.city} is here to help.
                        </p>
                        <div className="brand-rule mt-10 w-40 text-[10px]">
                            <span className="h-1.5 w-1.5 rotate-45 bg-brand" />
                        </div>

                        <address className="mt-10 grid gap-10 not-italic sm:grid-cols-2">
                            <div>
                                <p className={labelClass}>Email</p>
                                <p className="mt-3">
                                    <a href={mailto} className={linkClass}>
                                        {CONTACT.email}
                                    </a>
                                </p>
                            </div>

                            {whatsapp ? (
                                <div>
                                    <p className={labelClass}>WhatsApp</p>
                                    <p className="mt-3">
                                        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={linkClass}>
                                            Message us
                                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                                        </a>
                                    </p>
                                </div>
                            ) : null}

                            {CONTACT.phone ? (
                                <div>
                                    <p className={labelClass}>Telephone</p>
                                    <p className="mt-3">
                                        <a href={`tel:${CONTACT.phone}`} className={linkClass}>
                                            {formatPhone(CONTACT.phone)}
                                        </a>
                                    </p>
                                </div>
                            ) : null}

                            <div>
                                <p className={labelClass}>Location</p>
                                <p className="mt-3 text-base text-foreground">{CONTACT.address}</p>
                            </div>

                            <div>
                                <p className={labelClass}>Hours</p>
                                <p className="mt-3 text-base text-foreground">{CONTACT.hours}</p>
                            </div>

                            {SOCIAL_LINKS.length > 0 ? (
                                <div>
                                    <p className={labelClass}>Follow</p>
                                    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                                        {SOCIAL_LINKS.map((link) => (
                                            <li key={link.label}>
                                                <a
                                                    href={link.href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={linkClass}
                                                >
                                                    {link.label}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                        </address>
                    </div>

                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
                        <Image
                            src="/products/smoked-glass-ambient-table-lamp/1.webp"
                            alt="Smoked glass ambient table lamp glowing on a wooden sideboard"
                            fill
                            sizes="(max-width: 768px) 100vw, 40vw"
                            priority
                            className="object-cover"
                        />
                    </div>
                </div>
            </section>

            <section className="border-t border-border bg-secondary px-4 py-16 sm:px-6 md:px-12 md:py-24">
                <div className="mx-auto max-w-6xl">
                    <h2 className="font-display text-2xl leading-snug md:text-3xl">Before you get in touch</h2>
                    <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
                        Many answers are already in our customer care pages.
                    </p>
                    <ul className="mt-10 grid grid-cols-1 border-l border-t border-border sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: "Delivery", href: "/policies/shipping" },
                            { label: "Returns", href: "/policies/returns" },
                            { label: "Refunds", href: "/policies/refunds" },
                            { label: "Exchanges", href: "/policies/exchange" },
                        ].map((item) => (
                            <li key={item.href} className="border-b border-r border-border">
                                <Link
                                    href={item.href}
                                    className="group flex items-center justify-between gap-4 bg-background p-6 transition-colors duration-300 hover:bg-card"
                                >
                                    <span className="font-heading text-[11px] uppercase tracking-[0.24em]">{item.label}</span>
                                    <ArrowUpRight
                                        className="h-3.5 w-3.5 text-brand-strong transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </div>
    )
}
