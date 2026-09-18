import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrderById } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { formatPriceExact, toAmount } from "@/lib/money";
import { PRICES_INCLUDE_VAT, VAT_RATE } from "@/lib/constants";
import { normalizeProductImage } from "@/lib/image";
import { formatUaeAddressLines, fullName } from "@/lib/uae";
import { OrderFulfilmentForm } from "../status-select";
import { RefundPanel } from "../refund-panel";
import {
  ORDER_STATUSES,
  displayPhone,
  formatDateTime,
  orderNumber,
  paymentMethodLabel,
  paymentStatusDisplay,
} from "../../_lib/format";
import { requireAdminPage } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Row({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`flex justify-between gap-4 text-sm ${className ?? ""}`}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border">
      <div className="border-b border-border bg-muted/50 p-4">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="space-y-2 p-4 text-sm">{children}</div>
    </section>
  );
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("/admin/orders");

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();
  const order = await getOrderById(id);
  if (!order) notFound();

  const address = order.shippingAddress;
  const addressLines = formatUaeAddressLines(address);
  const customerName = address ? fullName(address) : order.customer?.name ?? "Guest";
  const email = order.customerEmail ?? address?.email ?? order.customer?.email ?? null;
  const phone = displayPhone(address?.phone);
  const statusMeta = ORDER_STATUSES.find((status) => status.value === order.status);
  const payment = paymentStatusDisplay(order.paymentStatus);
  const discount = toAmount(order.discount);
  const couponDiscount = toAmount(order.couponDiscount);
  const bargainDiscount = toAmount(order.bargainDiscount);
  const codFee = toAmount(order.codFee);
  const shipping = toAmount(order.shipping);
  const vat = toAmount(order.vatAmount);
  const otherDiscount = Math.max(0, Math.round((discount - couponDiscount - bargainDiscount) * 100) / 100);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" aria-label="Back to orders">
            <Link href="/admin/orders">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Order {orderNumber(order.id)}</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Placed {formatDateTime(order.createdAt)} (Dubai time)</p>
          </div>
        </div>
        <span className={`self-start rounded-full px-3 py-1 text-sm font-medium sm:self-auto ${statusMeta?.className ?? "bg-muted"}`}>
          {statusMeta?.label ?? order.status}
        </span>
      </div>

      {order.paymentStatus === "refund_due" && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          This order was cancelled after payment. Issue the refund in the payment provider dashboard, then mark it refunded below.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-border">
            <div className="border-b border-border bg-muted/50 p-4">
              <h2 className="font-semibold">Items ({order.items.length})</h2>
            </div>
            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 p-4">
                  <Image
                    src={normalizeProductImage(item.productImage)}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 shrink-0 rounded bg-muted object-cover"
                    unoptimized
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {item.productId ? (
                        <Link href={`/admin/products/${item.productId}`} className="hover:underline">
                          {item.productName}
                        </Link>
                      ) : (
                        item.productName
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.size}
                      {item.color ? ` · ${item.color}` : ""} · Qty {item.quantity}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium">{formatPriceExact(item.totalPrice)}</p>
                    <p className="text-xs text-muted-foreground">{formatPriceExact(item.unitPrice)} each</p>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="space-y-2 border-t border-border bg-muted/20 p-4">
              <Row label="Subtotal" value={formatPriceExact(order.subtotal)} />
              {couponDiscount > 0 && (
                <Row
                  label={`Coupon${order.couponCode ? ` (${order.couponCode})` : ""}`}
                  value={`-${formatPriceExact(couponDiscount)}`}
                  className="text-green-700 dark:text-green-400"
                />
              )}
              {bargainDiscount > 0 && (
                <Row label="Concierge offer" value={`-${formatPriceExact(bargainDiscount)}`} className="text-green-700 dark:text-green-400" />
              )}
              {otherDiscount > 0 && (
                <Row
                  label={couponDiscount === 0 && order.couponCode ? `Discount (${order.couponCode})` : "Discount"}
                  value={`-${formatPriceExact(otherDiscount)}`}
                  className="text-green-700 dark:text-green-400"
                />
              )}
              <Row label="Delivery" value={shipping === 0 ? "Free" : formatPriceExact(shipping)} />
              {codFee > 0 && <Row label="Cash on delivery fee" value={formatPriceExact(codFee)} />}
              <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
                <dt>Total</dt>
                <dd>{formatPriceExact(order.total)}</dd>
              </div>
              <Row label={`${PRICES_INCLUDE_VAT ? "Includes" : "Plus"} VAT (${Math.round(VAT_RATE * 1000) / 10}%)`} value={formatPriceExact(vat)} className="text-xs" />
              {order.currency && order.currency !== "AED" && <Row label="Currency" value={order.currency} />}
            </dl>
          </section>
        </div>

        <div className="space-y-6">
          <Panel title="Fulfilment">
            <OrderFulfilmentForm
              orderId={order.id}
              currentStatus={order.status}
              courier={order.courier}
              trackingNumber={order.trackingNumber}
            />
          </Panel>

          <Panel title="Customer">
            <p className="font-medium">{customerName || "Guest"}</p>
            {email && (
              <p>
                <a href={`mailto:${email}`} className="text-muted-foreground hover:text-foreground hover:underline">
                  {email}
                </a>
              </p>
            )}
            {phone && address?.phone && (
              <p>
                <a href={`tel:${address.phone}`} className="text-muted-foreground hover:text-foreground hover:underline">
                  {phone}
                </a>
              </p>
            )}
            {order.customer ? (
              <p className="text-xs text-muted-foreground">
                Registered customer · {order.customer.ordersCount} order{order.customer.ordersCount === 1 ? "" : "s"}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Guest checkout</p>
            )}
          </Panel>

          <Panel title="Delivery address">
            {addressLines.length > 0 ? (
              <address className="space-y-0.5 not-italic">
                <p className="font-medium">{customerName}</p>
                {addressLines.map((line) => (
                  <p key={line} className="text-muted-foreground">
                    {line}
                  </p>
                ))}
                {address?.instructions && (
                  <p className="mt-2 rounded bg-muted p-2 text-xs">
                    <span className="font-medium">Instructions:</span> {address.instructions}
                  </p>
                )}
              </address>
            ) : (
              <p className="text-muted-foreground">No address provided</p>
            )}
          </Panel>

          <Panel title="Payment">
            <dl className="space-y-2">
              <Row label="Method" value={paymentMethodLabel(order.paymentMethod)} />
              {order.paymentProvider && order.paymentProvider !== "cod" && (
                <Row label="Provider" value={<span className="capitalize">{order.paymentProvider}</span>} />
              )}
              <Row label="Status" value={<span className={`font-medium ${payment.className}`}>{payment.label}</span>} />
              {order.paymentReference && (
                <Row label="Reference" value={<span className="break-all font-mono text-xs">{order.paymentReference}</span>} />
              )}
              {order.paymentTransactionId && (
                <Row label="Transaction" value={<span className="break-all font-mono text-xs">{order.paymentTransactionId}</span>} />
              )}
            </dl>
            {order.paymentMethod === "cod" && (
              <div className="mt-2 rounded border border-orange-500/30 bg-orange-500/10 p-3">
                <p className="font-medium text-orange-700 dark:text-orange-400">Cash on delivery</p>
                <p className="text-muted-foreground">
                  Amount to collect:{" "}
                  {formatPriceExact(order.codRemainingAmount !== null ? order.codRemainingAmount : order.total)}
                </p>
              </div>
            )}
          </Panel>

          <RefundPanel
            orderId={order.id}
            total={order.total}
            paymentMethod={order.paymentMethod}
            paymentProvider={order.paymentProvider}
            paymentStatus={order.paymentStatus}
            paymentReference={order.paymentReference}
            paymentTransactionId={order.paymentTransactionId}
            hasCustomerAccount={Boolean(order.userId)}
            storeCredits={order.storeCredits.map((credit) => ({
              id: credit.id,
              code: credit.code,
              discountValue: credit.discountValue,
              usedCount: credit.usedCount,
              maxUses: credit.maxUses,
              validUntil: credit.validUntil,
              isActive: credit.isActive,
              createdAt: credit.createdAt,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
