"use client"

import { useState, useRef, useEffect, useCallback, useId } from "react"
import { createPortal } from "react-dom"
import { X, Send, Copy, Check, Clock, Loader2 } from "lucide-react"
import { BARGAIN_AI_ENABLED } from "@/lib/constants"
import { formatPrice } from "@/lib/money"
import { cn } from "@/lib/utils"

interface ConciergeMessage {
    id: string
    role: "user" | "assistant"
    content: string
}

interface CartItem {
    id: string
    name: string
    price: number
    quantity: number
    comboId?: string
    comboGroupId?: string
}

interface CheckoutBargainProps {
    cartItems: CartItem[]
    totalPrice: number
    onApplyCoupon: (discount: number, code: string) => void
    appliedCoupon: { code: string; discount: number } | null
    triggerOpen?: boolean
    onTriggered?: () => void
}

const GREETING = "Thank you for your selection. Is there anything I can help you with before you complete your order?"
const RESTART = "Of course. Shall we look at your order again?"
const ERROR_REPLY = "I'm sorry, I couldn't respond just now. Please try again in a moment."

const primaryButton =
    "flex h-11 w-full items-center justify-center bg-foreground font-heading text-[11px] uppercase tracking-[0.22em] text-background transition-colors hover:bg-brand hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"

/**
 * Optional private concierge at checkout. Miti Home does not compete on
 * price, so this is off unless NEXT_PUBLIC_FEATURE_BARGAIN_AI=true, and even
 * then renders nothing until /api/bargain confirms the model is configured.
 */
export function CheckoutBargain(props: CheckoutBargainProps) {
    if (!BARGAIN_AI_ENABLED) return null
    return <ConciergeAvailabilityGate {...props} />
}

function ConciergeAvailabilityGate(props: CheckoutBargainProps) {
    const [available, setAvailable] = useState(false)

    useEffect(() => {
        const controller = new AbortController()
        fetch("/api/bargain", { method: "GET", cache: "no-store", signal: controller.signal })
            .then((response) => setAvailable(response.ok))
            .catch(() => setAvailable(false))
        return () => controller.abort()
    }, [])

    if (!available) return null
    return <CheckoutConcierge {...props} />
}

function CheckoutConcierge({ cartItems, totalPrice, onApplyCoupon, appliedCoupon, triggerOpen, onTriggered }: CheckoutBargainProps) {
    const titleId = useId()
    const [isOpen, setIsOpen] = useState(false)
    const [showPrompt, setShowPrompt] = useState(true)
    const [couponGenerated, setCouponGenerated] = useState<{ code: string; discount: number; expiresAt: number } | null>(null)
    const [copied, setCopied] = useState(false)
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
    const [couponExpired, setCouponExpired] = useState(false)
    const [messages, setMessages] = useState<ConciergeMessage[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [negotiationRound, setNegotiationRound] = useState(0)
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const dialogRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const returnFocusRef = useRef<HTMLElement | null>(null)

    // Allow the checkout page to open the concierge programmatically.
    const triggerOpenRef = useRef(triggerOpen)
    const isOpenRef = useRef(isOpen)
    const appliedCouponRef = useRef(appliedCoupon)
    const onTriggeredRef = useRef(onTriggered)
    useEffect(() => {
        triggerOpenRef.current = triggerOpen
        isOpenRef.current = isOpen
        appliedCouponRef.current = appliedCoupon
        onTriggeredRef.current = onTriggered
    })

    const handleOpen = useCallback(() => {
        returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        setShowPrompt(false)
        setIsOpen(true)
        setMessages((prev) => (prev.length === 0 ? [{ id: "greeting", role: "assistant", content: GREETING }] : prev))
    }, [])

    const handleClose = useCallback(() => {
        setIsOpen(false)
        returnFocusRef.current?.focus?.()
    }, [])

    useEffect(() => {
        if (triggerOpen && !isOpenRef.current && !appliedCouponRef.current) {
            handleOpen()
            onTriggeredRef.current?.()
        }
    }, [triggerOpen, handleOpen])

    // Focus the message field on open; Escape closes; Tab stays in the dialog.
    useEffect(() => {
        if (!isOpen) return
        const focusTarget = inputRef.current ?? dialogRef.current
        focusTarget?.focus()

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                handleClose()
                return
            }
            if (event.key !== "Tab" || !dialogRef.current) return
            const focusable = Array.from(
                dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), [href]")
            )
            if (focusable.length === 0) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [isOpen, handleClose])

    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage: ConciergeMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: input.trim(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        const currentRound = negotiationRound + 1
        setNegotiationRound(currentRound)

        try {
            const response = await fetch("/api/bargain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage]
                        .filter((message) => message.id !== "greeting")
                        .map(({ role, content }) => ({ role, content })),
                    cartItems: cartItems.map((item) => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        comboId: item.comboId,
                        comboGroupId: item.comboGroupId,
                    })),
                    cartTotal: totalPrice,
                    negotiationRound: currentRound,
                }),
            })

            if (!response.ok) throw new Error(`Concierge unavailable (${response.status})`)

            const couponCode = response.headers.get("X-Coupon-Code")
            const couponDiscount = response.headers.get("X-Coupon-Discount")
            const couponExpires = response.headers.get("X-Coupon-Expires")

            if (couponCode && couponDiscount && couponExpires) {
                const expiresAt = Number.parseInt(couponExpires, 10)
                setCouponGenerated({
                    code: couponCode,
                    discount: Number(couponDiscount),
                    expiresAt,
                })
                setCouponExpired(false)
                setTimeRemaining(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)))
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            const assistantId = crypto.randomUUID()
            let content = ""

            setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content }])

            if (reader) {
                let done = false
                while (!done) {
                    const { value, done: readerDone } = await reader.read()
                    done = readerDone
                    if (value) {
                        content += decoder.decode(value, { stream: true })
                        const snapshot = content
                        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m)))
                    }
                }
            }
        } catch (error) {
            console.error("Concierge error:", error)
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: ERROR_REPLY }])
        } finally {
            setIsLoading(false)
        }
    }, [input, isLoading, messages, cartItems, totalPrice, negotiationRound])

    // Countdown for the reserved courtesy.
    useEffect(() => {
        if (!couponGenerated || couponExpired) return

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((couponGenerated.expiresAt - Date.now()) / 1000))
            setTimeRemaining(remaining)
            if (remaining === 0) {
                setCouponExpired(true)
                clearInterval(interval)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [couponGenerated, couponExpired])

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [messages])

    const handleCopyCode = async () => {
        if (!couponGenerated || couponExpired) return
        try {
            await navigator.clipboard.writeText(couponGenerated.code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Clipboard can be blocked; the code stays visible on screen.
        }
    }

    const handleApplyCoupon = () => {
        if (couponGenerated && !appliedCoupon && !couponExpired) {
            onApplyCoupon(couponGenerated.discount, couponGenerated.code)
        }
    }

    const handleRestart = () => {
        setCouponGenerated(null)
        setCouponExpired(false)
        setTimeRemaining(null)
        setNegotiationRound(0)
        setMessages([{ id: "greeting", role: "assistant", content: RESTART }])
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const conciergeModal = isOpen && typeof document !== "undefined" ? createPortal(
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
            onClick={(event) => {
                if (event.target === event.currentTarget) handleClose()
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="w-full max-w-md overflow-hidden border border-border bg-background text-foreground shadow-2xl focus:outline-none motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div>
                        <p className="font-heading text-[10px] font-medium uppercase tracking-[0.3em] text-brand-strong">Miti Home</p>
                        <h2 id={titleId} className="font-display text-lg font-light">Private concierge</h2>
                    </div>
                    <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                        onClick={handleClose}
                        aria-label="Close concierge"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>

                {/* Conversation */}
                <div
                    ref={chatContainerRef}
                    className="h-80 space-y-4 overflow-y-auto bg-muted/40 p-5"
                    role="log"
                    aria-live="polite"
                    aria-busy={isLoading}
                >
                    {messages.map((msg) => (
                        <div key={msg.id} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
                            <div
                                className={cn(
                                    "max-w-[85%] px-4 py-3 text-sm leading-relaxed",
                                    msg.role === "user"
                                        ? "bg-foreground text-background"
                                        : "border border-border bg-background text-foreground"
                                )}
                            >
                                <span className="sr-only">{msg.role === "user" ? "You: " : "Concierge: "}</span>
                                <span className="whitespace-pre-wrap">
                                    {msg.content.split("**").map((part, i) =>
                                        i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
                                    )}
                                </span>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start" aria-hidden="true">
                            <div className="border border-border bg-background px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="miti-thinking-dot h-1.5 w-1.5 rounded-full bg-brand" style={{ animationDelay: "0ms" }} />
                                    <span className="miti-thinking-dot h-1.5 w-1.5 rounded-full bg-brand" style={{ animationDelay: "150ms" }} />
                                    <span className="miti-thinking-dot h-1.5 w-1.5 rounded-full bg-brand" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Reserved courtesy */}
                {couponGenerated && (
                    <div className="space-y-4 border-t border-border p-5">
                        {timeRemaining !== null && (
                            <p
                                className={cn(
                                    "flex items-center justify-center gap-2 font-heading text-[10px] uppercase tracking-[0.22em]",
                                    couponExpired ? "text-destructive" : "text-muted-foreground"
                                )}
                                aria-live="polite"
                            >
                                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                {couponExpired ? "This courtesy has expired" : `Reserved for ${formatTime(timeRemaining)}`}
                            </p>
                        )}

                        <div className={cn("flex items-center gap-3 border p-4", couponExpired ? "border-border opacity-50" : "border-brand/40 bg-brand/5")}>
                            <code className={cn("flex-1 text-center font-mono text-lg tracking-widest", couponExpired && "line-through")}>
                                {couponGenerated.code}
                            </code>
                            <button
                                type="button"
                                className="flex h-10 w-10 items-center justify-center border border-border transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-40"
                                onClick={handleCopyCode}
                                disabled={couponExpired}
                                aria-label={copied ? "Code copied" : "Copy code"}
                            >
                                {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                            </button>
                        </div>

                        {couponExpired ? (
                            <button type="button" className={primaryButton} onClick={handleRestart}>
                                Start again
                            </button>
                        ) : !appliedCoupon ? (
                            <button type="button" className={primaryButton} onClick={handleApplyCoupon}>
                                Apply {formatPrice(couponGenerated.discount)} courtesy
                            </button>
                        ) : (
                            <p className="py-2 text-center font-heading text-[10px] uppercase tracking-[0.22em] text-brand-strong">
                                Courtesy applied to your order
                            </p>
                        )}

                        <button
                            type="button"
                            className="w-full py-1 font-heading text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
                            onClick={handleClose}
                        >
                            Return to checkout
                        </button>
                    </div>
                )}

                {/* Message field (until a courtesy is reserved) */}
                {!couponGenerated && (
                    <form onSubmit={handleSubmit} className="border-t border-border p-4">
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Write a message"
                                aria-label="Message to the concierge"
                                maxLength={500}
                                className="flex-1 border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                className="flex h-11 w-11 items-center justify-center bg-foreground text-background transition-colors hover:bg-brand hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:opacity-40"
                                disabled={isLoading || !input.trim()}
                                aria-label="Send message"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    ) : null

    if (appliedCoupon && !isOpen) {
        return null
    }

    return (
        <>
            {showPrompt && (
                <div className="mt-6 border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 sm:flex-nowrap">
                        <div>
                            <p className="font-heading text-[10px] font-medium uppercase tracking-[0.3em] text-brand-strong">Private concierge</p>
                            <p className="mt-1 text-xs text-muted-foreground">Questions about your order? Our concierge is here to help.</p>
                        </div>
                        <div className="flex w-full justify-end gap-2 sm:w-auto">
                            <button
                                type="button"
                                className="h-9 px-4 font-heading text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
                                onClick={() => setShowPrompt(false)}
                            >
                                No, thank you
                            </button>
                            <button
                                type="button"
                                className="h-9 bg-foreground px-4 font-heading text-[10px] uppercase tracking-[0.22em] text-background transition-colors hover:bg-brand hover:text-neutral-950"
                                onClick={handleOpen}
                            >
                                Speak to concierge
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {conciergeModal}
        </>
    )
}
