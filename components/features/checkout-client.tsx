"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, Banknote, Check, CreditCard, Loader2, Lock, MapPin, Truck } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useSession } from "@/lib/auth-client"
import { getSavedShippingAddress } from "@/lib/actions/orders"
import { CheckoutBargain } from "@/components/features/checkout-bargain"
import {
    COD_ENABLED,
    DELIVERY_ESTIMATE,
    FREE_SHIPPING_THRESHOLD_DISPLAY,
    SHIPPING_EMIRATES,
} from "@/lib/constants"
import { formatPrice } from "@/lib/money"
import { normalizeProductImage } from "@/lib/image"
import { trackEcommerce } from "@/lib/analytics"
import {
    EMPTY_UAE_ADDRESS,
    formatUaeAddressLines,
    fullName,
    validateUaeAddress,
    type AddressField,
    type UaeShippingAddress,
} from "@/lib/uae"
import { cn } from "@/lib/utils"

const CHECKOUT_STORAGE_KEY = "miti-checkout"

type PaymentMethod = "card" | "cod"

type Quote = {
    subtotal: number
    comboDiscount: number
    couponDiscount: number
    couponCode: string | null
    shippingCost: number
    codFee: number
    vatAmount: number
    total: number
    codUnavailableReason: string | null
}

type SavedState = {
    step: number
    address: UaeShippingAddress
    paymentMethod: PaymentMethod
    couponCode: string | null
}

function loadCheckoutState(): Partial<SavedState> | null {
    try {
        const saved = window.sessionStorage.getItem(CHECKOUT_STORAGE_KEY)
        return saved ? JSON.parse(saved) : null
    } catch {
        return null
    }
}

const inputClass =
    "h-12 w-full border bg-card/60 px-4 text-[15px] transition-colors duration-300 focus:outline-none focus:ring-1"

function Field({
    id,
    label,
    required,
    error,
    hint,
    children,
    className,
}: {
    id: string
    label: string
    required?: boolean
    error?: string
    hint?: string
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn("space-y-1.5", className)}>
            <label htmlFor={id} className="font-heading text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {label}{required && <span aria-hidden="true"> *</span>}
            </label>
            {children}
            {error ? (
                <p id={`${id}-error`} className="text-[11px] text-destructive">{error}</p>
            ) : hint ? (
                <p className="text-[11px] text-muted-foreground">{hint}</p>
            ) : null}
        </div>
    )
}

export function CheckoutClient({ cardPayment }: { cardPayment: { label: string } | null }) {
    const { items, clearCart, isHydrated } = useCart()
    const { data: session, isPending: isAuthPending } = useSession()
    const router = useRouter()

    const [step, setStep] = useState(1)
    const [address, setAddress] = useState<UaeShippingAddress>(EMPTY_UAE_ADDRESS)
    const [touched, setTouched] = useState<Partial<Record<AddressField, boolean>>>({})
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(cardPayment ? "card" : "cod")
    const [couponCode, setCouponCode] = useState<string | null>(null)
    const [couponInput, setCouponInput] = useState("")
    const [couponError, setCouponError] = useState<string | null>(null)
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false)
    const [quote, setQuote] = useState<Quote | null>(null)
    const [quoteError, setQuoteError] = useState<string | null>(null)
    const [isQuoting, setIsQuoting] = useState(false)
    const [isPlacingOrder, setIsPlacingOrder] = useState(false)
    const [orderError, setOrderError] = useState<string | null>(null)
    const [placedOrder, setPlacedOrder] = useState<{ id: string; total: number } | null>(null)
    const [paymentNotice, setPaymentNotice] = useState<string | null>(null)
    const [hydrated, setHydrated] = useState(false)

    const errors = validateUaeAddress(address)
    const visibleErrors = Object.fromEntries(
        Object.entries(errors).filter(([field]) => touched[field as AddressField]),
    ) as Partial<Record<AddressField, string>>
    const addressValid = Object.keys(errors).length === 0

    const quoteItems = useMemo(
        () =>
            items.map((item) => ({
                productId: item.id,
                size: item.size,
                color: item.color,
                comboId: item.comboId,
                comboGroupId: item.comboGroupId,
                quantity: item.quantity,
            })),
        [items],
    )

    // Restore progress, then fill gaps from the saved account address.
    useEffect(() => {
        const saved = loadCheckoutState()
        if (saved) {
            if (saved.step) setStep(Math.min(saved.step, 3))
            if (saved.address) setAddress({ ...EMPTY_UAE_ADDRESS, ...saved.address })
            if (saved.paymentMethod) setPaymentMethod(saved.paymentMethod === "card" && !cardPayment ? "cod" : saved.paymentMethod)
            if (saved.couponCode) setCouponCode(saved.couponCode)
        }
        const params = new URLSearchParams(window.location.search)
        if (params.get("payment") === "cancelled") {
            setPaymentNotice("Payment was cancelled. Your bag is saved — you can try again or choose another payment method.")
            setStep(2)
        }
        setHydrated(true)
    }, [cardPayment])

    useEffect(() => {
        if (!session) return
        getSavedShippingAddress()
            .then((saved) => {
                if (!saved) return
                setAddress((current) => {
                    const merged = { ...current }
                    for (const key of Object.keys(saved) as AddressField[]) {
                        if (!merged[key] && saved[key]) merged[key] = saved[key] as string
                    }
                    if (!current.emirate || current.emirate === EMPTY_UAE_ADDRESS.emirate) merged.emirate = saved.emirate || current.emirate
                    return merged
                })
            })
            .catch(() => {
                // Prefill is a convenience; the customer can type their address.
            })
    }, [session])

    useEffect(() => {
        if (!isAuthPending && !session) router.replace("/account?redirect=/checkout")
    }, [isAuthPending, session, router])

    useEffect(() => {
        if (!hydrated) return
        try {
            const state: SavedState = { step, address, paymentMethod, couponCode }
            window.sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(state))
        } catch {
            // Storage may be unavailable; checkout still works without it.
        }
    }, [address, couponCode, hydrated, paymentMethod, step])

    useEffect(() => {
        if (hydrated && items.length > 0) {
            trackEcommerce("begin_checkout", {
                items: items.map((item) => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
            })
        }
        // Fire once per visit.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated])

    // Server-authoritative totals.
    const refreshQuote = useCallback(
        async (signal?: AbortSignal) => {
            if (quoteItems.length === 0) return
            setIsQuoting(true)
            try {
                const response = await fetch("/api/checkout/quote", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ items: quoteItems, couponCode, paymentMethod, emirate: address.emirate }),
                    signal,
                })
                const data = await response.json()
                if (!response.ok) {
                    if (couponCode && /coupon|code|offer|minimum|expired|valid/i.test(data.error ?? "")) {
                        setCouponCode(null)
                        setCouponError(data.error)
                        return
                    }
                    setQuoteError(data.error ?? "We couldn't price your bag.")
                    setQuote(null)
                    return
                }
                setQuote(data)
                setQuoteError(null)
            } catch (error) {
                if ((error as Error).name !== "AbortError") setQuoteError("We couldn't price your bag. Please check your connection.")
            } finally {
                if (!signal?.aborted) setIsQuoting(false)
            }
        },
        [address.emirate, couponCode, paymentMethod, quoteItems],
    )

    useEffect(() => {
        if (!hydrated || !isHydrated) return
        const controller = new AbortController()
        const timer = window.setTimeout(() => refreshQuote(controller.signal), 150)
        return () => {
            controller.abort()
            window.clearTimeout(timer)
        }
    }, [hydrated, isHydrated, refreshQuote])

    const codAvailable = COD_ENABLED && !quote?.codUnavailableReason
    useEffect(() => {
        if (paymentMethod === "cod" && quote && !codAvailable && cardPayment) setPaymentMethod("card")
    }, [cardPayment, codAvailable, paymentMethod, quote])

    const updateAddress = (field: AddressField, value: string) => setAddress((current) => ({ ...current, [field]: value }))
    const touch = (field: AddressField) => setTouched((current) => ({ ...current, [field]: true }))

    const continueToPayment = () => {
        if (!addressValid) {
            setTouched(Object.fromEntries(Object.keys(EMPTY_UAE_ADDRESS).map((key) => [key, true])))
            const first = Object.keys(errors)[0]
            document.getElementById(`checkout-${first}`)?.focus()
            return
        }
        setStep(2)
        window.scrollTo({ top: 0 })
    }

    const applyCoupon = async () => {
        const code = couponInput.trim().toUpperCase()
        if (!code) return
        setIsValidatingCoupon(true)
        setCouponError(null)
        try {
            const response = await fetch("/api/coupons/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, orderTotal: quote?.subtotal ?? 0 }),
            })
            const result = await response.json()
            if (result.valid) {
                setCouponCode(result.code ?? code)
                setCouponInput("")
            } else {
                setCouponError(result.error || "This code isn't valid")
            }
        } catch {
            setCouponError("We couldn't check that code. Please try again.")
        } finally {
            setIsValidatingCoupon(false)
        }
    }

    const placeOrder = async () => {
        setIsPlacingOrder(true)
        setOrderError(null)
        const payload = { items: quoteItems, couponCode, shippingAddress: address, paymentMethod }

        try {
            if (paymentMethod === "cod") {
                const response = await fetch("/api/orders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })
                const result = await response.json()
                if (!response.ok || !result.success) {
                    setOrderError(result.error || "We couldn't place your order. Please try again.")
                    setIsPlacingOrder(false)
                    refreshQuote()
                    return
                }
                trackEcommerce("purchase", {
                    transactionId: result.orderId,
                    value: quote?.total,
                    paymentType: "cod",
                    items: items.map((item) => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
                })
                setPlacedOrder({ id: result.orderId, total: quote?.total ?? 0 })
                clearCart()
                window.sessionStorage.removeItem(CHECKOUT_STORAGE_KEY)
                window.scrollTo({ top: 0 })
                setIsPlacingOrder(false)
                return
            }

            trackEcommerce("add_payment_info", {
                value: quote?.total,
                paymentType: "card",
                items: items.map((item) => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
            })
            const response = await fetch("/api/checkout/card", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const result = await response.json()
            if (!response.ok || !result.redirectUrl) {
                setOrderError(result.error || "The payment page could not be opened. Please try again.")
                setIsPlacingOrder(false)
                return
            }
            window.location.assign(result.redirectUrl)
        } catch {
            setOrderError("We couldn't reach our servers. Please check your connection and try again.")
            setIsPlacingOrder(false)
        }
    }

    if (isAuthPending || !session || !hydrated) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4" role="status">
                <Loader2 className="h-6 w-6 animate-spin text-brand" />
                <p className="font-heading text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Preparing checkout</p>
            </div>
        )
    }

    if (placedOrder) {
        return (
            <div className="flex min-h-screen items-center justify-center px-6">
                <div className="max-w-md space-y-6 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-brand">
                        <Check className="h-7 w-7 text-brand-strong" />
                    </div>
                    <div className="space-y-2">
                        <p className="font-heading text-[10px] uppercase tracking-[0.3em] text-brand-strong">Order MH-{placedOrder.id.slice(0, 8).toUpperCase()}</p>
                        <h1 className="font-display text-4xl">Thank you</h1>
                    </div>
                    <p className="text-sm leading-7 text-muted-foreground">
                        Your order is confirmed and we&apos;re preparing it with care. Please have {formatPrice(placedOrder.total)} ready — you can pay the courier in cash or by card on delivery. A confirmation has been sent to {address.email}.
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

    if (isHydrated && items.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center px-6">
                <div className="space-y-5 text-center">
                    <h1 className="font-display text-3xl">Your bag is empty</h1>
                    <p className="text-sm text-muted-foreground">Discover something beautiful to bring home.</p>
                    <Link href="/shop" className="inline-flex h-12 items-center border border-foreground px-7 font-heading text-[11px] uppercase tracking-[0.22em] hover:bg-foreground hover:text-background">
                        Continue shopping
                    </Link>
                </div>
            </div>
        )
    }

    const summaryRows = quote
        ? [
            { label: "Subtotal", value: formatPrice(quote.subtotal) },
            ...(quote.comboDiscount > 0 ? [{ label: "Set savings", value: `-${formatPrice(quote.comboDiscount)}`, accent: true }] : []),
            ...(quote.couponDiscount > 0 ? [{ label: `Code ${quote.couponCode ?? ""}`.trim(), value: `-${formatPrice(quote.couponDiscount)}`, accent: true }] : []),
            { label: "Delivery", value: quote.shippingCost === 0 ? "Complimentary" : formatPrice(quote.shippingCost) },
            ...(quote.codFee > 0 ? [{ label: "Cash on delivery fee", value: formatPrice(quote.codFee) }] : []),
        ]
        : []

    return (
        <div className="min-h-screen">
            <div className="border-b border-border/60 px-5 py-12 md:px-12 md:py-16">
                <p className="mb-3 flex items-center gap-2 font-heading text-[10px] uppercase tracking-[0.3em] text-brand-strong">
                    <Lock className="h-3 w-3" /> Secure checkout
                </p>
                <h1 className="font-display text-4xl md:text-5xl">Checkout</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-8 border-border/60 px-5 py-8 md:px-12 lg:border-r lg:py-12">
                    <ol className="flex items-center gap-3 font-heading text-[10px] uppercase tracking-[0.16em]" aria-label="Checkout steps">
                        {["Delivery", "Payment", "Review"].map((label, index) => (
                            <li key={label} className="flex items-center gap-3">
                                {index > 0 && <span className="h-px w-6 bg-border" aria-hidden="true" />}
                                <button
                                    type="button"
                                    disabled={index + 1 > step}
                                    onClick={() => setStep(index + 1)}
                                    aria-current={step === index + 1 ? "step" : undefined}
                                    className={cn(step >= index + 1 ? "text-foreground" : "text-muted-foreground", step === index + 1 && "font-semibold")}
                                >
                                    {index + 1}. {label}
                                </button>
                            </li>
                        ))}
                    </ol>

                    {(orderError || paymentNotice) && (
                        <div className="flex items-start gap-2 border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive" role="alert">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                            {orderError ?? paymentNotice}
                        </div>
                    )}

                    {step === 1 && (
                        <form
                            noValidate
                            onSubmit={(event) => {
                                event.preventDefault()
                                continueToPayment()
                            }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-3">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <h2 className="font-heading text-xs font-medium uppercase tracking-[0.16em]">Delivery details</h2>
                            </div>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field id="checkout-firstName" label="First name" required error={visibleErrors.firstName}>
                                    <input id="checkout-firstName" autoComplete="given-name" value={address.firstName} onChange={(e) => updateAddress("firstName", e.target.value)} onBlur={() => touch("firstName")} aria-invalid={Boolean(visibleErrors.firstName)} aria-describedby={visibleErrors.firstName ? "checkout-firstName-error" : undefined} className={cn(inputClass, visibleErrors.firstName ? "border-destructive focus:ring-destructive" : "border-input focus:ring-ring")} />
                                </Field>
                                <Field id="checkout-lastName" label="Last name" required error={visibleErrors.lastName}>
                                    <input id="checkout-lastName" autoComplete="family-name" value={address.lastName} onChange={(e) => updateAddress("lastName", e.target.value)} onBlur={() => touch("lastName")} aria-invalid={Boolean(visibleErrors.lastName)} className={cn(inputClass, visibleErrors.lastName ? "border-destructive focus:ring-destructive" : "border-input focus:ring-ring")} />
                                </Field>
                                <Field id="checkout-email" label="Email" required error={visibleErrors.email}>
                                    <input id="checkout-email" type="email" inputMode="email" autoComplete="email" value={address.email} onChange={(e) => updateAddress("email", e.target.value)} onBlur={() => touch("email")} aria-invalid={Boolean(visibleErrors.email)} className={cn(inputClass, visibleErrors.email ? "border-destructive focus:ring-destructive" : "border-input focus:ring-ring")} />
                                </Field>
                                <Field id="checkout-phone" label="Mobile number" required error={visibleErrors.phone} hint="UAE number, e.g. 050 123 4567">
                                    <input id="checkout-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+971 50 123 4567" value={address.phone} onChange={(e) => updateAddress("phone", e.target.value)} onBlur={() => touch("phone")} aria-invalid={Boolean(visibleErrors.phone)} className={cn(inputClass, visibleErrors.phone ? "border-destructive focus:ring-destructive" : "border-input focus:ring-ring")} />
                                </Field>
                                <Field id="checkout-emirate" label="Emirate" required error={visibleErrors.emirate}>
                                    <select id="checkout-emirate" autoComplete="address-level1" value={address.emirate} onChange={(e) => updateAddress("emirate", e.target.value)} onBlur={() => touch("emirate")} className={cn(inputClass, "appearance-none", visibleErrors.emirate ? "border-destructive" : "border-input focus:ring-ring")}>
                                        {SHIPPING_EMIRATES.map((emirate) => <option key={emirate} value={emirate}>{emirate}</option>)}
                                    </select>
                                </Field>
                                <Field id="checkout-area" label="Area / community" required error={visibleErrors.area}>
                                    <input id="checkout-area" autoComplete="address-level2" placeholder="e.g. Dubai Marina" value={address.area} onChange={(e) => updateAddress("area", e.target.value)} onBlur={() => touch("area")} aria-invalid={Boolean(visibleErrors.area)} className={cn(inputClass, visibleErrors.area ? "border-destructive focus:ring-destructive" : "border-input focus:ring-ring")} />
                                </Field>
                                <Field id="checkout-building" label="Building / villa" required error={visibleErrors.building}>
                                    <input id="checkout-building" autoComplete="address-line1" placeholder="Building name or villa number" value={address.building} onChange={(e) => updateAddress("building", e.target.value)} onBlur={() => touch("building")} aria-invalid={Boolean(visibleErrors.building)} className={cn(inputClass, visibleErrors.building ? "border-destructive focus:ring-destructive" : "border-input focus:ring-ring")} />
                                </Field>
                                <Field id="checkout-apartment" label="Apartment / floor" error={visibleErrors.apartment}>
                                    <input id="checkout-apartment" autoComplete="address-line2" placeholder="Optional" value={address.apartment ?? ""} onChange={(e) => updateAddress("apartment", e.target.value)} className={cn(inputClass, "border-input focus:ring-ring")} />
                                </Field>
                                <Field id="checkout-street" label="Street" error={visibleErrors.street} className="sm:col-span-2">
                                    <input id="checkout-street" placeholder="Optional" value={address.street ?? ""} onChange={(e) => updateAddress("street", e.target.value)} className={cn(inputClass, "border-input focus:ring-ring")} />
                                </Field>
                                <Field id="checkout-instructions" label="Delivery instructions" error={visibleErrors.instructions} className="sm:col-span-2">
                                    <textarea id="checkout-instructions" rows={3} placeholder="Landmark, gate code, best time to call… (optional)" value={address.instructions ?? ""} onChange={(e) => updateAddress("instructions", e.target.value)} onBlur={() => touch("instructions")} className="w-full resize-none border border-input bg-card/60 px-4 py-3 text-[15px] focus:outline-none focus:ring-1 focus:ring-ring" />
                                </Field>
                            </div>
                            <p className="flex items-center gap-2 text-xs text-muted-foreground"><Truck className="h-3.5 w-3.5" /> Delivered {DELIVERY_ESTIMATE}.</p>
                            <button type="submit" className="h-13 w-full bg-foreground font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-background transition-colors duration-500 hover:bg-brand hover:text-neutral-950">
                                Continue to payment
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                <h2 className="font-heading text-xs font-medium uppercase tracking-[0.16em]">Payment</h2>
                            </div>
                            <fieldset className="space-y-2">
                                <legend className="sr-only">Payment method</legend>
                                {cardPayment && (
                                    <label className={cn("flex cursor-pointer items-start gap-3 border p-4 transition-colors", paymentMethod === "card" ? "border-foreground bg-secondary/40" : "border-input hover:border-foreground/50")}>
                                        <input type="radio" name="payment" value="card" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} className="mt-1 accent-foreground" />
                                        <span>
                                            <span className="flex items-center gap-2 text-sm"><CreditCard className="h-4 w-4" /> Pay by card</span>
                                            <span className="mt-1 block text-xs text-muted-foreground">{cardPayment.label}. You&apos;ll complete payment on our secure payment partner&apos;s page.</span>
                                        </span>
                                    </label>
                                )}
                                {COD_ENABLED && (
                                    <label className={cn("flex items-start gap-3 border p-4 transition-colors", !codAvailable ? "cursor-not-allowed opacity-60" : "cursor-pointer", paymentMethod === "cod" ? "border-foreground bg-secondary/40" : "border-input hover:border-foreground/50")}>
                                        <input type="radio" name="payment" value="cod" checked={paymentMethod === "cod"} disabled={!codAvailable} onChange={() => setPaymentMethod("cod")} className="mt-1 accent-foreground" />
                                        <span>
                                            <span className="flex items-center gap-2 text-sm"><Banknote className="h-4 w-4" /> Cash on delivery</span>
                                            <span className="mt-1 block text-xs text-muted-foreground">
                                                {quote?.codUnavailableReason ?? "Pay the courier in cash or by card when your order arrives. A small COD fee applies."}
                                            </span>
                                        </span>
                                    </label>
                                )}
                                {!cardPayment && !codAvailable && (
                                    <p className="border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive" role="alert">
                                        No payment method is available for this order. Please contact us and we&apos;ll arrange it for you.
                                    </p>
                                )}
                            </fieldset>

                            <div className="space-y-3 border-t border-border/60 pt-5">
                                <label htmlFor="checkout-coupon" className="font-heading text-[10px] font-medium uppercase tracking-[0.2em]">Gift card or promo code</label>
                                {couponCode ? (
                                    <div className="flex items-center justify-between border border-brand/60 bg-brand-soft/40 p-3">
                                        <span className="text-xs">Code <strong>{couponCode}</strong> applied{quote && quote.couponDiscount > 0 ? ` — you save ${formatPrice(quote.couponDiscount)}` : ""}</span>
                                        <button type="button" onClick={() => setCouponCode(null)} className="font-heading text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">Remove</button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input id="checkout-coupon" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon() } }} placeholder="Enter code" autoComplete="off" className={cn(inputClass, "flex-1 uppercase border-input focus:ring-ring")} />
                                        <button type="button" onClick={applyCoupon} disabled={isValidatingCoupon || !couponInput.trim()} className="h-12 border border-foreground px-5 font-heading text-[10px] uppercase tracking-[0.18em] hover:bg-foreground hover:text-background disabled:opacity-40">
                                            {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                                        </button>
                                    </div>
                                )}
                                {couponError && <p className="text-xs text-destructive" role="alert">{couponError}</p>}
                            </div>

                            <div className="flex gap-3">
                                <button type="button" onClick={() => setStep(1)} className="h-13 flex-1 border border-input font-heading text-[11px] uppercase tracking-[0.18em] hover:border-foreground">Back</button>
                                <button type="button" onClick={() => { setStep(3); window.scrollTo({ top: 0 }) }} disabled={!cardPayment && !codAvailable} className="h-13 flex-1 bg-foreground font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-background hover:bg-brand hover:text-neutral-950 disabled:opacity-40">Review order</button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <h2 className="font-heading text-xs font-medium uppercase tracking-[0.16em]">Review your order</h2>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1 border border-border/70 p-4 text-sm">
                                    <p className="font-heading text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Delivering to</p>
                                    <p className="pt-1">{fullName(address)}</p>
                                    {formatUaeAddressLines(address).map((line) => <p key={line} className="text-xs text-muted-foreground">{line}</p>)}
                                    <p className="text-xs text-muted-foreground">{address.phone} · {address.email}</p>
                                    <button type="button" onClick={() => setStep(1)} className="pt-2 text-xs underline underline-offset-2">Edit</button>
                                </div>
                                <div className="space-y-1 border border-border/70 p-4 text-sm">
                                    <p className="font-heading text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Payment</p>
                                    <p className="pt-1">{paymentMethod === "card" ? "Card (secure payment page)" : "Cash on delivery"}</p>
                                    <button type="button" onClick={() => setStep(2)} className="pt-2 text-xs underline underline-offset-2">Edit</button>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={placeOrder}
                                disabled={isPlacingOrder || !quote || isQuoting}
                                className="flex h-13 w-full items-center justify-center gap-2 bg-foreground font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-background transition-colors duration-500 hover:bg-brand hover:text-neutral-950 disabled:opacity-50"
                            >
                                {isPlacingOrder ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> {paymentMethod === "card" ? "Opening secure payment" : "Placing order"}</>
                                ) : paymentMethod === "card" ? (
                                    <>Pay {quote ? formatPrice(quote.total) : ""}</>
                                ) : (
                                    <>Place order{quote ? ` · ${formatPrice(quote.total)}` : ""}</>
                                )}
                            </button>
                            <p className="text-center text-[11px] leading-5 text-muted-foreground">
                                By placing your order you agree to our <Link href="/policies/terms" className="underline">terms</Link> and <Link href="/policies/returns" className="underline">returns policy</Link>.
                            </p>
                        </div>
                    )}
                </div>

                {/* Summary */}
                <aside className="bg-secondary/40 px-5 py-8 md:px-12 lg:py-12" aria-label="Order summary">
                    <h2 className="mb-6 font-heading text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Order summary</h2>
                    <ul className="space-y-4">
                        {items.map((item) => {
                            const options = [
                                item.size && item.size !== "Standard" ? `${item.sizeLabel ?? "Option"}: ${item.size}` : null,
                                item.color ? `${item.colorLabel ?? "Colour"}: ${item.color}` : null,
                            ].filter(Boolean).join(" · ")
                            return (
                                <li key={`${item.comboGroupId || "single"}-${item.id}-${item.size}-${item.color || ""}`} className="flex gap-4">
                                    <div className="relative h-16 w-16 flex-none overflow-hidden bg-muted">
                                        <Image src={normalizeProductImage(item.image)} alt="" fill sizes="64px" className="object-cover" />
                                        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] text-background">{item.quantity}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-heading text-xs uppercase tracking-[0.06em]">{item.name}</p>
                                        {options && <p className="mt-0.5 text-[11px] text-muted-foreground">{options}</p>}
                                        {item.comboName && <p className="mt-0.5 text-[11px] text-brand-strong">{item.comboName}</p>}
                                    </div>
                                    <p className="text-sm tabular-nums">{formatPrice(item.price * item.quantity)}</p>
                                </li>
                            )
                        })}
                    </ul>
                    <div className="mt-6 space-y-2.5 border-t border-border/60 pt-5 text-sm">
                        {quote ? (
                            <>
                                {summaryRows.map((row) => (
                                    <div key={row.label} className={cn("flex justify-between", row.accent && "text-brand-strong")}>
                                        <span className="text-muted-foreground">{row.label}</span>
                                        <span className="tabular-nums">{row.value}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between border-t border-border/60 pt-3 text-base">
                                    <span>Total</span>
                                    <span className="tabular-nums">{formatPrice(quote.total)}</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">Includes VAT of {formatPrice(quote.vatAmount)}</p>
                                {quote.shippingCost > 0 && (
                                    <p className="text-[11px] text-muted-foreground">Complimentary delivery on orders over {FREE_SHIPPING_THRESHOLD_DISPLAY}.</p>
                                )}
                            </>
                        ) : quoteError ? (
                            <p className="text-xs text-destructive" role="alert">{quoteError}</p>
                        ) : (
                            <div className="space-y-2" aria-hidden="true">
                                <div className="h-3 w-full animate-pulse bg-muted" />
                                <div className="h-3 w-2/3 animate-pulse bg-muted" />
                            </div>
                        )}
                    </div>

                    <CheckoutBargain
                        cartItems={items}
                        totalPrice={quote?.subtotal ?? 0}
                        onApplyCoupon={(_discount: number, code: string) => setCouponCode(code)}
                        appliedCoupon={couponCode && quote ? { code: couponCode, discount: quote.couponDiscount } : null}
                        triggerOpen={false}
                        onTriggered={() => undefined}
                    />
                </aside>
            </div>
        </div>
    )
}
