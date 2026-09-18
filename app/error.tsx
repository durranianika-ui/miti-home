"use client"

import { useEffect } from "react"
import Link from "next/link"
import { BrandMark } from "@/components/brand/wordmark"

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex min-h-[70svh] flex-col items-center justify-center px-6 py-24 text-center" role="alert">
            <BrandMark className="h-5 w-5" />
            <h1 className="mt-6 font-display text-3xl leading-tight md:text-4xl">Something didn&apos;t load</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
                We couldn&apos;t show this page just now. Please try again — if it keeps happening, our team would love to hear from you.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={reset}
                    className="inline-flex h-12 items-center bg-foreground px-7 font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-background transition-colors duration-500 hover:bg-brand hover:text-neutral-950"
                >
                    Try again
                </button>
                <Link href="/" className="inline-flex h-12 items-center border border-border px-7 font-heading text-[11px] font-medium uppercase tracking-[0.22em] transition-colors hover:border-foreground">
                    Back home
                </Link>
            </div>
            {error.digest && <p className="mt-8 text-[11px] text-muted-foreground">Reference: {error.digest}</p>}
        </div>
    )
}
