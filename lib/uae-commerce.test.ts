import assert from "node:assert/strict";
import { test } from "node:test";
import { discountPercent, formatPrice, formatPriceExact, toMinorUnits, vatPortion } from "./money.ts";
import {
  formatUaeAddressLines,
  formatUaePhone,
  normalizeUaePhone,
  sanitizeUaeAddress,
  validateUaeAddress,
} from "./uae.ts";
import { getCodUnavailableReason } from "./checkout/cod.ts";
import { COD_MAX_ORDER_TOTAL, UAE_EMIRATES } from "./constants.ts";
import { parseCatalogSearchParams, catalogQueryToSearchParams } from "./catalog-query.ts";

test("prices are formatted in AED consistently", () => {
  assert.equal(formatPrice(1250), "AED 1,250");
  assert.equal(formatPrice("99.5"), "AED 99.50");
  assert.equal(formatPrice(null), "AED 0");
  assert.equal(formatPriceExact(10), "AED 10.00");
  assert.equal(formatPrice(-25), "-AED 25");
  assert.equal(toMinorUnits(239.99), 23999);
});

test("discount percentage and VAT portion follow UAE VAT-inclusive pricing", () => {
  assert.equal(discountPercent(129, 99), 23);
  assert.equal(discountPercent(99, 99), null);
  assert.equal(vatPortion(105), 5);
  assert.equal(vatPortion(0), 0);
});

test("UAE phone numbers normalise to E.164 and reject non-UAE numbers", () => {
  assert.equal(normalizeUaePhone("050 123 4567"), "+971501234567");
  assert.equal(normalizeUaePhone("+971 55 765 4321"), "+971557654321");
  assert.equal(normalizeUaePhone("00971 4 123 4567"), "+97141234567");
  assert.equal(normalizeUaePhone("0501234"), null);
  assert.equal(normalizeUaePhone("+91 98765 43210"), null);
  assert.equal(formatUaePhone("+971501234567"), "+971 50 123 4567");
});

const validAddress = {
  firstName: " Aisha ",
  lastName: "Rahman",
  email: "AISHA@example.com",
  phone: "0501234567",
  emirate: "Dubai",
  area: "Dubai Marina",
  building: "Marina Heights",
  apartment: "Apt 1204",
  street: "",
  instructions: "Call on arrival",
};

test("UAE address validation requires emirate, area and building, not a PIN code", () => {
  assert.deepEqual(validateUaeAddress(validAddress), {});
  const errors = validateUaeAddress({ ...validAddress, emirate: "Mumbai", area: "", building: "", phone: "12345" });
  assert.equal(errors.emirate, "Select a UAE emirate");
  assert.ok(errors.area);
  assert.ok(errors.building);
  assert.ok(errors.phone);
  assert.equal(UAE_EMIRATES.length, 7);
});

test("sanitised addresses are trimmed, lower-cased email, E.164 phone and drop unknown keys", () => {
  const clean = sanitizeUaeAddress({ ...validAddress, pincode: "144411", injected: "<script>" });
  assert.equal(clean.firstName, "Aisha");
  assert.equal(clean.email, "aisha@example.com");
  assert.equal(clean.phone, "+971501234567");
  assert.equal("pincode" in clean, false);
  assert.equal("injected" in clean, false);
  assert.throws(() => sanitizeUaeAddress({ ...validAddress, building: "" }), /Building or villa is required/);
  assert.deepEqual(formatUaeAddressLines(clean), ["Apt 1204, Marina Heights", "Dubai Marina, Dubai", "United Arab Emirates"]);
});

test("cash on delivery respects the emirate list and the maximum order value", () => {
  assert.equal(getCodUnavailableReason({ emirate: "Dubai", total: 300 }), null);
  assert.match(getCodUnavailableReason({ emirate: "Dubai", total: COD_MAX_ORDER_TOTAL + 1 }) ?? "", /up to AED/);
  assert.match(getCodUnavailableReason({ emirate: "Nowhere", total: 100 }) ?? "", /isn't available/);
});

test("catalogue URL parameters are parsed defensively", () => {
  const query = parseCatalogSearchParams(
    new URLSearchParams("category=Lighting&collection=the-silver-edit&minPrice=-5&maxPrice=400&sort=price-asc&availability=in-stock&color=Mirror%20Silver&isNew=true&category2=x"),
  );
  assert.equal(query.category, "lighting");
  assert.equal(query.collection, "the-silver-edit");
  assert.equal(query.minPrice, null);
  assert.equal(query.maxPrice, "400");
  assert.equal(query.sort, "price-asc");
  assert.equal(query.availability, "in-stock");
  assert.equal(query.color, "Mirror Silver");
  assert.equal(query.isNew, true);
  assert.equal(parseCatalogSearchParams(new URLSearchParams("category=../../etc&sort=drop")).category, null);
  assert.equal(parseCatalogSearchParams(new URLSearchParams("sort=drop")).sort, null);
  assert.equal(catalogQueryToSearchParams({ category: "lighting", isNew: false, onSale: true, includeTotal: true }).toString(), "category=lighting&onSale=true");
});
