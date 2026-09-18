import { getOrders, getPaidUnfulfilledCheckouts } from "@/lib/actions/admin";
import type { SavedShippingAddress } from "@/lib/db/schema";
import { AdminOrdersClient } from "./orders-client";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [orders, stuckCheckouts] = await Promise.all([getOrders({ limit: 200 }), getPaidUnfulfilledCheckouts()]);

  return (
    <AdminOrdersClient
      initialOrders={orders}
      stuckCheckouts={stuckCheckouts.map((session) => {
        const address = (session.shippingAddress ?? null) as Partial<SavedShippingAddress> | null;
        return {
          id: session.id,
          provider: session.provider,
          providerSessionId: session.providerSessionId,
          amount: session.amountMinor / 100,
          currency: session.currency,
          customerName: [address?.firstName, address?.lastName].filter(Boolean).join(" ") || null,
          email: address?.email ?? null,
          phone: address?.phone ?? null,
          failureReason: session.failureReason,
          updatedAt: session.updatedAt,
        };
      })}
    />
  );
}
