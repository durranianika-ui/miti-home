"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/lib/cart-context"
import { trackEcommerce } from "@/lib/analytics"

/** Clears the bag and records the purchase once, after a confirmed card payment. */
export function PurchaseComplete({ orderId, total }: { orderId: string; total: number }) {
    const { items, clearCart, isHydrated } = useCart()
    const doneRef = useRef(false)

    useEffect(() => {
        if (!isHydrated || doneRef.current) return
        doneRef.current = true
        const key = `miti-purchase-${orderId}`
        try {
            if (window.sessionStorage.getItem(key)) return
            window.sessionStorage.setItem(key, "1")
            window.sessionStorage.removeItem("miti-checkout")
        } catch {
            // Storage unavailable — still clear the bag below.
        }
        if (items.length > 0) {
            trackEcommerce("purchase", {
                transactionId: orderId,
                value: total,
                paymentType: "card",
                items: items.map((item) => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
            })
        }
        clearCart()
    }, [clearCart, isHydrated, items, orderId, total])

    return null
}

/** Re-checks the payment status every few seconds while the provider confirms it. */
export function RefreshWhilePending() {
    const router = useRouter()
    useEffect(() => {
        let attempts = 0
        const timer = window.setInterval(() => {
            attempts += 1
            if (attempts > 20) window.clearInterval(timer)
            router.refresh()
        }, 3000)
        return () => window.clearInterval(timer)
    }, [router])
    return null
}
