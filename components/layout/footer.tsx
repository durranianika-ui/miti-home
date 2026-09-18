import Link from "next/link";
import { ArrowRight, Mail, MessageCircle, Phone } from "lucide-react";
import { PixelatedText } from "@/components/effects/pixelated-text";
import { BrandMark } from "@/components/brand/wordmark";
import { BRAND, CONTACT, LEGAL, SOCIAL_LINKS, whatsappHref } from "@/lib/brand";
import type { NavigationLink } from "@/lib/navigation";

const companyLinks = [
  { href: "/about", label: "Our Story" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
  { href: "/account", label: "Account" },
  { href: "/orders", label: "Orders" },
  { href: "/wishlist", label: "Wishlist" },
];

const careLinks = [
  { href: "/policies/shipping", label: "Delivery" },
  { href: "/policies/returns", label: "Returns" },
  { href: "/policies/exchange", label: "Exchanges" },
  { href: "/policies/refunds", label: "Refunds" },
  { href: "/policies/privacy", label: "Privacy" },
  { href: "/policies/terms", label: "Terms" },
];

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center justify-between gap-2 border-b border-border/70 py-2 text-sm font-light leading-tight text-muted-foreground transition-colors duration-500 hover:text-foreground sm:text-base md:gap-3 md:py-3"
    >
      <span className="min-w-0">{label}</span>
      <ArrowRight className="hidden h-4 w-4 flex-none -translate-x-2 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100 sm:block" />
    </Link>
  );
}

const iconButton =
  "group inline-flex h-14 w-14 items-center justify-center rounded-full border border-border transition-colors duration-300 hover:border-brand hover:text-foreground md:h-16 md:w-16";

export function Footer({ shopLinks }: { shopLinks: NavigationLink[] }) {
  const whatsapp = whatsappHref(`Hello ${BRAND.name}`);

  return (
    <footer className="relative overflow-hidden border-t border-border/60 bg-background text-foreground">
      <div className="flex min-h-[90svh] flex-col px-6 py-12 md:px-12 lg:px-16">
        <div className="grid flex-1 gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(34rem,1fr)] lg:gap-14">
          <div className="flex min-w-0 flex-col justify-between gap-12">
            <div>
              <p className="mb-5 flex items-center gap-3 font-heading text-[10px] font-medium uppercase tracking-[0.4em] text-brand-strong">
                <BrandMark className="h-3 w-3" />
                {BRAND.tagline}
              </p>
              <PixelatedText
                text="MITI HOME"
                className="h-[clamp(5rem,15vw,13rem)] max-w-5xl"
                align="left"
                textClassName="text-left"
              />
              <p className="mt-6 max-w-md text-sm leading-7 text-muted-foreground">{BRAND.shortDescription}</p>
            </div>

            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                <a className={iconButton} href={`mailto:${CONTACT.email}`} aria-label={`Email ${CONTACT.email}`}>
                  <Mail className="h-6 w-6" />
                </a>
                {whatsapp && (
                  <a className={iconButton} href={whatsapp} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
                    <MessageCircle className="h-6 w-6" />
                  </a>
                )}
                {CONTACT.phone && (
                  <a className={iconButton} href={`tel:${CONTACT.phone.replace(/\s+/g, "")}`} aria-label={`Call ${CONTACT.phone}`}>
                    <Phone className="h-6 w-6" />
                  </a>
                )}
              </div>
              {SOCIAL_LINKS.length > 0 && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 font-heading text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {SOCIAL_LINKS.map((link) => (
                    <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <nav aria-label="Footer" className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 md:gap-x-6">
            <div className="col-span-2 sm:col-span-1">
              <p className="mb-4 font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Shop</p>
              <div>
                {shopLinks.map((link) => (
                  <FooterLink key={link.href} href={link.href} label={link.label} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-4 font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Miti Home</p>
              <div>
                {companyLinks.map((link) => (
                  <FooterLink key={link.href} {...link} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-4 font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Client care</p>
              <div>
                {careLinks.map((link) => (
                  <FooterLink key={link.href} {...link} />
                ))}
              </div>
            </div>
          </nav>
        </div>

        <div className="mt-16 border-t border-border/70 pt-8">
          <div className="grid gap-3 font-heading text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:flex sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} {BRAND.legalName}. All rights reserved.</p>
            <p>
              {CONTACT.address}
              {LEGAL.tradeLicence ? ` · Trade licence ${LEGAL.tradeLicence}` : ""}
              {LEGAL.vatTrn ? ` · TRN ${LEGAL.vatTrn}` : ""}
            </p>
            <p>Prices in AED, inclusive of VAT</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
