"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, XCircle } from "lucide-react"
import { cancelOrder } from "@/lib/actions/orders"

export function CancelOrderButton({ orderId }: { orderId: string }) {
    const router = useRouter()
    const [confirming, setConfirming] = useState(false)
    const [cancelling, setCancelling] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleCancel = async () => {
        setCancelling(true)
        setError(null)
        const result = await cancelOrder(orderId)
        if (!result.success) {
            setError(result.error || "We couldn't cancel this order.")
        } else {
            router.refresh()
        }
        setCancelling(false)
        setConfirming(false)
    }

    return (
        <div className="space-y-2 border-t border-border/60 pt-4">
            {confirming ? (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-auto text-sm text-muted-foreground">Cancel this order?</span>
                    <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        disabled={cancelling}
                        className="h-10 px-4 font-heading text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                    >
                        Keep order
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="inline-flex h-10 items-center gap-1.5 bg-destructive px-4 font-heading text-[10px] uppercase tracking-[0.16em] text-white disabled:opacity-60"
                    >
                        {cancelling ? <><Loader2 className="h-3 w-3 animate-spin" /> Cancelling</> : "Yes, cancel"}
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="inline-flex h-10 items-center gap-1.5 border border-destructive/40 px-4 font-heading text-[10px] uppercase tracking-[0.16em] text-destructive hover:bg-destructive/5"
                >
                    <XCircle className="h-3.5 w-3.5" />
                    Cancel order
                </button>
            )}
            {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
        </div>
    )
}
