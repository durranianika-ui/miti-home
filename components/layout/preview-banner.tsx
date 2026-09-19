import Link from "next/link"

export const STATIC_PREVIEW = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "1"

/** Thin notice shown only on the static (GitHub Pages) preview build. */
export function PreviewBanner() {
    if (!STATIC_PREVIEW) return null
    return (
        <div className="bg-[#c9a24a] px-4 py-2 text-center text-[11px] uppercase tracking-[0.18em] text-[#1c1c1c]">
            Website preview · prices are placeholders · ordering and accounts open at launch
        </div>
    )
}

/** Replaces checkout, account and admin screens on the static preview. */
export function PreviewUnavailable({ title }: { title: string }) {
    return (
        <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-5 px-6 py-24 text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Preview</p>
            <h1 className="font-display text-3xl uppercase tracking-[0.12em] md:text-4xl">{title}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
                This is a browse-only preview of the Miti Home website. Checkout, accounts and order tracking
                switch on when the store launches.
            </p>
            <Link
                href="/shop"
                className="mt-2 border border-foreground px-8 py-3 text-xs uppercase tracking-[0.25em] transition-colors hover:bg-foreground hover:text-background"
            >
                Continue browsing
            </Link>
        </section>
    )
}
