"use client";

import { useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrders } from "@/lib/actions/admin";
import { ADMIN_QUERY_OPTIONS } from "@/lib/admin-query-options";
import { formatPriceExact } from "@/lib/money";
import { OrderStatusSelect } from "./status-select";
import {
  ORDER_STATUSES,
  formatDate,
  formatDateTime,
  inputClass,
  orderNumber,
  paymentMethodLabel,
  paymentStatusDisplay,
} from "../_lib/format";

type AdminOrder = Awaited<ReturnType<typeof getOrders>>[number];

export type StuckCheckout = {
  id: string;
  provider: string;
  providerSessionId: string | null;
  amount: number;
  currency: string;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  failureReason: string | null;
  updatedAt: Date | string;
};

export function AdminOrdersClient({
  initialOrders,
  stuckCheckouts,
}: {
  initialOrders: AdminOrder[];
  stuckCheckouts: StuckCheckout[];
}) {
  const uid = useId();
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const { data: orders = initialOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => getOrders({ limit: 200 }),
    initialData: initialOrders,
    ...ADMIN_QUERY_OPTIONS,
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter === "refund_due") {
        if (order.paymentStatus !== "refund_due") return false;
      } else if (statusFilter && order.status !== statusFilter) {
        return false;
      }
      if (!term) return true;
      const address = order.shippingAddress;
      return [
        orderNumber(order.id),
        order.id,
        address?.firstName ?? "",
        address?.lastName ?? "",
        address?.phone ?? "",
        order.customerEmail ?? address?.email ?? "",
        order.paymentReference ?? "",
      ].some((field) => field.toLowerCase().includes(term));
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">View, fulfil and refund customer orders</p>
      </div>

      {stuckCheckouts.length > 0 && (
        <section role="alert" className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <div className="flex items-start gap-2 text-destructive">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">
                {stuckCheckouts.length} paid checkout{stuckCheckouts.length === 1 ? "" : "s"} could not become an order — refund needed
              </h2>
              <p className="text-sm">
                The card was charged but the order could not be created (usually stock ran out during payment). Refund these in the
                payment provider dashboard and contact the customer.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto rounded border border-destructive/30 bg-background">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="p-2 font-medium">When</th>
                  <th scope="col" className="p-2 font-medium">Customer</th>
                  <th scope="col" className="p-2 font-medium">Amount</th>
                  <th scope="col" className="p-2 font-medium">Provider reference</th>
                  <th scope="col" className="p-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {stuckCheckouts.map((checkout) => (
                  <tr key={checkout.id} className="border-b border-border last:border-0">
                    <td className="p-2 whitespace-nowrap">{formatDateTime(checkout.updatedAt)}</td>
                    <td className="p-2">
                      <div>{checkout.customerName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{[checkout.email, checkout.phone].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="p-2 whitespace-nowrap">{formatPriceExact(checkout.amount)}</td>
                    <td className="p-2">
                      <span className="capitalize">{checkout.provider}</span>
                      <div className="break-all font-mono text-xs">{checkout.providerSessionId ?? checkout.id}</div>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{checkout.failureReason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <label htmlFor={`${uid}-search`} className="text-xs font-medium text-muted-foreground">
            Search order number, name, phone, email or payment reference
          </label>
          <input
            id={`${uid}-search`}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={inputClass}
            placeholder="MH-…"
          />
        </div>
        <div className="space-y-1 sm:w-52">
          <label htmlFor={`${uid}-status`} className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <select id={`${uid}-status`} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}>
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
            <option value="refund_due">Refund due</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th scope="col" className="p-3 font-medium">Order</th>
              <th scope="col" className="p-3 font-medium">Date</th>
              <th scope="col" className="p-3 font-medium">Customer</th>
              <th scope="col" className="p-3 font-medium">Total</th>
              <th scope="col" className="p-3 font-medium">Payment</th>
              <th scope="col" className="p-3 font-medium">Status</th>
              <th scope="col" className="p-3 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {orders.length === 0 ? "No orders yet. Orders appear here when customers check out." : "No orders match these filters."}
                </td>
              </tr>
            ) : (
              filtered.map((order) => {
                const address = order.shippingAddress;
                const name = address ? `${address.firstName ?? ""} ${address.lastName ?? ""}`.trim() : "";
                const email = order.customerEmail ?? address?.email;
                const payment = paymentStatusDisplay(order.paymentStatus);
                return (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <Link href={`/admin/orders/${order.id}`} className="font-mono font-medium hover:underline">
                        {orderNumber(order.id)}
                      </Link>
                    </td>
                    <td className="p-3 whitespace-nowrap">{formatDate(order.createdAt)}</td>
                    <td className="p-3">
                      <div>{name || "Guest"}</div>
                      {email && <div className="text-xs text-muted-foreground">{email}</div>}
                      {address?.emirate && <div className="text-xs text-muted-foreground">{address.emirate}</div>}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-medium">{formatPriceExact(order.total)}</div>
                      {order.couponCode && <div className="text-xs text-muted-foreground">Coupon {order.couponCode}</div>}
                    </td>
                    <td className="p-3">
                      <div>{paymentMethodLabel(order.paymentMethod)}</div>
                      <div className={`text-xs font-medium ${payment.className}`}>{payment.label}</div>
                    </td>
                    <td className="p-3">
                      <OrderStatusSelect
                        orderId={order.id}
                        currentStatus={order.status}
                        label={`Status for order ${orderNumber(order.id)}`}
                      />
                    </td>
                    <td className="p-3 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/orders/${order.id}`} aria-label={`View order ${orderNumber(order.id)}`}>
                          View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {orders.length >= 200 && (
        <p className="text-xs text-muted-foreground">Showing the 200 most recent orders.</p>
      )}
    </div>
  );
}
