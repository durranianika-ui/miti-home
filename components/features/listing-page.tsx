import { ShopClient, type ShopScope } from "@/components/features/shop-client"
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/seo/structured-data"
import { getCatalogFacets, getCatalogProducts, getCollectionCatalogProducts } from "@/lib/product-catalog"
import { getCategoryNameMap } from "@/lib/taxonomy"
import { normalizeSiteUrl } from "@/lib/seo"
import type { CatalogSort } from "@/lib/catalog-query"

/**
 * Server shell shared by every product listing (shop, categories,
 * collections, new, best sellers, sale): first page of products, filter
 * facets for the scope, breadcrumbs and optional editorial notes/FAQ.
 */
export async function ListingPage({
    title,
    eyebrow,
    subtitle,
    scope = {},
    breadcrumbs,
    defaultSort = "featured",
    note,
    faq,
    emptyMessage,
}: {
    title: string
    eyebrow?: string
    subtitle?: string
    scope?: ShopScope
    breadcrumbs: { name: string; url: string }[]
    defaultSort?: CatalogSort
    note?: { label: string; body: string }
    faq?: { question: string; answer: string }[]
    emptyMessage?: string
}) {
    const baseUrl = normalizeSiteUrl()
    const sort = defaultSort === "featured" ? undefined : defaultSort
    const catalogPromise = scope.collection && !sort
        ? getCollectionCatalogProducts(scope.collection, scope)
        : getCatalogProducts({ ...scope, sort, limit: 24, offset: 0, includeTotal: true })

    const [facets, categoryNames] = await Promise.all([
        getCatalogFacets(scope),
        getCategoryNameMap(),
    ])

    return (
        <>
            <JsonLd data={breadcrumbJsonLd(baseUrl, breadcrumbs)} />
            {faq && faq.length > 0 && <JsonLd data={faqJsonLd(faq)} />}
            <ShopClient
                title={title}
                eyebrow={eyebrow}
                subtitle={subtitle}
                scope={scope}
                facets={facets}
                categoryNames={Object.fromEntries(categoryNames)}
                defaultSort={defaultSort}
                initialCatalogPromise={catalogPromise}
                emptyMessage={emptyMessage}
            />
            {(note || (faq && faq.length > 0)) && (
                <section className="border-t border-border/60 px-5 py-14 md:px-12 md:py-20">
                    <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[0.8fr_1.2fr]">
                        <p className="font-heading text-[10px] font-medium uppercase tracking-[0.3em] text-brand-strong">
                            {note?.label ?? "Good to know"}
                        </p>
                        <div className="space-y-6">
                            {note && <p className="text-base leading-8 text-muted-foreground">{note.body}</p>}
                            {faq && faq.length > 0 && (
                                <div className="grid gap-5">
                                    {faq.map((item) => (
                                        <article key={item.question} className="border-t border-border/60 pt-5">
                                            <h2 className="font-heading text-xs font-medium uppercase tracking-[0.14em]">{item.question}</h2>
                                            <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.answer}</p>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}
        </>
    )
}
