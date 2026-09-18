import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSecurityTxt, SECURITY_TXT_CONTENT_TYPE } from "./security-txt.ts";

test("security.txt advertises the Miti Home contact, expiry and canonical file", () => {
  const body = buildSecurityTxt("https://mitihome.ae/", new Date("2026-09-18T00:00:00.000Z"));

  assert.match(body, /^Contact: mailto:[^@\s]+@[^@\s]+$/m);
  assert.doesNotMatch(body, /xilar/i);
  assert.match(body, /^Expires: 2027-09-18T00:00:00\.000Z$/m);
  assert.match(body, /^Canonical: https:\/\/mitihome\.ae\/\.well-known\/security\.txt$/m);
  assert.match(body, /^Preferred-Languages: en, ar$/m);
  assert.ok(body.endsWith("\n"));
});

test("security.txt content type is plain text", () => {
  assert.equal(SECURITY_TXT_CONTENT_TYPE, "text/plain; charset=utf-8");
});
