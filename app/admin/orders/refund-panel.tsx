"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPriceExact } from "@/lib/money";
import { issueStoreCreditAction, markOrderRefundedAction } from "../_lib/actions";
import { formatDate, inputClass, paymentStatusDisplay } from "../_lib/format";

export type StoreCreditRow = {
  id: string;
  code: string;
  discountValue: string;
  usedCount: number;
  maxUses: number | null;
  validUntil: Date | string | null;
  isActive: boolean;
  createdAt: Date | string;
};

function isPast(value: Date | string) {
  return new Date(value).getTime() < Date.now();
}

/**
 * Refunds & store credit. Card refunds are issued in the payment provider's
 * dashboard; here the admin records them and can issue single-use credit codes.
 */
export function RefundPanel({
  orderId,
  total,
  paymentMethod,
  paymentProvider,
  paymentStatus,
  paymentReference,
  paymentTransactionId,
  hasCustomerAccount,
  storeCredits,
}: {
  orderId: string;
  total: string;
  paymentMethod: string | null;
  paymentProvider: string | null;
  paymentStatus: string | null;
  paymentReference: string | null;
  paymentTransactionId: string | null;
  hasCustomerAccount: boolean;
  storeCredits: StoreCreditRow[];
}) {
  const router = useRouter();
  const uid = useId();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [validDays, setValidDays] = useState("180");
  const [creditPending, setCreditPending] = useState(false);
  const [refundPending, setRefundPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isCard = paymentMethod === "card" || (paymentProvider !== null && paymentProvider !== "cod");
  const status = paymentStatus ?? "pending";
  const canMarkRefunded = isCard && (status === "paid" || status === "refund_due");
  const statusDisplay = paymentStatusDisplay(status);

  const markRefunded = async () => {
    if (!confirm("Confirm the refund has been issued in the payment provider's dashboard. Mark this order as refunded?")) return;
    setRefundPending(true);
    setError("");
    setNotice("");
    const result = await markOrderRefundedAction(orderId);
    setRefundPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice("Order marked as refunded.");
    router.refresh();
  };

  const issueCredit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a credit amount greater than zero.");
      return;
    }
    setCreditPending(true);
    setError("");
    setNotice("");
    const result = await issueStoreCreditAction({
      orderId,
      amount: value,
      reason: reason.trim(),
      validDays: Math.max(1, Number.parseInt(validDays, 10) || 180),
    });
    setCreditPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(`Store credit ${result.data.code} issued for ${formatPriceExact(value)}. Share the code with the customer.`);
    setAmount("");
    setReason("");
    router.refresh();
  };

  return (
    <section className="rounded-lg border border-border" aria-labelledby={`${uid}-title`}>
      <div className="border-b border-border bg-muted/50 p-4">
        <h2 id={`${uid}-title`} className="font-semibold">
          Refunds &amp; store credit
        </h2>
      </div>
      <div className="space-y-5 p-4 text-sm">
        {isCard ? (
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Card refunds are issued in the {paymentProvider ?? "payment provider"} dashboard. Use this reference to find the payment:
            </p>
            <dl className="space-y-1">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Reference</dt>
                <dd className="break-all text-right font-mono text-xs">{paymentReference ?? "—"}</dd>
              </div>
              {paymentTransactionId && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Transaction</dt>
                  <dd className="break-all text-right font-mono text-xs">{paymentTransactionId}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Payment status</dt>
                <dd className={`font-medium ${statusDisplay.className}`}>{statusDisplay.label}</dd>
              </div>
            </dl>
            {canMarkRefunded ? (
              <Button type="button" variant="outline" className="w-full" onClick={markRefunded} disabled={refundPending}>
                {refundPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Mark refunded ({formatPriceExact(total)})
              </Button>
            ) : status === "refunded" ? (
              <p className="text-xs text-muted-foreground">This payment has been refunded.</p>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground">
            Cash on delivery order — no card refund is possible. Return money in cash or issue store credit below.
          </p>
        )}

        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="font-medium">Issue store credit</h3>
          {hasCustomerAccount ? (
            <form onSubmit={issueCredit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor={`${uid}-amount`} className="text-xs font-medium">
                    Amount (AED)
                  </label>
                  <input
                    id={`${uid}-amount`}
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max={total}
                    step="0.01"
                    required
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`${uid}-days`} className="text-xs font-medium">
                    Valid for (days)
                  </label>
                  <input
                    id={`${uid}-days`}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={validDays}
                    onChange={(event) => setValidDays(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor={`${uid}-reason`} className="text-xs font-medium">
                  Reason
                </label>
                <textarea
                  id={`${uid}-reason`}
                  required
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className={`${inputClass} min-h-16`}
                  placeholder="e.g. Item arrived with a chipped edge"
                />
              </div>
              <Button type="submit" className="w-full" disabled={creditPending || !amount || !reason.trim()}>
                {creditPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Issue store credit
              </Button>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground">Store credit needs an order placed by a registered customer.</p>
          )}

          {storeCredits.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Customer&apos;s credit codes</h4>
              <ul className="divide-y divide-border rounded border border-border">
                {storeCredits.map((credit) => {
                  const used = credit.maxUses !== null && credit.usedCount >= credit.maxUses;
                  const expired = credit.validUntil ? isPast(credit.validUntil) : false;
                  return (
                    <li key={credit.id} className="flex items-center justify-between gap-2 p-2">
                      <div>
                        <p className="font-mono text-xs">{credit.code}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Issued {formatDate(credit.createdAt)}
                          {credit.validUntil ? ` · expires ${formatDate(credit.validUntil)}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium">{formatPriceExact(credit.discountValue)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {used ? "Used" : !credit.isActive ? "Inactive" : expired ? "Expired" : "Available"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm">
            {notice}
          </p>
        )}
      </div>
    </section>
  );
}
