import { PreviewUnavailable, STATIC_PREVIEW } from "@/components/layout/preview-banner"
import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { ShoppingBag, Truck } from "lucide-react"
import { getUserOrders } from "@/lib/actions/orders"
import { getServerSession } from "@/lib/auth-server"
import { CancelOrderButton } from "./cancel-button"
import { normalizeProductImage } from "@/lib/image"
import { formatPriceExact } from "@/lib/money"
import { formatUaeAddressLines, formatUaePhone, fullName } from "@/lib/uae"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
    title: "My Orders",
    description: "View and track your Miti Home orders.",
    robots: { index: false, follow: false },
    alternates: { canonical: "/orders" },
}

const STEPS = ["confirmed", "processing", "shipped", "delivered"] as const

const STATUS_LABELS: Record<string, string> = {
    pending: "Order received",
    confirmed: "Confirmed",
    processing: "Being prepared",
    shipped: "On its way",
    delivered: "Delivered",
    cancelled: "Cancelled",
}

const PAYMENT_LABELS: Record<string, string> = {
    pending: "Pay on delivery",
    paid: "Paid",
    refund_due: "Refund in progress",
    refunded: "Refunded",
    cancelled: "Cancelled",
}

function OrderProgress({ status }: { status: string }) {
    if (status === "cancelled") return null
    const current = status === "pending" ? 0 : STEPS.indexOf(status as (typeof STEPS)[number])
    return (
        <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
            {STEPS.map((step, index) => (
                <li key={step} className="space-y-2">
                    <div className={cn("h-0.5", index <= current ? "bg-brand" : "bg-border")} />
                    <p className={cn("font-heading text-[9px] uppercase tracking-[0.14em] sm:text-[10px]", index <= current ? "text-foreground" : "text-muted-foreground")}>
                        {STATUS_LABELS[step]}
                    </p>
                </li>
            ))}
        </ol>
    )
}

export default async function OrdersPage() {
    if (STATIC_PREVIEW) return <PreviewUnavailable title="Your orders" />
    const session = await getServerSession()
    if (!session) redirect("/account?redirect=/orders")

    const orders = await getUserOrders()

    return (
        <div className="min-h-screen">
            <div className="border-b border-border/60 px-5 py-14 md:px-12 md:py-20">
                <p className="mb-3 font-heading text-[10px] font-medium uppercase tracking-[0.3em] text-brand-strong">Your account</p>
                <h1 className="font-display text-4xl md:text-6xl">My orders</h1>
            </div>

            <div className="max-w-4xl space-y-5 px-5 py-8 md:px-12">
                {orders.length === 0 ? (
                    <div className="space-y-4 py-24 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <ShoppingBag className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <p className="font-display text-2xl">No orders yet</p>
                        <p className="mx-auto max-w-[280px] text-sm text-muted-foreground">
                            Your orders will appear here once you complete your first purchase.
                        </p>
                        <Link href="/shop" className="mt-4 inline-flex h-12 items-center bg-foreground px-7 font-heading text-[11px] uppercase tracking-[0.22em] text-background hover:bg-brand hover:text-neutral-950">
                            Start shopping
                        </Link>
                    </div>
                ) : (
                    orders.map((order) => {
                        const address = order.shippingAddress
                        return (
                            <article key={order.id} className="space-y-5 border border-border/70 p-5 md:p-7">
                                <header className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="font-heading text-xs font-medium uppercase tracking-[0.14em]">
                                            Order MH-{order.id.slice(0, 8).toUpperCase()}
                                        </h2>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {new Date(order.createdAt).toLocaleDateString("en-AE", { day: "numeric", month: "long", year: "numeric" })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className={cn(
                                            "inline-block px-2.5 py-1 font-heading text-[10px] uppercase tracking-[0.12em]",
                                            order.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-brand-soft text-foreground",
                                        )}>
                                            {STATUS_LABELS[order.status] ?? order.status}
                                        </span>
                                        <p className="mt-2 text-sm tabular-nums">{formatPriceExact(order.total)}</p>
                                    </div>
                                </header>

                                <OrderProgress status={order.status} />

                                {order.status === "shipped" && (order.courier || order.trackingNumber) && (
                                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Truck className="h-4 w-4 text-brand-strong" />
                                        {order.courier ? `${order.courier}` : "Courier"}{order.trackingNumber ? ` · Tracking ${order.trackingNumber}` : ""}
                                    </p>
                                )}

                                <ul className="space-y-3 border-t border-border/60 pt-5">
                                    {order.items.map((item) => {
                                        const options = [item.size !== "Standard" ? item.size : null, item.color].filter(Boolean).join(" · ")
                                        return (
                                            <li key={item.id} className="flex items-center gap-4">
                                                <div className="relative h-16 w-16 flex-none overflow-hidden bg-muted">
                                                    <Image src={normalizeProductImage(item.productImage)} alt="" fill sizes="64px" className="object-cover" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-heading text-xs uppercase tracking-[0.06em]">{item.productName}</p>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">{[options, `Qty ${item.quantity}`].filter(Boolean).join(" · ")}</p>
                                                </div>
                                                <p className="text-sm tabular-nums">{formatPriceExact(item.totalPrice)}</p>
                                            </li>
                                        )
                                    })}
                                </ul>

                                <div className="grid gap-5 border-t border-border/60 pt-5 text-xs text-muted-foreground sm:grid-cols-2">
                                    <dl className="space-y-1.5">
                                        <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatPriceExact(order.subtotal)}</dd></div>
                                        {Number(order.discount) > 0 && (
                                            <div className="flex justify-between text-brand-strong"><dt>Savings{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="tabular-nums">-{formatPriceExact(order.discount)}</dd></div>
                                        )}
                                        <div className="flex justify-between"><dt>Delivery</dt><dd className="tabular-nums">{Number(order.shipping) === 0 ? "Complimentary" : formatPriceExact(order.shipping)}</dd></div>
                                        {Number(order.codFee ?? 0) > 0 && (
                                            <div className="flex justify-between"><dt>Cash on delivery fee</dt><dd className="tabular-nums">{formatPriceExact(order.codFee)}</dd></div>
                                        )}
                                        <div className="flex justify-between text-foreground"><dt>Total</dt><dd className="tabular-nums">{formatPriceExact(order.total)}</dd></div>
                                        {Number(order.vatAmount) > 0 && <p>Includes VAT of {formatPriceExact(order.vatAmount)}</p>}
                                        <div className="flex justify-between pt-1"><dt>Payment</dt><dd>{order.paymentMethod === "cod" ? "Cash on delivery" : "Card"} · {PAYMENT_LABELS[order.paymentStatus ?? "pending"] ?? order.paymentStatus}</dd></div>
                                    </dl>
                                    {address && "emirate" in address && (
                                        <address className="not-italic">
                                            <p className="text-foreground">{fullName(address)}</p>
                                            {formatUaeAddressLines(address).map((line) => <p key={line}>{line}</p>)}
                                            {address.phone && <p>{address.phone.startsWith("+971") ? formatUaePhone(address.phone) : address.phone}</p>}
                                        </address>
                                    )}
                                </div>

                                {order.paymentMethod === "cod" && ["pending", "confirmed"].includes(order.status) && (
                                    <CancelOrderButton orderId={order.id} />
                                )}
                            </article>
                        )
                    })
                )}
            </div>
        </div>
    )
}
