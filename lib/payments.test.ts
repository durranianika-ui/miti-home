import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { verifyStripeSignature } from "./payments/stripe.ts";
import { PaymentProviderError } from "./payments/types.ts";
import { renderEmailLayout, escapeHtml } from "./email-layout.ts";

const SECRET = "whsec_test_secret";

function sign(body: string, timestamp: number, secret = SECRET) {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

test("Stripe webhook signatures are verified with the endpoint secret", () => {
  const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const now = Date.UTC(2026, 8, 18, 12, 0, 0);
  const timestamp = Math.floor(now / 1000);

  assert.doesNotThrow(() => verifyStripeSignature(body, sign(body, timestamp), SECRET, now));
  assert.throws(() => verifyStripeSignature(body, sign(body, timestamp, "wrong"), SECRET, now), PaymentProviderError);
  assert.throws(() => verifyStripeSignature(`${body} `, sign(body, timestamp), SECRET, now), /Invalid Stripe webhook signature/);
  assert.throws(() => verifyStripeSignature(body, null, SECRET, now), /Missing Stripe-Signature/);
});

test("Stripe webhook replay outside the five-minute tolerance is rejected", () => {
  const body = "{}";
  const now = Date.UTC(2026, 8, 18, 12, 0, 0);
  const stale = Math.floor(now / 1000) - 301;

  assert.throws(() => verifyStripeSignature(body, sign(body, stale), SECRET, now), /outside tolerance/);
});

test("branded email layout escapes content and carries the Miti Home identity", () => {
  const html = renderEmailLayout({
    appUrl: "https://mitihome.ae",
    heading: "Your order <is> confirmed",
    bodyHtml: `<p>${escapeHtml("<script>alert(1)</script>")}</p>`,
    previewText: "Preview & more",
  });

  assert.match(html, /Your order &lt;is&gt; confirmed/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /https:\/\/mitihome\.ae\/brand\/miti-home-logo\.png/);
  assert.match(html, /Luxury Living/);
  assert.doesNotMatch(html, /xilar/i);
});
