/**
 * Miti Home brand source of truth.
 *
 * Everything customer-facing that names the brand, its contact details, its
 * social accounts or its legal identity reads from here. Values that were not
 * supplied in the Miti Home brand pack are environment-driven and stay hidden
 * (or fall back to a clearly marked placeholder) until they are provided.
 * See docs/REQUIRED-FROM-OWNER.md for the list of open items.
 *
 * Keep this file free of `@/` imports: it is loaded by the node test runner.
 */

// Pass static `process.env.NEXT_PUBLIC_*` reads so Next.js can inline them
// into client bundles (dynamic process.env[name] is not inlined).
function env(value: string | undefined) {
  return value && value.trim() ? value.trim() : undefined;
}

export const BRAND = {
  name: "Miti Home",
  legalName: env(process.env.NEXT_PUBLIC_LEGAL_NAME) ?? "Miti Home",
  wordmark: "MITI HOME",
  tagline: "Luxury Living",
  promise: "Beautiful spaces. A better you.",
  signOff: "For a more beautiful everyday",
  shortDescription:
    "Thoughtfully curated home essentials for a more beautiful everyday life.",
  description:
    "Miti Home is a Dubai-based home lifestyle brand that curates beautiful, useful and unexpected products for modern living — from statement décor and sculptural lighting to smart storage and entertaining essentials.",
  vision:
    "To become the leading home lifestyle brand in the UAE and beyond — known for discovering beautiful, useful and unexpected products that transform everyday living.",
  mission:
    "To help people create beautiful spaces that inspire a better life through thoughtfully curated products and exceptional experiences.",
  pillars: [
    { title: "Beautiful spaces", body: "Elevate your home with design-led pieces." },
    { title: "Useful solutions", body: "Smart products that simplify everyday life." },
    { title: "Inspired living", body: "Create moments, memories and better habits." },
    { title: "Curated with care", body: "Handpicked quality products you'll love." },
  ],
  principles: [
    "Curated, not crowded.",
    "Design-led and lifestyle-focused.",
    "Quality over quantity.",
    "Unique and unexpected finds.",
    "Luxury experience at every touchpoint.",
  ],
  city: "Dubai",
  country: "United Arab Emirates",
  countryCode: "AE",
  locale: "en-AE",
  ogLocale: "en_AE",
  colors: {
    charcoal: "#0D0D0D",
    gold: "#C8A96A",
    beige: "#D6CEC1",
    ivory: "#F7F5F0",
    taupe: "#8C7F72",
  },
} as const;

/**
 * Canonical site origin. NEXT_PUBLIC_APP_URL wins; the fallback is the domain
 * the existing Miti Home storefront uses. Confirm before launch.
 */
export const DEFAULT_SITE_URL = "https://mitihome.ae";

export const CONTACT = {
  /** Placeholder until the owner confirms the customer-care mailbox. */
  email: env(process.env.NEXT_PUBLIC_CONTACT_EMAIL) ?? "hello@mitihome.ae",
  emailIsPlaceholder: !env(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  /** E.164, e.g. +9715XXXXXXXX. Hidden everywhere when unset. */
  phone: env(process.env.NEXT_PUBLIC_CONTACT_PHONE),
  /** Digits only for wa.me links, e.g. 9715XXXXXXXX. Hidden when unset. */
  whatsapp: env(process.env.NEXT_PUBLIC_CONTACT_WHATSAPP),
  address: env(process.env.NEXT_PUBLIC_CONTACT_ADDRESS) ?? "Dubai, United Arab Emirates",
  hours: env(process.env.NEXT_PUBLIC_CONTACT_HOURS) ?? "Sunday – Friday, 10:00 – 19:00 GST",
  securityEmail: env(process.env.SECURITY_CONTACT_EMAIL) ?? env(process.env.NEXT_PUBLIC_CONTACT_EMAIL) ?? "hello@mitihome.ae",
} as const;

export const LEGAL = {
  /** UAE trade licence number — required on invoices and policy pages. */
  tradeLicence: env(process.env.NEXT_PUBLIC_TRADE_LICENCE),
  /** Federal Tax Authority TRN — required on VAT tax invoices once registered. */
  vatTrn: env(process.env.NEXT_PUBLIC_VAT_TRN),
} as const;

type SocialLink = { label: string; href: string };

export const SOCIAL_LINKS: SocialLink[] = [
  { label: "Instagram", href: env(process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM) ?? "" },
  { label: "TikTok", href: env(process.env.NEXT_PUBLIC_SOCIAL_TIKTOK) ?? "" },
  { label: "Pinterest", href: env(process.env.NEXT_PUBLIC_SOCIAL_PINTEREST) ?? "" },
  { label: "Facebook", href: env(process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK) ?? "" },
].filter((link) => link.href.length > 0);

export function whatsappHref(message?: string) {
  if (!CONTACT.whatsapp) return null;
  const digits = CONTACT.whatsapp.replace(/\D/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

/** Brand imagery that is not tied to a single product. */
export const BRAND_ASSETS = {
  logo: "/brand/miti-home-logo.png",
  logoOnDark: "/brand/miti-home-logo-dark.png",
  ogImage: "/brand/og-image.jpg",
  icon: "/brand/miti-home-icon.png",
} as const;
