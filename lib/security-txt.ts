import { CONTACT } from "./brand.ts";
import { normalizeSiteUrl } from "./seo.ts";

export const SECURITY_TXT_CONTENT_TYPE = "text/plain; charset=utf-8";

export function buildSecurityTxt(baseUrl = normalizeSiteUrl(), now = new Date()) {
  const normalizedBaseUrl = normalizeSiteUrl(baseUrl);
  const expires = new Date(now);
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);

  return [
    `Contact: mailto:${CONTACT.securityEmail}`,
    `Expires: ${expires.toISOString()}`,
    `Canonical: ${normalizedBaseUrl}/.well-known/security.txt`,
    "Preferred-Languages: en, ar",
    "",
  ].join("\n");
}
