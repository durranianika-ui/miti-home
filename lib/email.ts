import { Resend, type CreateBatchOptions } from "resend";
import { eq } from "drizzle-orm";
import { BRAND, CONTACT } from "@/lib/brand";
import { db } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";
import { EMAIL_COLORS, emailButton, escapeHtml, renderEmailLayout } from "@/lib/email-layout";
import { formatPriceExact } from "@/lib/money";
import { normalizeSiteUrl } from "@/lib/seo";
import { formatUaeAddressLines, formatUaePhone, fullName } from "@/lib/uae";

/**
 * Transactional email via Resend. Sender identity is environment-driven:
 *   RESEND_API_KEY, RESEND_FROM_EMAIL ("Miti Home <orders@your-domain>"),
 *   RESEND_REPLY_TO (optional).
 * Without an API key, non-critical emails are skipped with a log line so the
 * store keeps working in development and previews.
 */

let _resend: Resend | null = null;

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY environment variable is not set");
    _resend = new Resend(apiKey);
  }
  return _resend;
}

function getFromEmail() {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (from) return from;
  if (process.env.NODE_ENV === "production") {
    throw new Error("RESEND_FROM_EMAIL environment variable is required in production");
  }
  // Resend's shared test sender — only delivers to the account owner's address.
  return `${BRAND.name} <onboarding@resend.dev>`;
}

function replyTo() {
  return process.env.RESEND_REPLY_TO?.trim() || (CONTACT.emailIsPlaceholder ? undefined : CONTACT.email);
}

async function send(message: { to: string; subject: string; html: string; text?: string }, options: { critical?: boolean } = {}) {
  if (!isEmailConfigured()) {
    const note = `[email skipped: RESEND_API_KEY not set] "${message.subject}" → ${message.to}`;
    if (options.critical) throw new Error(note);
    console.info(note);
    return;
  }

  const { error } = await getResend().emails.send({
    from: getFromEmail(),
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    replyTo: replyTo(),
  });

  if (error) throw new Error(error.message);
}

// ============================================
// ACCOUNT EMAILS
// ============================================

export async function sendResetPasswordEmail(user: { email: string; name: string }, url: string) {
  const appUrl = normalizeSiteUrl();
  const html = renderEmailLayout({
    appUrl,
    previewText: "Reset your Miti Home password",
    eyebrow: "Account",
    heading: "Reset your password",
    bodyHtml: `
      <p style="margin:0 0 16px;color:${EMAIL_COLORS.body};font-size:15px;line-height:1.7;">Hi ${escapeHtml(user.name || "there")},</p>
      <p style="margin:0 0 16px;color:${EMAIL_COLORS.body};font-size:15px;line-height:1.7;">We received a request to reset the password for your ${escapeHtml(BRAND.name)} account. Choose a new password using the button below.</p>
      ${emailButton("Reset password", url)}
      <p style="margin:18px 0 0;color:${EMAIL_COLORS.muted};font-size:13px;line-height:1.6;">If you didn't ask for this, you can ignore this email — your password won't change. The link expires in one hour.</p>
    `,
  });
  await send({ to: user.email, subject: `Reset your ${BRAND.name} password`, html }, { critical: true });
}

export async function sendVerificationEmail(user: { email: string; name: string }, url: string) {
  const appUrl = normalizeSiteUrl();
  const html = renderEmailLayout({
    appUrl,
    previewText: "Confirm your email address",
    eyebrow: "Account",
    heading: "Confirm your email",
    bodyHtml: `
      <p style="margin:0 0 16px;color:${EMAIL_COLORS.body};font-size:15px;line-height:1.7;">Hi ${escapeHtml(user.name || "there")}, please confirm this is the right address for order updates and account security.</p>
      ${emailButton("Confirm email", url)}
    `,
  });
  await send({ to: user.email, subject: `Confirm your email for ${BRAND.name}`, html });
}

export async function sendWelcomeEmail(user: { email: string; name: string }) {
  const appUrl = normalizeSiteUrl();
  const html = renderEmailLayout({
    appUrl,
    previewText: BRAND.shortDescription,
    eyebrow: BRAND.tagline,
    heading: `Welcome to ${BRAND.name}`,
    bodyHtml: `
      <p style="margin:0 0 16px;color:${EMAIL_COLORS.body};font-size:15px;line-height:1.7;">Hi ${escapeHtml(user.name || "there")},</p>
      <p style="margin:0 0 16px;color:${EMAIL_COLORS.body};font-size:15px;line-height:1.7;">${escapeHtml(BRAND.description)}</p>
      <p style="margin:0 0 20px;color:${EMAIL_COLORS.body};font-size:15px;line-height:1.7;">Your account keeps your wishlist, delivery address and orders in one place.</p>
      ${emailButton("Explore the collection", `${appUrl}/shop`)}
    `,
  });
  await send({ to: user.email, subject: `Welcome to ${BRAND.name}`, html });
}

// ============================================
// ORDER EMAILS
// ============================================

type OrderWithItems = typeof orders.$inferSelect & { items: (typeof orderItems.$inferSelect)[] };

async function loadOrder(orderId: string): Promise<OrderWithItems | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return { ...order, items };
}

export function orderNumber(orderId: string) {
  return `MH-${orderId.slice(0, 8).toUpperCase()}`;
}

function summaryRow(label: string, value: string, strong = false) {
  const weight = strong ? "font-weight:700;color:" + EMAIL_COLORS.ink + ";" : "color:" + EMAIL_COLORS.body + ";";
  return `<tr>
    <td style="padding:6px 0;font-size:14px;${weight}">${escapeHtml(label)}</td>
    <td align="right" style="padding:6px 0;font-size:14px;${weight}">${escapeHtml(value)}</td>
  </tr>`;
}

export function renderOrderSummaryHtml(order: OrderWithItems) {
  const items = order.items
    .map((item) => {
      const options = [item.size !== "Standard" ? item.size : null, item.color].filter(Boolean).join(" · ");
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${EMAIL_COLORS.rule};font-size:14px;color:${EMAIL_COLORS.ink};">
          ${escapeHtml(item.productName)}${options ? `<br><span style="color:${EMAIL_COLORS.muted};font-size:12px;">${escapeHtml(options)}</span>` : ""}
          <br><span style="color:${EMAIL_COLORS.muted};font-size:12px;">Qty ${item.quantity}</span>
        </td>
        <td align="right" valign="top" style="padding:10px 0;border-bottom:1px solid ${EMAIL_COLORS.rule};font-size:14px;color:${EMAIL_COLORS.ink};">${escapeHtml(formatPriceExact(item.totalPrice))}</td>
      </tr>`;
    })
    .join("");

  const discount = Number(order.discount);
  const codFee = Number(order.codFee ?? 0);
  const address = order.shippingAddress;
  const addressLines = formatUaeAddressLines(address);

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px;">${items}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${summaryRow("Subtotal", formatPriceExact(order.subtotal))}
      ${discount > 0 ? summaryRow(order.couponCode ? `Discount (${order.couponCode})` : "Discount", `-${formatPriceExact(discount)}`) : ""}
      ${summaryRow("Delivery", Number(order.shipping) === 0 ? "Complimentary" : formatPriceExact(order.shipping))}
      ${codFee > 0 ? summaryRow("Cash on delivery fee", formatPriceExact(codFee)) : ""}
      ${summaryRow("Total", formatPriceExact(order.total), true)}
      ${Number(order.vatAmount) > 0 ? `<tr><td colspan="2" style="padding:2px 0 0;font-size:12px;color:${EMAIL_COLORS.muted};">Includes VAT of ${escapeHtml(formatPriceExact(order.vatAmount))}</td></tr>` : ""}
    </table>
    ${address ? `
    <p style="margin:26px 0 6px;color:${EMAIL_COLORS.goldText};font-size:11px;letter-spacing:0.24em;text-transform:uppercase;font-family:Montserrat,Arial,sans-serif;">Delivering to</p>
    <p style="margin:0;color:${EMAIL_COLORS.body};font-size:14px;line-height:1.7;">
      ${escapeHtml(fullName(address))}<br>
      ${addressLines.map(escapeHtml).join("<br>")}<br>
      ${escapeHtml(address.phone ? formatUaePhone(address.phone) : "")}
    </p>
    ${address.instructions ? `<p style="margin:8px 0 0;color:${EMAIL_COLORS.muted};font-size:13px;">Note: ${escapeHtml(address.instructions)}</p>` : ""}` : ""}
  `;
}

export async function sendOrderConfirmationEmail(orderId: string) {
  const order = await loadOrder(orderId);
  const to = order?.customerEmail ?? order?.shippingAddress?.email;
  if (!order || !to) return;

  const appUrl = normalizeSiteUrl();
  const paymentLine = order.paymentMethod === "cod"
    ? `You'll pay ${formatPriceExact(order.total)} in cash or by card to the courier on delivery.`
    : "Your payment has been received.";

  const html = renderEmailLayout({
    appUrl,
    previewText: `Order ${orderNumber(order.id)} confirmed`,
    eyebrow: `Order ${orderNumber(order.id)}`,
    heading: "Thank you — your order is confirmed",
    bodyHtml: `
      <p style="margin:0 0 16px;color:${EMAIL_COLORS.body};font-size:15px;line-height:1.7;">Hi ${escapeHtml(order.shippingAddress?.firstName || "there")}, we're preparing your pieces with care. ${escapeHtml(paymentLine)} We'll email you again when your order is on its way.</p>
      ${renderOrderSummaryHtml(order)}
      <div style="height:18px"></div>
      ${emailButton("View your order", `${appUrl}/orders`)}
    `,
    footerNote: "Questions about your order? Just reply to this email.",
  });

  await send({ to, subject: `Your ${BRAND.name} order ${orderNumber(order.id)} is confirmed`, html });
}

const STATUS_COPY: Record<string, { heading: string; body: string } | undefined> = {
  confirmed: { heading: "Your order is confirmed", body: "We've confirmed your order and are preparing it for dispatch." },
  processing: { heading: "We're preparing your order", body: "Your pieces are being checked and packed." },
  shipped: { heading: "Your order is on its way", body: "Your order has left our studio and is with our delivery partner." },
  delivered: { heading: "Your order has been delivered", body: "We hope your new pieces bring beauty to your everyday. We'd love to hear what you think." },
  cancelled: { heading: "Your order has been cancelled", body: "Your order has been cancelled. If you paid by card, the refund goes back to the original payment method — banks usually show it within 5–10 working days." },
};

export async function sendOrderStatusEmail(orderId: string) {
  const order = await loadOrder(orderId);
  const copy = order ? STATUS_COPY[order.status] : undefined;
  const to = order?.customerEmail ?? order?.shippingAddress?.email;
  if (!order || !copy || !to) return;

  const appUrl = normalizeSiteUrl();
  const tracking = order.status === "shipped" && (order.courier || order.trackingNumber)
    ? `<p style="margin:0 0 18px;color:${EMAIL_COLORS.body};font-size:15px;line-height:1.7;">${order.courier ? `Courier: <strong>${escapeHtml(order.courier)}</strong><br>` : ""}${order.trackingNumber ? `Tracking number: <strong>${escapeHtml(order.trackingNumber)}</strong>` : ""}</p>`
    : "";

  const html = renderEmailLayout({
    appUrl,
    previewText: copy.heading,
    eyebrow: `Order ${orderNumber(order.id)}`,
    heading: copy.heading,
    bodyHtml: `
      <p style="margin:0 0 16px;color:${EMAIL_COLORS.body};font-size:15px;line-height:1.7;">Hi ${escapeHtml(order.shippingAddress?.firstName || "there")}, ${escapeHtml(copy.body)}</p>
      ${tracking}
      ${emailButton("View your order", `${appUrl}/orders`)}
    `,
  });

  await send({ to, subject: `${copy.heading} · ${orderNumber(order.id)}`, html });
}

// ============================================
// MARKETING
// ============================================

export type MarketingBatchEmail = {
  to: string;
  subject: string;
  html: string;
  previewText?: string;
};

export async function sendMarketingEmailBatch(messages: MarketingBatchEmail[]) {
  if (messages.length === 0) {
    return { data: [], errors: [] };
  }

  if (messages.length > 100) {
    throw new Error("Resend batch sends support at most 100 emails per request");
  }

  const payload: CreateBatchOptions = messages.map((message) => ({
    from: getFromEmail(),
    to: [message.to],
    subject: message.subject,
    html: message.html,
    text: message.previewText,
    replyTo: replyTo(),
  }));

  const { data, error } = await getResend().batch.send(payload, {
    batchValidation: "permissive",
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    data: data?.data ?? [],
    errors: data?.errors ?? [],
  };
}
