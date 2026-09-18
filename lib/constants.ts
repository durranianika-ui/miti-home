/**
 * UAE commerce configuration — single source of truth for money rules that
 * both the storefront and the server-side checkout quote use.
 *
 * Every business number can be overridden per environment with a
 * NEXT_PUBLIC_* variable (they are needed in client bundles for display, and
 * the server re-reads the same values when it prices an order).
 *
 * Keep this file free of `@/` imports: it is loaded by the node test runner.
 */
import { BRAND, CONTACT } from "./brand.ts";

// Values are passed in as static `process.env.NEXT_PUBLIC_*` reads so Next.js
// can inline them into client bundles (dynamic process.env[name] is not inlined).
function numberFromEnv(raw: string | undefined, fallback: number) {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function booleanFromEnv(rawValue: string | undefined, fallback: boolean) {
  const raw = rawValue?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

// Currency
export const CURRENCY = "AED";
export const CURRENCY_LOCALE = BRAND.locale;

// Tax — UAE VAT is 5%. Retail prices are displayed VAT-inclusive.
export const VAT_RATE = numberFromEnv(process.env.NEXT_PUBLIC_VAT_RATE, 0.05);
export const PRICES_INCLUDE_VAT = booleanFromEnv(process.env.NEXT_PUBLIC_PRICES_INCLUDE_VAT, true);

// Shipping & fees (AED). Placeholder commercial terms — confirm before launch.
export const FREE_SHIPPING_THRESHOLD = numberFromEnv(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_AED, 300);
export const FREE_SHIPPING_THRESHOLD_DISPLAY = `AED ${FREE_SHIPPING_THRESHOLD.toLocaleString("en-AE")}`;
export const SHIPPING_FEE = numberFromEnv(process.env.NEXT_PUBLIC_SHIPPING_FEE_AED, 25);
export const COD_ENABLED = booleanFromEnv(process.env.NEXT_PUBLIC_COD_ENABLED, true);
export const COD_FEE = numberFromEnv(process.env.NEXT_PUBLIC_COD_FEE_AED, 10);
/** Orders above this total must be prepaid (courier cash-handling limit). */
export const COD_MAX_ORDER_TOTAL = numberFromEnv(process.env.NEXT_PUBLIC_COD_MAX_ORDER_AED, 2500);
export const DELIVERY_ESTIMATE = process.env.NEXT_PUBLIC_DELIVERY_ESTIMATE?.trim() || "1–3 working days across the UAE";

// Addresses
export const UAE_EMIRATES = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
] as const;

export type UaeEmirate = (typeof UAE_EMIRATES)[number];

function emiratesFromEnv(rawValue: string | undefined): readonly UaeEmirate[] {
  const raw = rawValue?.trim();
  if (!raw) return UAE_EMIRATES;
  const wanted = raw.split(",").map((value) => value.trim().toLowerCase());
  const matched = UAE_EMIRATES.filter((emirate) => wanted.includes(emirate.toLowerCase()));
  return matched.length > 0 ? matched : UAE_EMIRATES;
}

/** Emirates we deliver to. Defaults to all seven. */
export const SHIPPING_EMIRATES = emiratesFromEnv(process.env.NEXT_PUBLIC_SHIPPING_EMIRATES);
/** Emirates where the courier collects cash on delivery. */
export const COD_ALLOWED_EMIRATES = emiratesFromEnv(process.env.NEXT_PUBLIC_COD_EMIRATES);

// Bargain AI (optional; off unless explicitly enabled)
export const BARGAIN_AI_ENABLED = booleanFromEnv(process.env.NEXT_PUBLIC_FEATURE_BARGAIN_AI, false);
export const BARGAIN_BOT_BANNER_MESSAGE = "Ask our concierge for a private offer at checkout.";

export const ANNOUNCEMENT_MESSAGES = [
  `Complimentary UAE delivery on orders over ${FREE_SHIPPING_THRESHOLD_DISPLAY}`,
  "Thoughtfully curated home essentials",
  `Delivered ${DELIVERY_ESTIMATE}`,
  ...(COD_ENABLED ? ["Cash on delivery available across the UAE"] : []),
];

// Contact (re-exported for existing call sites)
export const CONTACT_EMAIL = CONTACT.email;
export const CONTACT_PHONE = CONTACT.phone ?? "";

// After-sales windows (days). Placeholder commercial terms — confirm before launch.
export const RETURN_WINDOW_DAYS = numberFromEnv(process.env.NEXT_PUBLIC_RETURN_WINDOW_DAYS, 7);
export const EXCHANGE_WINDOW_DAYS = numberFromEnv(process.env.NEXT_PUBLIC_EXCHANGE_WINDOW_DAYS, 7);
