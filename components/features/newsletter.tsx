"use client"

import { useState } from "react"
import { ArrowRight, Check, Loader2 } from "lucide-react"
import { BrandMark } from "@/components/brand/wordmark"

export function Newsletter({ source = "home" }: { source?: string }) {
    const [email, setEmail] = useState("")
    const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
    const [message, setMessage] = useState<string | null>(null)

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const form = event.currentTarget
        const company = (form.elements.namedItem("company") as HTMLInputElement | null)?.value ?? ""
        setStatus("loading")
        setMessage(null)
        try {
            const response = await fetch("/api/newsletter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, source, company }),
            })
            const result = await response.json()
            if (!response.ok || !result.success) throw new Error(result.error || "Something went wrong")
            setStatus("done")
            setEmail("")
        } catch (error) {
            setStatus("error")
            setMessage(error instanceof Error ? error.message : "Something went wrong")
        }
    }

    return (
        <section className="border-t border-border/60 bg-[#141312] px-5 py-16 text-[#f2eee7] md:px-12 md:py-24">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
                <BrandMark className="h-5 w-5" />
                <p className="mt-6 font-heading text-[10px] font-medium uppercase tracking-[0.34em] text-[#d9bf87]">The Miti Home letter</p>
                <h2 className="mt-4 font-display text-3xl leading-tight md:text-5xl">First to know, first to find</h2>
                <p className="mt-5 max-w-lg text-sm leading-7 text-[#cfc6b8] md:text-base">
                    New arrivals, styling notes and quiet previews of what&apos;s coming — a few times a month, never more.
                </p>

                {status === "done" ? (
                    <p className="mt-10 inline-flex items-center gap-2 font-heading text-[11px] uppercase tracking-[0.22em] text-[#d9bf87]" role="status">
                        <Check className="h-4 w-4" /> You&apos;re on the list
                    </p>
                ) : (
                    <form onSubmit={submit} className="mt-10 w-full max-w-md" noValidate>
                        <label htmlFor={`newsletter-${source}`} className="sr-only">Email address</label>
                        <div className="flex items-center border-b border-[#f2eee7]/35 focus-within:border-[#c8a96a]">
                            <input
                                id={`newsletter-${source}`}
                                type="email"
                                required
                                autoComplete="email"
                                inputMode="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="Your email address"
                                className="h-12 flex-1 bg-transparent text-base text-[#f2eee7] placeholder:text-[#f2eee7]/45 focus:outline-none"
                            />
                            <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                            <button
                                type="submit"
                                disabled={status === "loading" || !email.trim()}
                                className="flex h-12 items-center gap-2 pl-4 font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-[#f2eee7] transition-colors hover:text-[#c8a96a] disabled:opacity-50"
                            >
                                {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Subscribe <ArrowRight className="h-3.5 w-3.5" /></>}
                            </button>
                        </div>
                        {message && <p className="mt-3 text-left text-xs text-[#ef8a82]" role="alert">{message}</p>}
                        <p className="mt-4 text-left text-[11px] text-[#f2eee7]/50">You can unsubscribe at any time.</p>
                    </form>
                )}
            </div>
        </section>
    )
}
