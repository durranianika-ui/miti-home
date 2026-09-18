/**
 * Customer-facing money formatting. All prices in the store are AED.
 * Keep this file free of `@/` imports: it is loaded by the node test runner.
 */
import { CURRENCY, CURRENCY_LOCALE, PRICES_INCLUDE_VAT, VAT_RATE } from "./constants.ts";

const wholeFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const fractionalFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function toAmount(value: string | number | null | undefined) {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * Formats an amount as "AED 1,250" (or "AED 1,250.50" when there are fils).
 * The ISO code prefix is used instead of the Arabic dirham sign so it renders
 * identically in every font and screen reader.
 */
export function formatPrice(value: string | number | null | undefined) {
  const amount = Math.round(toAmount(value) * 100) / 100;
  const formatter = Number.isInteger(amount) ? wholeFormatter : fractionalFormatter;
  const sign = amount < 0 ? "-" : "";
  return `${sign}${CURRENCY} ${formatter.format(Math.abs(amount))}`;
}

/** Always two decimals — for invoices, order records and admin tables. */
export function formatPriceExact(value: string | number | null | undefined) {
  const amount = toAmount(value);
  const sign = amount < 0 ? "-" : "";
  return `${sign}${CURRENCY} ${fractionalFormatter.format(Math.abs(amount))}`;
}

export function discountPercent(compareAt: string | number, price: string | number) {
  const original = toAmount(compareAt);
  const current = toAmount(price);
  if (original <= 0 || current <= 0 || original <= current) return null;
  return Math.round(((original - current) / original) * 100);
}

/**
 * VAT contained in (or to be added to) a total. With VAT-inclusive pricing the
 * tax is the 5/105 share of the gross amount.
 */
export function vatPortion(total: number) {
  if (!Number.isFinite(total) || total <= 0 || VAT_RATE <= 0) return 0;
  const vat = PRICES_INCLUDE_VAT ? (total * VAT_RATE) / (1 + VAT_RATE) : total * VAT_RATE;
  return Math.round(vat * 100) / 100;
}

/** Minor units (fils) for payment providers. */
export function toMinorUnits(amount: number) {
  return Math.round(amount * 100);
}
