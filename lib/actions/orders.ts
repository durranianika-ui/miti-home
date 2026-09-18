"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderItems, orders, user, type SavedShippingAddress } from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth-server";
import { getCustomerCodCancellationFailure } from "@/lib/order-cancellation";
import { restoreStock } from "@/lib/orders/create-order";
import { revalidatePublicInventory } from "@/lib/public-cache-server";
import { EMPTY_UAE_ADDRESS, sanitizeUaeAddress } from "@/lib/uae";

/*
 * Customer-facing order actions. Order creation deliberately does NOT live
 * here: every export of a "use server" module is callable from the browser,
 * and orders must only be created from a server-owned checkout quote (see
 * lib/orders/create-order.ts and the /api/orders + /api/checkout routes).
 */

export async function getUserOrders() {
  const session = await getServerSession();
  if (!session?.user?.id) return [];

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.user.id))
    .orderBy(desc(orders.createdAt));

  if (userOrders.length === 0) return [];

  const allItems = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, userOrders.map((order) => order.id)));

  const itemsByOrderId = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const items = itemsByOrderId.get(item.orderId) || [];
    items.push(item);
    itemsByOrderId.set(item.orderId, items);
  }

  return userOrders.map((order) => ({ ...order, items: itemsByOrderId.get(order.id) || [] }));
}

/** Customers may cancel their own COD orders while pending or confirmed. */
export async function cancelOrder(orderId: string) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return { success: false, error: "Please sign in to manage your orders." };
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return { success: false, error: "Order not found" };

  const failure = getCustomerCodCancellationFailure({
    orderUserId: order.userId,
    currentUserId: session.user.id,
    paymentMethod: order.paymentMethod,
    status: order.status,
  });
  if (failure) return { success: false, error: failure };

  const productIds = new Set<string>();

  try {
    await db.transaction(async (tx) => {
      const cancelled = await tx
        .update(orders)
        .set({ status: "cancelled", paymentStatus: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.userId, session.user.id),
            eq(orders.paymentMethod, "cod"),
            inArray(orders.status, ["pending", "confirmed"]),
          ),
        )
        .returning({ id: orders.id });

      if (cancelled.length === 0) throw new Error("Order is no longer cancellable");

      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const item of items) {
        const restored = await restoreStock(tx, item);
        if (restored) productIds.add(restored);
      }

      await tx
        .update(user)
        .set({
          ordersCount: sql`GREATEST(${user.ordersCount} - 1, 0)`,
          totalSpent: sql`GREATEST(${user.totalSpent} - ${Number(order.total)}, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(user.id, session.user.id));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("no longer cancellable")) {
      return { success: false, error: "This order is no longer cancellable." };
    }
    console.error("Cancel order failed:", error);
    return { success: false, error: "We couldn't cancel this order. Please contact us." };
  }

  await revalidatePublicInventory([...productIds]);
  return { success: true };
}

/** Last-used delivery address, pre-filled from the account when empty. */
export async function getSavedShippingAddress(): Promise<SavedShippingAddress | null> {
  const session = await getServerSession();
  if (!session?.user?.id) return null;

  const [row] = await db
    .select({ name: user.name, email: user.email, phone: user.phone, shippingAddress: user.shippingAddress })
    .from(user)
    .where(eq(user.id, session.user.id));

  if (!row) return null;

  const saved = row.shippingAddress && "emirate" in row.shippingAddress ? row.shippingAddress : null;
  const [firstName = "", ...rest] = (row.name || "").trim().split(/\s+/);

  return {
    ...EMPTY_UAE_ADDRESS,
    firstName,
    lastName: rest.join(" "),
    phone: row.phone || "",
    ...(saved ?? {}),
    email: saved?.email || row.email,
  };
}

/** Saves the default delivery address from the account page. */
export async function saveShippingAddress(address: unknown) {
  const session = await getServerSession();
  if (!session?.user?.id) return { success: false, error: "Please sign in first." };

  try {
    const clean = sanitizeUaeAddress(address);
    await db
      .update(user)
      .set({ shippingAddress: clean, phone: clean.phone, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Invalid address" };
  }
}

export async function getOrderById(orderId: string) {
  const session = await getServerSession();
  if (!session?.user?.id) return null;

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return null;

  if (session.user.role !== "admin" && order.userId !== session.user.id) return null;

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return { ...order, items };
}
