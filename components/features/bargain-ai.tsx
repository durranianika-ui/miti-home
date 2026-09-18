"use client"

import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { MessageCircle, X, Send } from "lucide-react"
import { CONTACT } from "@/lib/brand"
import {
    COD_ALLOWED_EMIRATES,
    COD_ENABLED,
    COD_FEE,
    COD_MAX_ORDER_TOTAL,
    DELIVERY_ESTIMATE,
    FREE_SHIPPING_THRESHOLD_DISPLAY,
    RETURN_WINDOW_DAYS,
    SHIPPING_EMIRATES,
    SHIPPING_FEE,
    UAE_EMIRATES,
    VAT_RATE,
} from "@/lib/constants"
import { formatPrice } from "@/lib/money"
import { cn } from "@/lib/utils"

type ColorOption = { name: string; hex?: string } | string

export interface ProductAssistantContext {
    id: string
    name: string
    mrp: number | string
    sellingPrice: number | string
    category?: string | null
    material?: string | null
    dimensions?: string | null
    features?: string[] | null
    sizes?: string[] | null
    sizeLabel?: string | null
    colors?: ColorOption[] | null
    colorLabel?: string | null
    description?: string | null
    careInstructions?: string[] | null
}

interface ProductAssistantProps {
    productContext: ProductAssistantContext
}

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
}

const STANDARD_OPTION = "Standard"
const QUICK_QUESTIONS = ["Materials", "Dimensions", "Care", "Delivery", "Returns", "Gifting"] as const

function listToSentence(values: string[]) {
    if (values.length <= 1) return values.join("")
    return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`
}

function contactLine() {
    const channels = [CONTACT.email, CONTACT.phone].filter(Boolean)
    return channels.length > 0 ? `You can reach our team at ${listToSentence(channels as string[])}.` : ""
}

function colourNames(ctx: ProductAssistantContext) {
    return (ctx.colors ?? [])
        .map((color) => (typeof color === "string" ? color : color.name))
        .filter((name): name is string => Boolean(name))
}

function optionSizes(ctx: ProductAssistantContext) {
    return (ctx.sizes ?? []).filter((size) => size && size !== STANDARD_OPTION)
}

function deliveryAreas() {
    if (SHIPPING_EMIRATES.length === UAE_EMIRATES.length) return "all seven emirates"
    return listToSentence([...SHIPPING_EMIRATES])
}

/**
 * Answers only from the product record and store constants — never invents
 * specifications, stock levels or services that are not configured.
 */
function answerQuestion(question: string, ctx: ProductAssistantContext): string {
    const q = question.toLowerCase()
    const price = Number(ctx.sellingPrice)
    const compareAt = Number(ctx.mrp)
    const colours = colourNames(ctx)
    const sizes = optionSizes(ctx)
    const sizeLabel = (ctx.sizeLabel || "Size").toLowerCase()
    const colourLabel = (ctx.colorLabel || "Colour").toLowerCase()
    const care = (ctx.careInstructions ?? []).filter(Boolean)
    const features = (ctx.features ?? []).filter(Boolean)

    if (/\b(gift|gifting|present|wrap|birthday|anniversary|housewarming)\b/.test(q)) {
        return `The ${ctx.name} makes a thoughtful gift. We deliver to ${deliveryAreas()}, so you can simply enter the recipient's address at checkout. For a gift note or wrapping, please ask our team before you order and we will let you know what is possible. ${contactLine()}`.trim()
    }

    if (/\b(cod|cash|pay|payment|card)\b|pay on delivery/.test(q)) {
        if (!COD_ENABLED) {
            return "Payment options are shown at checkout. Cash on delivery is not available at the moment."
        }
        const fee = COD_FEE > 0 ? ` A ${formatPrice(COD_FEE)} cash-handling fee applies.` : ""
        const areas = COD_ALLOWED_EMIRATES.length === UAE_EMIRATES.length ? "across the UAE" : `in ${listToSentence([...COD_ALLOWED_EMIRATES])}`
        return `Cash on delivery is available ${areas} on orders up to ${formatPrice(COD_MAX_ORDER_TOTAL)}.${fee} All available payment options are shown at checkout.`
    }

    if (/\b(deliver|delivery|shipping|ship|courier|arrive|when will)\b/.test(q)) {
        const fee = SHIPPING_FEE > 0 ? ` Orders below that are delivered for ${formatPrice(SHIPPING_FEE)}.` : ""
        return `We deliver to ${deliveryAreas()}, usually ${DELIVERY_ESTIMATE.replace(/ across the UAE$/, "")}. Delivery is complimentary on orders over ${FREE_SHIPPING_THRESHOLD_DISPLAY}.${fee}`
    }

    if (/\b(return|returns|refund|exchange)\b/.test(q)) {
        return `You can request a return within ${RETURN_WINDOW_DAYS} days of delivery, subject to the conditions in our returns policy (see Policies › Returns). ${contactLine()}`.trim()
    }

    if (/\b(vat|tax|price|cost|how much|discount|offer|sale|deal)\b/.test(q)) {
        const reduced = compareAt > price ? ` (reduced from ${formatPrice(compareAt)})` : ""
        const vat = VAT_RATE > 0 ? `, including ${Math.round(VAT_RATE * 100)}% VAT` : ""
        return `The ${ctx.name} is ${formatPrice(price)}${reduced}${vat}. All prices are in UAE dirhams, and any delivery charge is shown before you pay.`
    }

    if (/\b(care|clean|cleaning|wash|maintain|maintenance|polish|dust)\b/.test(q)) {
        if (care.length > 0) return `Care for the ${ctx.name}: ${care.join(" ")}`
        return `Care guidance has not been listed for this piece yet. ${contactLine() || "Our team will be happy to advise."}`
    }

    if (/\b(dimension|dimensions|size|sizes|measure|measurement|how big|height|tall|width|wide|length|long|depth|cm)\b/.test(q)) {
        const parts: string[] = []
        if (ctx.dimensions) parts.push(`The ${ctx.name} measures ${ctx.dimensions}.`)
        if (sizes.length > 0) parts.push(`It is available in these ${sizeLabel} options: ${listToSentence(sizes)}.`)
        if (parts.length > 0) return parts.join(" ")
        return `Exact dimensions have not been listed for this piece yet. ${contactLine() || "Our team will be happy to confirm them."}`
    }

    if (/\b(material|materials|made of|made from|ceramic|glass|metal|wood|finish|quality)\b/.test(q)) {
        const parts: string[] = []
        if (ctx.material) parts.push(`The ${ctx.name} is made from ${ctx.material.charAt(0).toLowerCase()}${ctx.material.slice(1)}.`)
        if (colours.length > 0) parts.push(`It is offered in ${listToSentence(colours)} (${colourLabel}).`)
        if (parts.length > 0) return parts.join(" ")
        return `The material has not been listed for this piece yet. ${contactLine() || "Our team will be happy to confirm it."}`
    }

    if (/\b(colour|color|colours|colors|option|options|variant|variants)\b/.test(q)) {
        const parts: string[] = []
        if (colours.length > 0) parts.push(`Available ${colourLabel} options: ${listToSentence(colours)}.`)
        if (sizes.length > 0) parts.push(`Available ${sizeLabel} options: ${listToSentence(sizes)}.`)
        if (parts.length > 0) return `${parts.join(" ")} Availability for each option is shown on this page.`
        return `The ${ctx.name} comes in a single design.`
    }

    if (/\b(feature|features|detail|details|about|describe|what is|tell me)\b/.test(q)) {
        if (features.length > 0) return `A few details about the ${ctx.name}: ${features.join("; ")}.`
        if (ctx.description) return ctx.description
    }

    if (/\b(stock|available|availability|in stock)\b/.test(q)) {
        return "Availability for each option is shown on this page; an option that cannot be selected is currently unavailable."
    }

    if (/\b(contact|help|human|person|call|email|whatsapp|speak)\b/.test(q)) {
        return contactLine() || "Please use the contact page and our team will be in touch."
    }

    return `I can help with materials, dimensions, care, delivery, payment, returns and gifting for the ${ctx.name}. ${contactLine()}`.trim()
}

/**
 * ProductAssistant — a local, rule-based product Q&A panel for the PDP.
 * No network calls: every answer comes from the product record or store
 * configuration.
 */
export function ProductAssistant({ productContext }: ProductAssistantProps) {
    const panelId = useId()
    const titleId = useId()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>(() => [
        {
            id: "welcome",
            role: "assistant",
            content: `Welcome. I can answer questions about the ${productContext.name}: materials, dimensions, care, delivery, returns or gifting.`,
        },
    ])
    const [input, setInput] = useState("")
    const [isAnswering, setIsAnswering] = useState(false)
    const logRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const launcherRef = useRef<HTMLButtonElement>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }, [])

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    }, [messages, isAnswering])

    useEffect(() => {
        if (!isOpen) return
        inputRef.current?.focus()
    }, [isOpen])

    const close = () => {
        setIsOpen(false)
        requestAnimationFrame(() => launcherRef.current?.focus())
    }

    const ask = (question: string) => {
        const text = question.trim()
        if (!text || isAnswering) return

        setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: text }])
        setInput("")
        setIsAnswering(true)

        timeoutRef.current = setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                { id: `a-${Date.now()}`, role: "assistant", content: answerQuestion(text, productContext) },
            ])
            setIsAnswering(false)
        }, 350)
    }

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
        ask(input)
    }

    return (
        <div className="fixed bottom-6 right-4 z-50 sm:right-6">
            {!isOpen && (
                <button
                    ref={launcherRef}
                    type="button"
                    onClick={() => setIsOpen(true)}
                    aria-expanded={false}
                    aria-controls={panelId}
                    className="flex h-11 items-center justify-center gap-2 border border-foreground bg-background px-5 font-heading text-[10px] uppercase tracking-[0.22em] text-foreground shadow-lg transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Ask about this piece</span>
                </button>
            )}

            {isOpen && (
                <div
                    id={panelId}
                    role="dialog"
                    aria-labelledby={titleId}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            e.stopPropagation()
                            close()
                        }
                    }}
                    className="flex h-[31rem] max-h-[calc(100dvh-3rem)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden border border-border bg-background text-foreground shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                        <div className="min-w-0">
                            <p className="font-heading text-[10px] font-medium uppercase tracking-[0.3em] text-brand-strong">Product questions</p>
                            <h2 id={titleId} className="truncate text-sm">{productContext.name}</h2>
                        </div>
                        <button
                            type="button"
                            aria-label="Close product questions"
                            className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                            onClick={close}
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>

                    {/* Conversation */}
                    <div ref={logRef} role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-muted/40 p-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}>
                                <p
                                    className={cn(
                                        "max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed",
                                        msg.role === "user"
                                            ? "bg-foreground text-background"
                                            : "border border-border bg-background text-foreground"
                                    )}
                                >
                                    <span className="sr-only">{msg.role === "user" ? "You: " : "Answer: "}</span>
                                    {msg.content}
                                </p>
                            </div>
                        ))}
                        {isAnswering && (
                            <div className="flex justify-start" aria-hidden="true">
                                <div className="flex items-center gap-1.5 border border-border bg-background px-3.5 py-3">
                                    <span className="miti-thinking-dot h-1.5 w-1.5 rounded-full bg-brand" style={{ animationDelay: "0ms" }} />
                                    <span className="miti-thinking-dot h-1.5 w-1.5 rounded-full bg-brand" style={{ animationDelay: "150ms" }} />
                                    <span className="miti-thinking-dot h-1.5 w-1.5 rounded-full bg-brand" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick questions */}
                    <div className="flex gap-2 overflow-x-auto border-t border-border px-3 py-2.5" role="group" aria-label="Suggested questions">
                        {QUICK_QUESTIONS.map((q) => (
                            <button
                                key={q}
                                type="button"
                                onClick={() => ask(q)}
                                disabled={isAnswering}
                                className="whitespace-nowrap border border-border px-3 py-1.5 font-heading text-[10px] uppercase tracking-[0.18em] transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-40"
                            >
                                {q}
                            </button>
                        ))}
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-3">
                        <input
                            ref={inputRef}
                            className="min-w-0 flex-1 border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                            placeholder="Ask a question"
                            aria-label={`Ask a question about ${productContext.name}`}
                            value={input}
                            maxLength={300}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <button
                            type="submit"
                            aria-label="Send question"
                            className="flex h-10 w-10 shrink-0 items-center justify-center bg-foreground text-background transition-colors hover:bg-brand hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:opacity-40"
                            disabled={isAnswering || !input.trim()}
                        >
                            <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}
