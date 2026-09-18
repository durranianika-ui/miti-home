"use client"

import { useCart, type CartItem } from "@/lib/cart-context"
import { Button } from "@/components/ui/button"
import { X, Minus, Plus, ShoppingBag, Check } from "lucide-react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef } from "react"
import { normalizeProductImage } from "@/lib/image"
import { formatPrice } from "@/lib/money"
import { trackEcommerce } from "@/lib/analytics"
import { FREE_SHIPPING_THRESHOLD, FREE_SHIPPING_THRESHOLD_DISPLAY } from "@/lib/constants"

const STANDARD_OPTION = "Standard"

/** Cart lines may carry the product's option labels (added by set/PDP add-to-bag). */
type CartLine = CartItem & { sizeLabel?: string; colorLabel?: string }

function optionSummary(item: CartLine) {
    const parts: string[] = []
    if (item.size && item.size !== STANDARD_OPTION) {
        parts.push(`${item.sizeLabel || "Size"}: ${item.size}`)
    }
    if (item.color) {
        parts.push(`${item.colorLabel || "Colour"}: ${item.color}`)
    }
    return parts
}

function toAnalyticsItem(item: CartLine, quantity = item.quantity) {
    const variant = [item.size !== STANDARD_OPTION ? item.size : null, item.color].filter(Boolean).join(" / ")
    return {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity,
        ...(variant ? { variant } : {}),
    }
}

function lineKey(item: CartLine) {
    return `${item.comboGroupId || "single"}-${item.id}-${item.size}-${item.color || ""}`
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function CartDrawer() {
    const { items, isOpen, setIsOpen, removeItem, updateQuantity, totalItems, totalPrice, clearCart } = useCart()
    const reduceMotion = useReducedMotion()
    const drawerRef = useRef<HTMLDivElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const returnFocusRef = useRef<HTMLElement | null>(null)
    const freeShippingUnlocked = totalPrice >= FREE_SHIPPING_THRESHOLD
    const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - totalPrice)
    const freeShippingProgress = FREE_SHIPPING_THRESHOLD > 0 ? Math.min(100, Math.round((totalPrice / FREE_SHIPPING_THRESHOLD) * 100)) : 100
    const hasSetItems = items.some((item) => item.comboGroupId)

    // Move focus into the drawer when it opens and hand it back when it closes.
    useEffect(() => {
        if (isOpen) {
            returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
            closeButtonRef.current?.focus()
            return
        }
        returnFocusRef.current?.focus?.()
        returnFocusRef.current = null
    }, [isOpen])

    // Close on Escape; keep Tab inside the dialog.
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsOpen(false)
                return
            }
            if (e.key !== "Tab" || !drawerRef.current) return
            const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
            if (focusable.length === 0) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first.focus()
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, setIsOpen])

    const handleRemove = (item: CartLine) => {
        // Removing one piece of a set removes the whole set.
        const removed = item.comboGroupId ? items.filter((line) => line.comboGroupId === item.comboGroupId) : [item]
        trackEcommerce("remove_from_cart", { items: removed.map((line) => toAnalyticsItem(line)) })
        removeItem(item.id, item.size, item.color, item.comboGroupId)
    }

    const handleDecrease = (item: CartLine) => {
        if (item.quantity <= 1) {
            handleRemove(item)
            return
        }
        const affected = item.comboGroupId ? items.filter((line) => line.comboGroupId === item.comboGroupId) : [item]
        trackEcommerce("remove_from_cart", { items: affected.map((line) => toAnalyticsItem(line, 1)) })
        updateQuantity(item.id, item.size, item.quantity - 1, item.color, item.comboGroupId)
    }

    const handleClear = () => {
        if (items.length > 0) {
            trackEcommerce("remove_from_cart", { items: items.map((line) => toAnalyticsItem(line)) })
        }
        clearCart()
    }

    const handleCheckout = () => {
        trackEcommerce("begin_checkout", { items: items.map((line) => toAnalyticsItem(line)), value: totalPrice })
        setIsOpen(false)
    }

    const overlayTransition = { duration: reduceMotion ? 0 : 0.3, ease: [0.32, 0.72, 0, 1] as const }
    const drawerTransition = reduceMotion
        ? { duration: 0 }
        : { type: "spring" as const, stiffness: 300, damping: 30 }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={overlayTransition}
                        style={{ willChange: "opacity" }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />

                    {/* Drawer */}
                    <motion.div
                        ref={drawerRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cart-drawer-title"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={drawerTransition}
                        style={{ willChange: "transform" }}
                        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-background text-foreground"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-border px-6 py-5">
                            <div className="flex items-center gap-3">
                                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                                <h2 id="cart-drawer-title" className="font-heading text-[11px] font-medium uppercase tracking-[0.3em]">
                                    Your bag <span className="text-muted-foreground">({totalItems})</span>
                                </h2>
                            </div>
                            <Button ref={closeButtonRef} variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => setIsOpen(false)} aria-label="Close bag">
                                <X className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        </div>

                        {/* Free-delivery progress */}
                        {items.length > 0 && (
                            <div className="border-b border-border px-6 py-4">
                                <p className="text-xs text-foreground" aria-live="polite">
                                    {freeShippingUnlocked ? (
                                        <span className="flex items-center gap-2">
                                            <Check className="h-3.5 w-3.5 text-brand-strong" aria-hidden="true" />
                                            Your order qualifies for complimentary UAE delivery.
                                        </span>
                                    ) : (
                                        <>
                                            You are <span className="tabular-nums">{formatPrice(freeShippingRemaining)}</span> away from complimentary delivery.
                                        </>
                                    )}
                                </p>
                                <div
                                    className="mt-3 h-px w-full bg-border"
                                    role="progressbar"
                                    aria-label={`Progress towards complimentary delivery over ${FREE_SHIPPING_THRESHOLD_DISPLAY}`}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={freeShippingProgress}
                                >
                                    <div
                                        className="h-px bg-brand transition-[width] duration-500 motion-reduce:transition-none"
                                        style={{ width: `${freeShippingProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Items */}
                        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
                            {items.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center space-y-6 text-center">
                                    <div className="flex h-16 w-16 items-center justify-center border border-border">
                                        <ShoppingBag className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-display text-2xl font-light">Your bag is empty</p>
                                        <p className="mx-auto max-w-[260px] text-xs leading-relaxed text-muted-foreground">
                                            Discover pieces for a more beautiful everyday. Complimentary UAE delivery on orders over {FREE_SHIPPING_THRESHOLD_DISPLAY}.
                                        </p>
                                    </div>
                                    <div className="flex w-full max-w-[260px] flex-col gap-3">
                                        <Link
                                            href="/new"
                                            onClick={() => setIsOpen(false)}
                                            className="flex h-11 items-center justify-center bg-foreground font-heading text-[11px] uppercase tracking-[0.22em] text-background transition-colors hover:bg-brand hover:text-neutral-950"
                                        >
                                            Shop new arrivals
                                        </Link>
                                        <Link
                                            href="/shop"
                                            onClick={() => setIsOpen(false)}
                                            className="flex h-11 items-center justify-center border border-foreground font-heading text-[11px] uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background"
                                        >
                                            Shop all
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <ul className="space-y-5">
                                    {items.map((line) => {
                                        const item = line as CartLine
                                        const options = optionSummary(item)
                                        return (
                                            <li key={lineKey(item)} className="flex gap-4 border-b border-border/60 pb-5">
                                                <div className="relative aspect-square w-20 flex-shrink-0 overflow-hidden bg-muted">
                                                    <Image
                                                        src={normalizeProductImage(item.image)}
                                                        alt={item.name}
                                                        fill
                                                        sizes="80px"
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1 space-y-1">
                                                    <h3 className="text-sm leading-snug">{item.name}</h3>
                                                    {item.comboName && (
                                                        <p className="font-heading text-[10px] uppercase tracking-[0.2em] text-brand-strong">
                                                            Part of a set
                                                        </p>
                                                    )}
                                                    {options.length > 0 && (
                                                        <p className="text-xs text-muted-foreground">{options.join(" · ")}</p>
                                                    )}
                                                    <p className="text-sm tabular-nums">
                                                        {formatPrice(item.price)}
                                                        {item.quantity > 1 && (
                                                            <span className="ml-2 text-xs text-muted-foreground">
                                                                {formatPrice(item.price * item.quantity)} total
                                                            </span>
                                                        )}
                                                    </p>
                                                    <div className="flex items-center gap-2 pt-2">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7 rounded-none"
                                                            aria-label={`Decrease quantity of ${item.name}`}
                                                            onClick={() => handleDecrease(item)}
                                                        >
                                                            <Minus className="h-3 w-3" aria-hidden="true" />
                                                        </Button>
                                                        <span className="w-6 text-center text-sm tabular-nums" aria-label={`Quantity ${item.quantity}`}>
                                                            {item.quantity}
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7 rounded-none"
                                                            aria-label={`Increase quantity of ${item.name}`}
                                                            onClick={() => updateQuantity(item.id, item.size, item.quantity + 1, item.color, item.comboGroupId)}
                                                        >
                                                            <Plus className="h-3 w-3" aria-hidden="true" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 self-start rounded-none text-muted-foreground hover:text-foreground"
                                                    aria-label={item.comboGroupId ? `Remove the set containing ${item.name} from bag` : `Remove ${item.name} from bag`}
                                                    onClick={() => handleRemove(item)}
                                                >
                                                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                                                </Button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* Footer */}
                        {items.length > 0 && (
                            <div className="space-y-4 border-t border-border px-6 py-5">
                                <div className="flex items-baseline justify-between">
                                    <span className="font-heading text-[11px] font-medium uppercase tracking-[0.3em]">Subtotal</span>
                                    <span className="text-base tabular-nums">{formatPrice(totalPrice)}</span>
                                </div>
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                    Prices include VAT. Delivery{hasSetItems ? " and set savings are" : " is"} calculated at checkout.
                                </p>
                                <Link
                                    href="/checkout"
                                    onClick={handleCheckout}
                                    className="flex h-12 w-full items-center justify-center bg-foreground font-heading text-[11px] uppercase tracking-[0.22em] text-background transition-colors hover:bg-brand hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                >
                                    Checkout
                                </Link>
                                <div className="flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="font-heading text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        Continue shopping
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleClear}
                                        className="font-heading text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        Clear bag
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
