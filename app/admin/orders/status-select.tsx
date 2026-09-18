"use client";

import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateOrderStatusAction } from "../_lib/actions";
import { ORDER_STATUSES, inputClass, isOrderStatus, type OrderStatusValue } from "../_lib/format";

function statusClass(status: string) {
  return ORDER_STATUSES.find((option) => option.value === status)?.className ?? "bg-muted";
}

/** Compact status dropdown for the orders table. */
export function OrderStatusSelect({
  orderId,
  currentStatus,
  label,
}: {
  orderId: string;
  currentStatus: string;
  label: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const router = useRouter();
  const id = useId();

  const handleChange = async (next: string) => {
    if (!isOrderStatus(next) || next === status) return;
    if (next === "cancelled" && !confirm("Cancel this order? Stock is returned and paid orders are flagged for refund.")) return;
    setIsUpdating(true);
    setError("");
    const result = await updateOrderStatusAction(orderId, next);
    setIsUpdating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatus(next);
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    router.refresh();
  };

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={status}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isUpdating || status === "cancelled"}
        className={`cursor-pointer rounded border-0 px-2 py-1 text-sm font-medium ${statusClass(status)}`}
      >
        {ORDER_STATUSES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="max-w-48 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Full fulfilment editor for the order detail page: status + courier + tracking. */
export function OrderFulfilmentForm({
  orderId,
  currentStatus,
  courier: initialCourier,
  trackingNumber: initialTracking,
}: {
  orderId: string;
  currentStatus: string;
  courier: string | null;
  trackingNumber: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const uid = useId();
  const [status, setStatus] = useState<OrderStatusValue>(isOrderStatus(currentStatus) ? currentStatus : "pending");
  const [courier, setCourier] = useState(initialCourier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(initialTracking ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const showShipping = status === "shipped" || status === "delivered" || Boolean(initialCourier || initialTracking);
  const locked = currentStatus === "cancelled";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "cancelled" && currentStatus !== "cancelled") {
      if (!confirm("Cancel this order? Stock is returned and paid orders are flagged for refund.")) return;
    }
    setPending(true);
    setError("");
    setNotice("");
    const result = await updateOrderStatusAction(
      orderId,
      status,
      showShipping ? { courier, trackingNumber } : undefined,
    );
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(status !== currentStatus ? "Order updated — the customer has been emailed." : "Shipping details saved.");
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor={`${uid}-status`} className="text-sm font-medium">
          Order status
        </label>
        <select
          id={`${uid}-status`}
          value={status}
          onChange={(event) => isOrderStatus(event.target.value) && setStatus(event.target.value)}
          disabled={locked || pending}
          className={inputClass}
        >
          {ORDER_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {locked && <p className="text-xs text-muted-foreground">Cancelled orders cannot be reopened.</p>}
      </div>
      {showShipping && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="space-y-1.5">
            <label htmlFor={`${uid}-courier`} className="text-sm font-medium">
              Courier
            </label>
            <input
              id={`${uid}-courier`}
              type="text"
              list={`${uid}-couriers`}
              value={courier}
              onChange={(event) => setCourier(event.target.value)}
              className={inputClass}
              placeholder="Aramex"
              disabled={locked}
            />
            <datalist id={`${uid}-couriers`}>
              {["Aramex", "Emirates Post", "DHL", "Quiqup", "Fetchr", "Own delivery"].map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${uid}-tracking`} className="text-sm font-medium">
              Tracking number
            </label>
            <input
              id={`${uid}-tracking`}
              type="text"
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              className={`${inputClass} font-mono`}
              disabled={locked}
            />
          </div>
        </div>
      )}
      {!locked && (
        <Button type="submit" disabled={pending} className="w-full bg-brand text-neutral-950 hover:bg-brand/90">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Update order
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
    </form>
  );
}
