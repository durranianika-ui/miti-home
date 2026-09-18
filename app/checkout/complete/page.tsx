import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertCircle, Check, Clock } from "lucide-react"
import { getServerSession } from "@/lib/auth-server"
import { finalizeCardCheckout, getCheckoutSessionOwner } from "@/lib/checkout/card-checkout"
import { getOrderById } from "@/lib/actions/orders"
import { CONTACT } from "@/lib/brand"
import { formatPrice } from "@/lib/money"
import { PurchaseComplete, RefreshWhilePending } from "@/components/features/checkout-complete"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
    title: "Order confirmation",
    robots: { index: false, follow: false },
}

const UUID = /^[0-9a-f-]{36}$/i

export default async function CheckoutCompletePage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
    const { session: checkoutSessionId } = await searchParams
    const session = await getServerSession()

    if (!session?.user?.id) {
        redirect(`/account?redirect=${encodeURIComponent(`/checkout/complete?session=${checkoutSessionId ?? ""}`)}`)
    }

    if (!checkoutSessionId || !UUID.test(checkoutSessionId)) {
        redirect("/orders")
    }

    const owner = await getCheckoutSessionOwner(checkoutSessionId)
    if (!owner || owner !== session.user.id) {
        redirect("/orders")
    }

    let result: Awaited<ReturnType<typeof finalizeCardCheckout>>
    try {
        result = await finalizeCardCheckout(checkoutSessionId)
    } catch (error) {
        console.error("Checkout finalization failed:", error)
        result = { status: "pending" }
    }

    if (result.status === "fulfilled") {
        const order = await getOrderById(result.orderId)
        return (
            <div className="flex min-h-[80svh] items-center justify-center px-6 py-20">
                <PurchaseComplete orderId={result.orderId} total={order ? Number(order.total) : 0} />
                <div className="max-w-md space-y-6 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-brand">
                        <Check className="h-7 w-7 text-brand-strong" />
                    </div>
                    <p className="font-heading text-[10px] uppercase tracking-[0.3em] text-brand-strong">Order MH-{result.orderId.slice(0, 8).toUpperCase()}</p>
                    <h1 className="font-display text-4xl">Thank you</h1>
                    <p className="text-sm leading-7 text-muted-foreground">
                        Your payment{order ? ` of ${formatPrice(order.total)}` : ""} was received and your order is confirmed. We&apos;ll email you when it&apos;s on its way.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Link href="/orders" className="inline-flex h-12 items-center bg-foreground px-7 font-heading text-[11px] uppercase tracking-[0.22em] text-background hover:bg-brand hover:text-neutral-950">
                            View your orders
                        </Link>
                        <Link href="/shop" className="inline-flex h-12 items-center border border-border px-7 font-heading text-[11px] uppercase tracking-[0.22em] hover:border-foreground">
                            Continue shopping
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    if (result.status === "pending") {
        return (
            <div className="flex min-h-[80svh] items-center justify-center px-6 py-20">
                <RefreshWhilePending />
                <div className="max-w-md space-y-5 text-center" role="status">
                    <Clock className="mx-auto h-7 w-7 text-brand-strong" />
                    <h1 className="font-display text-3xl">Confirming your payment</h1>
                    <p className="text-sm leading-7 text-muted-foreground">
                        This usually takes a few seconds. This page refreshes automatically — please don&apos;t pay again.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-[80svh] items-center justify-center px-6 py-20">
            <div className="max-w-md space-y-5 text-center" role="alert">
                <AlertCircle className="mx-auto h-7 w-7 text-destructive" />
                <h1 className="font-display text-3xl">{result.status === "expired" ? "Payment not completed" : "We need to check your order"}</h1>
                <p className="text-sm leading-7 text-muted-foreground">
                    {result.status === "expired"
                        ? "Your payment session ended before it was completed, so you haven't been charged. Your bag is still saved."
                        : `Your payment was received but we couldn't confirm the order automatically. Our team has been notified and will contact you — or write to us at ${CONTACT.email}. You won't be charged twice.`}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                    <Link href="/checkout" className="inline-flex h-12 items-center bg-foreground px-7 font-heading text-[11px] uppercase tracking-[0.22em] text-background hover:bg-brand hover:text-neutral-950">
                        Back to checkout
                    </Link>
                    <a href={`mailto:${CONTACT.email}`} className="inline-flex h-12 items-center border border-border px-7 font-heading text-[11px] uppercase tracking-[0.22em] hover:border-foreground">
                        Contact us
                    </a>
                </div>
            </div>
        </div>
    )
}
