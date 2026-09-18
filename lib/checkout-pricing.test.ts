import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertProviderAmountMatchesQuote,
  buildCheckoutQuoteFromVerifiedItems,
} from "./checkout/pricing.ts";
import { COD_FEE, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "./constants.ts";

const verifiedItems = [
  {
    productId: "p1",
    productName: "Moai Tissue Box",
    productImage: "/products/moai-tissue-box-silver/1.webp",
    size: "Standard",
    quantity: 1,
    unitPrice: 239,
    totalPrice: 239,
  },
  {
    productId: "p2",
    productName: "Pebble Tissue Box",
    productImage: "/products/pebble-tissue-box/1.webp",
    size: "Standard",
    color: "Black",
    quantity: 2,
    unitPrice: 159,
    totalPrice: 318,
  },
];

describe("checkout pricing (AED)", () => {
  it("builds a server-priced COD quote with set savings, coupon, delivery, COD fee and VAT", () => {
    const quote = buildCheckoutQuoteFromVerifiedItems({
      items: verifiedItems,
      paymentMethod: "cod",
      comboDiscount: 30,
      couponDiscount: 20,
      couponCode: "welcome20",
    });

    assert.equal(quote.subtotal, 557);
    assert.equal(quote.discount, 50);
    assert.equal(quote.shippingCost, 557 >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE);
    assert.equal(quote.codFee, COD_FEE);
    assert.equal(quote.total, 557 - 50 + quote.shippingCost + COD_FEE);
    assert.equal(quote.couponCode, "WELCOME20");
    // Prices are VAT-inclusive: VAT is the 5/105 share of the total.
    assert.equal(quote.vatAmount, Math.round(((quote.total * 0.05) / 1.05) * 100) / 100);
  });

  it("charges delivery below the free-delivery threshold and never lets discounts invert the total", () => {
    const quote = buildCheckoutQuoteFromVerifiedItems({
      items: [{ productId: "p1", productName: "Keyring", size: "Duck", quantity: 1, unitPrice: 39, totalPrice: 39 }],
      paymentMethod: "card",
      comboDiscount: 20,
      couponDiscount: 50,
    });

    assert.equal(quote.subtotal, 39);
    assert.equal(quote.shippingCost, SHIPPING_FEE);
    assert.equal(quote.codFee, 0);
    assert.equal(quote.discount, 38);
    assert.equal(quote.total, 1 + SHIPPING_FEE);
  });

  it("rejects mismatched item totals before quote creation", () => {
    assert.throws(
      () =>
        buildCheckoutQuoteFromVerifiedItems({
          items: [{ ...verifiedItems[1], totalPrice: 300 }],
          paymentMethod: "card",
        }),
      /Price total mismatch/
    );
  });

  it("requires the provider to settle the exact AED amount (one fils tolerance)", () => {
    const quote = buildCheckoutQuoteFromVerifiedItems({ items: verifiedItems, paymentMethod: "card" });
    const minor = Math.round(quote.total * 100);

    assert.doesNotThrow(() =>
      assertProviderAmountMatchesQuote({ quoteTotal: quote.total, paidAmountMinor: minor + 1, paidCurrency: "aed", expectedCurrency: "AED" })
    );
    assert.throws(
      () => assertProviderAmountMatchesQuote({ quoteTotal: quote.total, paidAmountMinor: minor - 100, paidCurrency: "AED", expectedCurrency: "AED" }),
      /Payment amount mismatch/
    );
    assert.throws(
      () => assertProviderAmountMatchesQuote({ quoteTotal: quote.total, paidAmountMinor: minor, paidCurrency: "USD", expectedCurrency: "AED" }),
      /currency mismatch/
    );
  });
});
