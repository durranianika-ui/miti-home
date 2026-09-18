/**
 * Miti Home email chrome shared by transactional and marketing emails.
 * Table-based, inline-styled HTML for broad client support.
 * Keep this file free of `@/` imports: it is loaded by the node test runner.
 */
import { BRAND, CONTACT } from "./brand.ts";

export const EMAIL_COLORS = {
  page: "#F7F5F0",
  card: "#FFFFFF",
  ink: "#0D0D0D",
  body: "#3A3632",
  muted: "#8C7F72",
  gold: "#C8A96A",
  goldText: "#8A6B32",
  rule: "#E6DFD4",
} as const;

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function absoluteUrl(value: string, appUrl: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value, appUrl).toString();
}

export function paragraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:${EMAIL_COLORS.body};font-size:15px;line-height:1.7;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

export function emailButton(label: string, href: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
      <tr>
        <td bgcolor="${EMAIL_COLORS.ink}" style="padding:14px 26px;">
          <a href="${escapeHtml(href)}" style="color:#FFFFFF;text-decoration:none;font-size:12px;text-transform:uppercase;letter-spacing:0.2em;font-weight:600;font-family:Montserrat,Arial,sans-serif;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
}

function wordmark(appUrl: string) {
  const logoUrl = absoluteUrl("/brand/miti-home-logo.png", appUrl);
  return `
    <a href="${escapeHtml(appUrl)}" style="text-decoration:none;">
      <img src="${escapeHtml(logoUrl)}" width="132" alt="${escapeHtml(BRAND.name)} — ${escapeHtml(BRAND.tagline)}" style="width:132px;height:auto;display:block;margin:0 auto;border:0;" />
    </a>`;
}

export type EmailLayoutInput = {
  appUrl: string;
  previewText?: string;
  eyebrow?: string;
  heading: string;
  bodyHtml: string;
  footerNote?: string;
  footerLinkHtml?: string;
};

export function renderEmailLayout(input: EmailLayoutInput) {
  const preview = input.previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">${escapeHtml(input.previewText)}</div>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>${escapeHtml(input.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:${EMAIL_COLORS.page};font-family:Lato,Helvetica,Arial,sans-serif;color:${EMAIL_COLORS.ink};">
    ${preview}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${EMAIL_COLORS.page};">
      <tr>
        <td align="center" style="padding:32px 14px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${EMAIL_COLORS.card};border:1px solid ${EMAIL_COLORS.rule};">
            <tr>
              <td align="center" style="padding:36px 32px 20px;border-bottom:1px solid ${EMAIL_COLORS.rule};">
                ${wordmark(input.appUrl)}
              </td>
            </tr>
            <tr>
              <td style="padding:36px 36px 32px;">
                ${input.eyebrow ? `<p style="margin:0 0 12px;color:${EMAIL_COLORS.goldText};font-size:11px;letter-spacing:0.3em;text-transform:uppercase;font-family:Montserrat,Arial,sans-serif;">${escapeHtml(input.eyebrow)}</p>` : ""}
                <h1 style="margin:0 0 22px;color:${EMAIL_COLORS.ink};font-size:26px;line-height:1.25;font-weight:400;letter-spacing:0.04em;font-family:Montserrat,Arial,sans-serif;">${escapeHtml(input.heading)}</h1>
                ${input.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 36px 30px;border-top:1px solid ${EMAIL_COLORS.rule};color:${EMAIL_COLORS.muted};font-size:12px;line-height:1.7;">
                ${input.footerNote ? `<p style="margin:0 0 8px;">${escapeHtml(input.footerNote)}</p>` : ""}
                <p style="margin:0 0 8px;">${escapeHtml(BRAND.name)} · ${escapeHtml(CONTACT.address)} · <a href="mailto:${escapeHtml(CONTACT.email)}" style="color:${EMAIL_COLORS.muted};">${escapeHtml(CONTACT.email)}</a></p>
                ${input.footerLinkHtml ?? ""}
                <p style="margin:12px 0 0;color:${EMAIL_COLORS.goldText};letter-spacing:0.28em;text-transform:uppercase;font-size:10px;font-family:Montserrat,Arial,sans-serif;">${escapeHtml(BRAND.tagline)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
