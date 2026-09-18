"use client";

import { CURRENCY } from "@/lib/constants";

type EcommerceItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variant?: string;
  category?: string;
};

type AnalyticsWindow = Window & {
  dataLayer?: Record<string, unknown>[];
  fbq?: (...args: unknown[]) => void;
};

/**
 * Pushes GA4-shaped ecommerce events to the dataLayer (read by GTM or gtag)
 * and mirrors the key ones to the Meta Pixel when it is loaded. A no-op when
 * no analytics are configured.
 */
export function trackEcommerce(
  event: "view_item" | "add_to_cart" | "remove_from_cart" | "begin_checkout" | "add_payment_info" | "purchase",
  payload: { items: EcommerceItem[]; value?: number; transactionId?: string; paymentType?: string },
) {
  if (typeof window === "undefined") return;
  const w = window as AnalyticsWindow;
  const value = payload.value ?? payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  w.dataLayer?.push({ ecommerce: null });
  w.dataLayer?.push({
    event,
    ecommerce: {
      currency: CURRENCY,
      value,
      ...(payload.transactionId ? { transaction_id: payload.transactionId } : {}),
      ...(payload.paymentType ? { payment_type: payload.paymentType } : {}),
      items: payload.items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
        ...(item.variant ? { item_variant: item.variant } : {}),
        ...(item.category ? { item_category: item.category } : {}),
      })),
    },
  });

  const pixelEvent = {
    view_item: "ViewContent",
    add_to_cart: "AddToCart",
    begin_checkout: "InitiateCheckout",
    add_payment_info: "AddPaymentInfo",
    purchase: "Purchase",
    remove_from_cart: null,
  }[event];

  if (pixelEvent && typeof w.fbq === "function") {
    w.fbq("track", pixelEvent, {
      currency: CURRENCY,
      value,
      content_ids: payload.items.map((item) => item.id),
      content_type: "product",
    });
  }
}
