import { Quote } from "lucide-react"
import { BRAND } from "@/lib/brand"
import testimonials from "@/data/testimonials.json"

type Testimonial = {
    quote: string
    name: string
    location?: string
    product?: string
}

/**
 * Customer voices. Only genuine, consented testimonials belong in
 * data/testimonials.json — nothing is invented here. Until real reviews are
 * collected the section presents the brand's own promises instead.
 */
export function RealReviews() {
    const reviews = (testimonials as Testimonial[]).filter((review) => review.quote?.trim() && review.name?.trim())

    return (
        <section className="border-t border-border/60 bg-secondary/40 px-5 py-16 md:px-12 md:py-24">
            <div className="mx-auto max-w-7xl">
                <div className="mb-10 text-center md:mb-14">
                    <p className="mb-4 font-heading text-[10px] font-medium uppercase tracking-[0.34em] text-brand-strong">
                        {reviews.length > 0 ? "In their words" : "Why Miti Home"}
                    </p>
                    <h2 className="font-display text-3xl leading-tight sm:text-4xl md:text-5xl">
                        {reviews.length > 0 ? "Loved at home" : "Curated with intention"}
                    </h2>
                </div>

                {reviews.length > 0 ? (
                    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {reviews.slice(0, 6).map((review, index) => (
                            <figure key={`${review.name}-${index}`} className={`flex flex-col border border-border/70 bg-background/70 p-6 md:p-8 ${index >= 4 ? "max-md:hidden" : ""}`}>
                                <Quote className="h-5 w-5 text-brand" aria-hidden="true" />
                                <blockquote className="mt-5 flex-1 text-[15px] leading-7 text-foreground/85">{review.quote}</blockquote>
                                <figcaption className="mt-6 border-t border-border/70 pt-4">
                                    <p className="font-heading text-xs font-medium uppercase tracking-[0.18em]">{review.name}</p>
                                    {(review.location || review.product) && (
                                        <p className="mt-1.5 text-xs text-muted-foreground">
                                            {[review.location, review.product].filter(Boolean).join(" · ")}
                                        </p>
                                    )}
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                ) : (
                    <ul className="mx-auto grid max-w-5xl gap-px overflow-hidden border border-border/70 bg-border/70 sm:grid-cols-2 lg:grid-cols-5">
                        {BRAND.principles.map((principle, index) => (
                            <li key={principle} className="flex flex-col gap-4 bg-background p-6 md:p-7">
                                <span className="font-heading text-[11px] tabular-nums tracking-[0.2em] text-brand-strong">0{index + 1}</span>
                                <p className="font-display text-lg leading-snug">{principle.replace(/\.$/, "")}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    )
}
