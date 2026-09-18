/**
 * Small display helpers shared by admin pages (client- and server-safe:
 * no server-only imports).
 */

import { formatUaePhone } from "@/lib/uae";

export const ADMIN_LOCALE = "en-AE";
export const ADMIN_TIME_ZONE = "Asia/Dubai";

/** Mirrors `orderNumber()` in lib/email.ts without importing server-only code. */
export function orderNumber(orderId: string) {
  return `MH-${orderId.slice(0, 8).toUpperCase()}`;
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(ADMIN_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: ADMIN_TIME_ZONE,
  });
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString(ADMIN_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ADMIN_TIME_ZONE,
  });
}

export const ORDER_STATUSES = [
  { value: "pending", label: "Pending", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" },
  { value: "confirmed", label: "Confirmed", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  { value: "processing", label: "Processing", className: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
  { value: "shipped", label: "Shipped", className: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400" },
  { value: "delivered", label: "Delivered", className: "bg-green-500/10 text-green-700 dark:text-green-400" },
  { value: "cancelled", label: "Cancelled", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
] as const;

export type OrderStatusValue = (typeof ORDER_STATUSES)[number]["value"];

export function isOrderStatus(value: string): value is OrderStatusValue {
  return ORDER_STATUSES.some((status) => status.value === value);
}

const PAYMENT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "text-green-700 dark:text-green-400" },
  pending: { label: "Pending", className: "text-yellow-700 dark:text-yellow-400" },
  refund_due: { label: "Refund due", className: "text-red-700 dark:text-red-400" },
  refunded: { label: "Refunded", className: "text-muted-foreground" },
  cancelled: { label: "Cancelled", className: "text-muted-foreground" },
  failed: { label: "Failed", className: "text-red-700 dark:text-red-400" },
};

export function paymentStatusDisplay(status: string | null | undefined) {
  const key = status ?? "pending";
  return PAYMENT_STATUS_LABELS[key] ?? { label: key.replace(/_/g, " "), className: "text-muted-foreground" };
}

export function paymentMethodLabel(method: string | null | undefined) {
  if (!method) return "—";
  if (method === "cod") return "Cash on delivery";
  if (method === "card") return "Card";
  return method.replace(/_/g, " ");
}

/** Shared input styling for admin forms. */
export const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/** Pretty-prints UAE E.164 numbers; leaves anything else untouched. */
export function displayPhone(phone: string | null | undefined) {
  if (!phone) return null;
  return /^\+971\d{8,9}$/.test(phone) ? formatUaePhone(phone) : phone;
}
