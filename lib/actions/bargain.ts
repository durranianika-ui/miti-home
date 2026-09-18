import "server-only";

// Not a Server Action on purpose: only /api/bargain may mint concierge coupons,
// after it has computed the amount within the configured caps. Exposing this
// as "use server" would let any client mint a coupon of any value.

import { db } from "@/lib/db";
import { bargainSessions, coupons } from "@/lib/db/schema";
import { generateSecureCode } from "@/lib/utils";

/** Concierge courtesies are single-use and reserved for five minutes. */
const BARGAIN_COUPON_EXPIRY_MS = 5 * 60 * 1000;

function generateBargainCouponCode() {
  return generateSecureCode("BRG-", 6);
}

export async function createBargainCoupon(input: {
  userId: string;
  cartTotal: number;
  discountAmount: number;
}) {
  if (!Number.isFinite(input.discountAmount) || input.discountAmount <= 0) {
    throw new Error("Invalid courtesy amount");
  }

  const code = generateBargainCouponCode();
  const expiresAt = new Date(Date.now() + BARGAIN_COUPON_EXPIRY_MS);

  await db.transaction(async (tx) => {
    await tx.insert(coupons).values({
      code,
      discountType: "fixed",
      discountValue: input.discountAmount.toString(),
      maxUses: 1,
      usedCount: 0,
      userId: input.userId,
      isBargainGenerated: true,
      expiresAt,
      validFrom: new Date(),
      validUntil: expiresAt,
      isActive: true,
    });

    await tx.insert(bargainSessions).values({
      userId: input.userId,
      couponCode: code,
      cartValue: input.cartTotal.toString(),
      discountAmount: input.discountAmount.toString(),
      used: false,
      expiresAt,
    });
  });

  return {
    code,
    discountAmount: input.discountAmount,
    expiresAt,
  };
}
