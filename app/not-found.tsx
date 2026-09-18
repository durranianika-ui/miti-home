import type { Metadata } from "next"
import Link from "next/link"
import { BrandMark } from "@/components/brand/wordmark"

export const metadata: Metadata = {
    title: "Page not found",
    robots: { index: false, follow: true },
}

export default function NotFound() {
    return (
        <div className="flex min-h-[70svh] flex-col items-center justify-center px-6 py-24 text-center">
            <BrandMark className="h-5 w-5" />
            <p className="mt-6 font-heading text-[10px] font-medium uppercase tracking-[0.34em] text-brand-strong">404</p>
            <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">This page has moved on</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
                The piece or page you were looking for is no longer here. It may have sold out or found a new home in our collection.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link href="/shop" className="inline-flex h-12 items-center bg-foreground px-7 font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-background transition-colors duration-500 hover:bg-brand hover:text-neutral-950">
                    Shop the collection
                </Link>
                <Link href="/" className="inline-flex h-12 items-center border border-border px-7 font-heading text-[11px] font-medium uppercase tracking-[0.22em] transition-colors hover:border-foreground">
                    Back home
                </Link>
            </div>
        </div>
    )
}
