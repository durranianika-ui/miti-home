import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/structured-data"
import { BRAND, CONTACT } from "@/lib/brand"
import { BARGAIN_AI_ENABLED } from "@/lib/constants"
import { normalizeSiteUrl } from "@/lib/seo"

const LAST_UPDATED = "18 September 2026"

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: `How ${BRAND.name} collects, uses and protects your personal data, and your rights under the UAE Personal Data Protection Law.`,
    alternates: {
        canonical: "/policies/privacy",
    },
    openGraph: {
        title: `Privacy Policy | ${BRAND.name}`,
        description: `What ${BRAND.name} collects, why, and the choices you have.`,
        url: "/policies/privacy",
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

export default function PrivacyPolicyPage() {
    const baseUrl = normalizeSiteUrl()

    return (
        <div className="min-h-screen bg-background">
            <JsonLd
                data={breadcrumbJsonLd(baseUrl, [
                    { name: "Home", url: "/" },
                    { name: "Customer Care", url: "/policies" },
                    { name: "Privacy Policy", url: "/policies/privacy" },
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
                    <h1 className="font-display mt-4 text-4xl leading-tight md:text-6xl">Privacy</h1>
                    <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
                        {BRAND.legalName} (&ldquo;{BRAND.name}&rdquo;, &ldquo;we&rdquo;) is based in {BRAND.city},{" "}
                        {BRAND.country}. This policy explains what personal data we collect when you use our website, how
                        we use it and the choices you have.
                    </p>
                    <p className="mt-6 text-xs text-muted-foreground">Last updated {LAST_UPDATED}</p>
                </div>
            </header>

            <div className="mx-auto max-w-3xl space-y-12 px-4 py-16 sm:px-6 md:px-12 md:py-24">
                <Section title="What we collect">
                    <Bullets
                        items={[
                            <>
                                <span className="text-foreground">Your account</span> — your name, email address and, if
                                you add it, your phone number and password (stored only in encrypted, hashed form).
                            </>,
                            <>
                                <span className="text-foreground">Your orders</span> — the items you buy, prices paid,
                                payment method, order status and your order history.
                            </>,
                            <>
                                <span className="text-foreground">Delivery details</span> — your name, phone number,
                                emirate, area, building and any delivery instructions you give us.
                            </>,
                            <>
                                <span className="text-foreground">Your preferences</span> — your wishlist, and whether you
                                have subscribed to our emails.
                            </>,
                            ...(BARGAIN_AI_ENABLED
                                ? [
                                      <>
                                          <span className="text-foreground">Concierge conversations</span> — if you use
                                          our checkout concierge, the messages you send so it can respond.
                                      </>,
                                  ]
                                : []),
                        ]}
                    />
                </Section>

                <Section title="Payments">
                    <p>
                        Card payments are made on the secure, hosted page of our payment provider. Your card details are
                        entered there, not on our website — we never see or store your full card number. We receive only
                        a confirmation of payment and a transaction reference.
                    </p>
                </Section>

                <Section title="How we use your data">
                    <Bullets
                        items={[
                            "To process, deliver and support your orders, including returns, refunds and exchanges",
                            "To manage your account and keep it secure",
                            "To send service emails — order confirmations, delivery updates and password resets",
                            "To send marketing emails, only if you have chosen to receive them",
                            "To understand how our website is used and improve it",
                            "To meet our legal, tax and accounting obligations",
                        ]}
                    />
                </Section>

                <Section title="Cookies and analytics">
                    <p>
                        We use essential cookies and similar browser storage to keep you signed in and to remember your
                        bag and display preferences. Where we have enabled them, we also use analytics and advertising
                        measurement tools (such as Google Analytics, Google Tag Manager or the Meta Pixel) to understand
                        visits and the performance of our campaigns. You can clear or block cookies in your browser
                        settings at any time; essential features such as signing in may not work without them.
                    </p>
                </Section>

                <Section title="Email marketing">
                    <p>
                        We only send marketing emails if you have subscribed. Every marketing email includes an
                        unsubscribe link, and you can also ask us to remove you at any time. Service emails about your
                        orders will still be sent.
                    </p>
                </Section>

                <Section title="Who we share it with">
                    <p>
                        We do not sell your personal data. We share it only with the service providers who help us run the
                        store — website hosting and databases, payment processing, email delivery, delivery couriers and,
                        where enabled, analytics — and only as much as each needs to perform its service. Some of these
                        providers may process data outside the UAE, in which case we rely on appropriate safeguards. We
                        may also disclose data where the law requires it.
                    </p>
                </Section>

                <Section title="How long we keep it">
                    <p>
                        We keep your account data while your account is open. Order and invoice records are kept for as
                        long as UAE tax and commercial law requires. Marketing preferences are kept until you unsubscribe;
                        we then keep a record of the opt-out so we do not email you again. When data is no longer needed,
                        we delete or anonymise it.
                    </p>
                </Section>

                <Section title="Your rights">
                    <p>
                        Under the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021), you can ask us to:
                    </p>
                    <Bullets
                        items={[
                            "Tell you what personal data we hold about you and provide a copy",
                            "Correct data that is inaccurate or incomplete",
                            "Delete your data, where we are not required to keep it",
                            "Restrict or object to certain processing, including direct marketing",
                            "Transfer your data to another provider, where applicable",
                        ]}
                    />
                    <p>
                        To make a request, email{" "}
                        <a href={`mailto:${CONTACT.email}`} className="text-foreground underline underline-offset-4">
                            {CONTACT.email}
                        </a>
                        . We may need to verify your identity before acting on it.
                    </p>
                </Section>

                <Section title="Security">
                    <p>
                        We protect your data with encrypted connections, access controls and trusted infrastructure
                        providers. No system is completely secure, but we work to keep your information safe and will act
                        promptly if an issue arises.
                    </p>
                </Section>

                <Section title="Changes to this policy">
                    <p>
                        We may update this policy from time to time. The date at the top shows when it last changed. See
                        also our{" "}
                        <Link href="/policies/terms" className="text-foreground underline underline-offset-4">
                            terms of sale
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
