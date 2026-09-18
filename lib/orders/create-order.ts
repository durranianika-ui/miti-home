import "server-only";

import { and, eq, gt, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bargainSessions,
  coupons,
  orderItems,
  orders,
  products,
  productVariants,
  user,
  type SavedShippingAddress,
} from "@/lib/db/schema";
import type { CheckoutQuote } from "@/lib/checkout/pricing";
import { calculateCouponDiscount } from "@/lib/coupon-validation";
import { CURRENCY } from "@/lib/constants";
import { formatPrice } from "@/lib/money";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { revalidatePublicInventory } from "@/lib/public-cache-server";

/**
 * The single order intake write path. Coupon consumption, order rows, order
 * item snapshots, stock mutation and customer metrics happen in one
 * transaction. Callers must pass a quote produced by createCheckoutQuote()
 * — never client-supplied prices.
 *
 * This module is server-only and intentionally NOT a "use server" action
 * file, so it cannot be invoked directly from the browser.
 */

export type OrderPaymentMethod = "cod" | "card";

export type CreateOrderRecordInput = {
  userId: string;
  quote: CheckoutQuote;
  shippingAddress: SavedShippingAddress;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: "pending" | "paid";
  paymentProvider?: string | null;
  paymentReference?: string | null;
  paymentTransactionId?: string | null;
};

export type CreateOrderRecordResult =
  | { success: true; orderId: string }
  | { success: false; error: string };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type InventoryItem = {
  productId: string | null;
  productName: string;
  size: string;
  color?: string | null;
  quantity: number;
};

export class OrderRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderRuleError";
  }
}

function describeItem(item: InventoryItem) {
  const options = [item.size, item.color].filter((value) => value && value !== "Standard");
  return options.length > 0 ? `${item.productName} (${options.join(", ")})` : item.productName;
}

function variantColorCondition(item: InventoryItem) {
  return item.color ? eq(productVariants.color, item.color) : isNull(productVariants.color);
}

async function productHasVariants(tx: Tx, productId: string) {
  const [row] = await tx
    .select({ count: sql<number>`count(*)` })
    .from(productVariants)
    .where(eq(productVariants.productId, productId));
  return Number(row?.count ?? 0) > 0;
}

export async function recalculateProductStockFromVariants(tx: Tx, productId: string) {
  const [row] = await tx
    .select({ totalStock: sql<number>`COALESCE(SUM(${productVariants.stock}), 0)` })
    .from(productVariants)
    .where(eq(productVariants.productId, productId));

  await tx
    .update(products)
    .set({ stock: Number(row?.totalStock ?? 0), updatedAt: new Date() })
    .where(eq(products.id, productId));
}

async function decrementStock(tx: Tx, item: InventoryItem) {
  if (!item.productId) throw new OrderRuleError(`${item.productName} is no longer available`);

  const [activeProduct] = await tx
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, item.productId), eq(products.isActive, true)));

  if (!activeProduct) throw new OrderRuleError(`${item.productName} is no longer available`);

  if (await productHasVariants(tx, item.productId)) {
    const updated = await tx
      .update(productVariants)
      .set({ stock: sql`${productVariants.stock} - ${item.quantity}`, updatedAt: new Date() })
      .where(
        and(
          eq(productVariants.productId, item.productId),
          eq(productVariants.size, item.size),
          variantColorCondition(item),
          sql`${productVariants.stock} >= ${item.quantity}`,
        ),
      )
      .returning({ id: productVariants.id });

    if (updated.length === 0) {
      const [variant] = await tx
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.productId, item.productId),
            eq(productVariants.size, item.size),
            variantColorCondition(item),
          ),
        );
      if (!variant) throw new OrderRuleError(`The selected option is unavailable for ${describeItem(item)}`);
      throw new OrderRuleError(`Insufficient stock for ${describeItem(item)}`);
    }

    await recalculateProductStockFromVariants(tx, item.productId);
    return;
  }

  const updated = await tx
    .update(products)
    .set({ stock: sql`${products.stock} - ${item.quantity}`, updatedAt: new Date() })
    .where(
      and(
        eq(products.id, item.productId),
        eq(products.isActive, true),
        sql`${products.stock} >= ${item.quantity}`,
      ),
    )
    .returning({ id: products.id });

  if (updated.length === 0) throw new OrderRuleError(`Insufficient stock for ${describeItem(item)}`);
}

export async function restoreStock(tx: Tx, item: InventoryItem) {
  if (!item.productId) return null;

  if (await productHasVariants(tx, item.productId)) {
    await tx
      .update(productVariants)
      .set({ stock: sql`${productVariants.stock} + ${item.quantity}`, updatedAt: new Date() })
      .where(
        and(
          eq(productVariants.productId, item.productId),
          eq(productVariants.size, item.size),
          variantColorCondition(item),
        ),
      );
    await recalculateProductStockFromVariants(tx, item.productId);
    return item.productId;
  }

  await tx
    .update(products)
    .set({ stock: sql`${products.stock} + ${item.quantity}`, updatedAt: new Date() })
    .where(eq(products.id, item.productId));
  return item.productId;
}

async function consumeCoupon(tx: Tx, code: string, subtotal: number, userId: string, expectedDiscount: number) {
  const couponCode = code.toUpperCase();
  const now = new Date();

  const [coupon] = await tx.select().from(coupons).where(eq(coupons.code, couponCode));

  if (!coupon) throw new OrderRuleError("Invalid coupon code");
  if (!coupon.isActive) throw new OrderRuleError("This coupon is no longer active");
  if (coupon.isBargainGenerated && coupon.expiresAt && coupon.expiresAt < now) {
    throw new OrderRuleError("This private offer has expired");
  }
  if (coupon.validUntil && coupon.validUntil < now) throw new OrderRuleError("This coupon has expired");
  if (coupon.validFrom > now) throw new OrderRuleError("This coupon is not yet valid");
  if (coupon.minOrderValue && subtotal < Number(coupon.minOrderValue)) {
    throw new OrderRuleError(`Minimum order value is ${formatPrice(coupon.minOrderValue)}`);
  }
  if (coupon.userId && coupon.userId !== userId) {
    throw new OrderRuleError("This coupon is not valid for your account");
  }
  if (coupon.forNewUsersOnly) {
    const [account] = await tx.select({ ordersCount: user.ordersCount }).from(user).where(eq(user.id, userId));
    if ((account?.ordersCount ?? 0) > 0) throw new OrderRuleError("This coupon is for first orders only");
  }

  const discount = calculateCouponDiscount(coupon, subtotal);
  if (Math.abs(discount - expectedDiscount) > 0.01) {
    throw new OrderRuleError("Coupon discount changed. Please re-apply the coupon.");
  }

  const consumed = await tx
    .update(coupons)
    .set({ usedCount: sql`${coupons.usedCount} + 1` })
    .where(
      and(
        eq(coupons.id, coupon.id),
        eq(coupons.isActive, true),
        lte(coupons.validFrom, now),
        or(isNull(coupons.validUntil), gt(coupons.validUntil, now))!,
        or(eq(coupons.isBargainGenerated, false), isNull(coupons.expiresAt), gt(coupons.expiresAt, now))!,
        or(isNull(coupons.maxUses), lt(coupons.usedCount, coupons.maxUses))!,
        or(isNull(coupons.userId), eq(coupons.userId, userId))!,
        or(isNull(coupons.minOrderValue), lte(coupons.minOrderValue, subtotal.toFixed(2)))!,
      ),
    )
    .returning({ id: coupons.id });

  if (consumed.length === 0) throw new OrderRuleError("This coupon has reached its usage limit");

  if (coupon.isBargainGenerated) {
    await tx.update(bargainSessions).set({ used: true }).where(eq(bargainSessions.couponCode, couponCode));
  }

  return { code: couponCode, discount };
}

export async function createOrderRecord(input: CreateOrderRecordInput): Promise<CreateOrderRecordResult> {
  const { quote } = input;
  let orderId: string;
  const touchedProductIds = new Set<string>();

  try {
    orderId = await db.transaction(async (tx) => {
      let couponCode: string | null = null;
      let couponDiscount = 0;

      if (quote.couponCode) {
        const consumed = await consumeCoupon(tx, quote.couponCode, quote.subtotal, input.userId, quote.couponDiscount);
        couponCode = consumed.code;
        couponDiscount = consumed.discount;
      }

      const total = Math.round((quote.subtotal + quote.shippingCost + quote.codFee - quote.discount) * 100) / 100;
      if (quote.discount < couponDiscount) throw new OrderRuleError("Invalid order discount");
      if (total <= 0 || Math.abs(total - quote.total) > 0.01) throw new OrderRuleError("Invalid order total");

      const [created] = await tx
        .insert(orders)
        .values({
          userId: input.userId,
          status: input.paymentStatus === "paid" ? "confirmed" : "pending",
          subtotal: quote.subtotal.toFixed(2),
          discount: quote.discount.toFixed(2),
          shipping: quote.shippingCost.toFixed(2),
          total: total.toFixed(2),
          vatAmount: quote.vatAmount.toFixed(2),
          currency: CURRENCY,
          couponCode,
          couponDiscount: couponCode ? couponDiscount.toFixed(2) : null,
          codFee: quote.codFee ? quote.codFee.toFixed(2) : null,
          shippingAddress: input.shippingAddress,
          customerEmail: input.shippingAddress.email,
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentStatus,
          paymentProvider: input.paymentProvider ?? (input.paymentMethod === "cod" ? "cod" : null),
          paymentReference: input.paymentReference ?? null,
          paymentTransactionId: input.paymentTransactionId ?? null,
        })
        .returning({ id: orders.id });

      for (const item of quote.items) {
        await tx.insert(orderItems).values({
          orderId: created.id,
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          totalPrice: item.totalPrice.toFixed(2),
        });

        await decrementStock(tx, item);
        touchedProductIds.add(item.productId);
      }

      await tx
        .update(user)
        .set({
          ordersCount: sql`${user.ordersCount} + 1`,
          totalSpent: sql`${user.totalSpent} + ${total}`,
          shippingAddress: input.shippingAddress,
          phone: input.shippingAddress.phone,
          updatedAt: new Date(),
        })
        .where(eq(user.id, input.userId));

      return created.id;
    });
  } catch (error) {
    if (error instanceof OrderRuleError) {
      return { success: false, error: error.message };
    }
    console.error("Order transaction failed:", error);
    return { success: false, error: "We couldn't place your order. Please try again." };
  }

  await revalidatePublicInventory([...touchedProductIds]);

  // Email is best-effort: an outage at the email provider must never undo an order.
  sendOrderConfirmationEmail(orderId).catch((error) => {
    console.error("Order confirmation email failed:", error instanceof Error ? error.message : error);
  });

  return { success: true, orderId };
}
