import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCustomerCodCancellationFailure } from "./order-cancellation.ts";

describe("COD order cancellation eligibility", () => {
  it("allows owner-owned COD orders while pending or confirmed", () => {
    for (const status of ["pending", "confirmed"]) {
      assert.equal(
        getCustomerCodCancellationFailure({ orderUserId: "user-1", currentUserId: "user-1", paymentMethod: "cod", status }),
        null
      );
    }
  });

  it("rejects other users, card-paid orders, and dispatched orders", () => {
    assert.equal(
      getCustomerCodCancellationFailure({ orderUserId: "user-2", currentUserId: "user-1", paymentMethod: "cod", status: "pending" }),
      "You can only cancel your own orders"
    );

    assert.match(
      getCustomerCodCancellationFailure({ orderUserId: "user-1", currentUserId: "user-1", paymentMethod: "card", status: "pending" }) ?? "",
      /Paid orders are cancelled by our team/
    );

    assert.equal(
      getCustomerCodCancellationFailure({ orderUserId: "user-1", currentUserId: "user-1", paymentMethod: "cod", status: "shipped" }),
      "Cannot cancel an order that is already shipped"
    );
  });
});
