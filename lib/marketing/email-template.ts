import { MARKETING_PRODUCT_SELECTION_LIMIT, type CampaignDraftInput, type CampaignProduct, type CampaignRecipient } from "./types.ts";
import { createUnsubscribeToken } from "./unsubscribe-token.ts";
import { buildProductUrl } from "../seo.ts";
import { BRAND } from "../brand.ts";
import { formatPrice } from "../money.ts";
import { EMAIL_COLORS, absoluteUrl, emailButton, escapeHtml, paragraphs, renderEmailLayout } from "../email-layout.ts";

export { escapeHtml };

type CampaignEmailInput = {
  draft: CampaignDraftInput;
  recipient: CampaignRecipient;
  products: CampaignProduct[];
  appUrl: string;
};

function normalizeEmailProductImage(image: string, appUrl: string) {
  const absolute = absoluteUrl(image, appUrl);
  if (!absolute.includes("res.cloudinary.com") || !absolute.includes("/upload/")) {
    return absolute;
  }

  const [prefix, suffix] = absolute.split("/upload/");
  if (!prefix || !suffix) return absolute;

  return `${prefix}/upload/f_auto,q_auto,c_fill,g_auto,w_480,h_600/${suffix}`;
}

function renderProduct(product: CampaignProduct, appUrl: string) {
  const productUrl = buildProductUrl(product.slug, appUrl);
  const image = product.image
    ? `<img src="${escapeHtml(normalizeEmailProductImage(product.image, appUrl))}" width="240" height="240" alt="${escapeHtml(product.name)}" style="width:240px;height:240px;max-width:100%;object-fit:cover;display:block;border:1px solid ${EMAIL_COLORS.rule};background:${EMAIL_COLORS.page};" />`
    : `<div style="width:100%;max-width:240px;height:240px;border:1px solid ${EMAIL_COLORS.rule};background:${EMAIL_COLORS.page};"></div>`;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td>
          <a href="${escapeHtml(productUrl)}" style="color:${EMAIL_COLORS.ink};text-decoration:none;display:block;">
            ${image}
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding-top:10px;">
          <a href="${escapeHtml(productUrl)}" style="color:${EMAIL_COLORS.ink};text-decoration:none;font-size:12px;line-height:1.4;text-transform:uppercase;letter-spacing:0.1em;font-family:Montserrat,Arial,sans-serif;">${escapeHtml(product.name)}</a>
        </td>
      </tr>
      <tr>
        <td style="padding-top:4px;color:${EMAIL_COLORS.muted};font-size:13px;">${escapeHtml(formatPrice(product.sellingPrice))}</td>
      </tr>
    </table>
  `;
}

function renderProductRows(products: CampaignProduct[], appUrl: string) {
  const visibleProducts = products.slice(0, MARKETING_PRODUCT_SELECTION_LIMIT);
  const rows: string[] = [];

  for (let index = 0; index < visibleProducts.length; index += 2) {
    const left = visibleProducts[index];
    const right = visibleProducts[index + 1];
    rows.push(`
      <tr>
        <td width="50%" valign="top" style="padding:0 9px 24px 0;">
          ${left ? renderProduct(left, appUrl) : ""}
        </td>
        <td width="50%" valign="top" style="padding:0 0 24px 9px;">
          ${right ? renderProduct(right, appUrl) : ""}
        </td>
      </tr>
    `);
  }

  return rows.join("");
}

export function buildCampaignEmailHtml({ draft, recipient, products, appUrl }: CampaignEmailInput) {
  const ctaUrl = absoluteUrl(draft.ctaUrl, appUrl);
  const unsubscribeToken = createUnsubscribeToken(recipient.email);
  const unsubscribeUrl = new URL("/unsubscribe/marketing", appUrl);
  unsubscribeUrl.searchParams.set("token", unsubscribeToken);
  const safeName = escapeHtml(recipient.name || "there");

  const productsHtml = products.length > 0
    ? `<h2 style="margin:28px 0 18px;padding-top:24px;border-top:1px solid ${EMAIL_COLORS.rule};color:${EMAIL_COLORS.ink};font-size:12px;text-transform:uppercase;letter-spacing:0.24em;font-weight:500;font-family:Montserrat,Arial,sans-serif;">Featured pieces</h2>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${renderProductRows(products, appUrl)}</table>`
    : "";

  return renderEmailLayout({
    appUrl,
    previewText: draft.previewText,
    eyebrow: `${BRAND.name} journal`,
    heading: draft.headline,
    bodyHtml: `
      <p style="margin:0 0 18px;color:${EMAIL_COLORS.muted};font-size:14px;line-height:1.6;">Hi ${safeName},</p>
      ${paragraphs(draft.body)}
      ${emailButton(draft.ctaLabel, ctaUrl)}
      ${productsHtml}
    `,
    footerNote: `You are receiving this because you have a ${BRAND.name} account or order history.`,
    footerLinkHtml: `<a href="${escapeHtml(unsubscribeUrl.toString())}" style="color:${EMAIL_COLORS.muted};">Unsubscribe from ${escapeHtml(BRAND.name)} marketing emails</a>`,
  });
}
