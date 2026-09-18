"use client"

import { useState, useEffect, useMemo, useRef, useCallback, Suspense, use } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, SlidersHorizontal, X, Loader2, ChevronDown } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useShopCatalog, type ProductPageResponse, type ShopCatalogQuery } from "@/components/features/use-shop-catalog"
import { ProductCard, ProductCardSkeleton } from "@/components/features/product-card"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import { normalizeSiteUrl } from "@/lib/seo"
import { JsonLd, collectionJsonLd } from "@/components/seo/structured-data"
import { CATALOG_SORTS, CATALOG_SORT_LABELS, PRICE_BANDS, parseCatalogSort, type CatalogSort } from "@/lib/catalog-query"
import type { CatalogFacets } from "@/lib/product-catalog"
import { cn } from "@/lib/utils"

type ShopRestoreState = {
    scrollY: number
    visibleCount: number
    historyIndex: number | null
    searchQuery: string
    filters: Filters
    clickedProductId: string
}

type Filters = {
    category: string | null
    color: string | null
    material: string | null
    size: string | null
    priceBand: string | null
    inStock: boolean
    sort: CatalogSort
}

const EMPTY_FILTERS: Filters = {
    category: null,
    color: null,
    material: null,
    size: null,
    priceBand: null,
    inStock: false,
    sort: "featured",
}

const SHOP_SCROLL_PREFIX = "miti-shop-scroll:"
const EASE = [0.32, 0.72, 0, 1] as const

export type ShopScope = {
    category?: string
    collection?: string
    isNew?: boolean
    isFeatured?: boolean
    onSale?: boolean
}

interface ShopClientProps {
    title: string
    eyebrow?: string
    subtitle?: string
    initialSearch?: string
    scope?: ShopScope
    facets?: CatalogFacets
    categoryNames?: Record<string, string>
    defaultSort?: CatalogSort
    initialCatalogPromise: Promise<ProductPageResponse>
    emptyMessage?: string
}

export function ShopProductGridSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
            {[...Array(8)].map((_, i) => (
                <ProductCardSkeleton key={i} className={i >= 6 ? "hidden md:block" : undefined} />
            ))}
        </div>
    )
}

function FilterChip({
    active,
    onClick,
    children,
    swatch,
}: {
    active: boolean
    onClick: () => void
    children: React.ReactNode
    swatch?: string
}) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                "inline-flex h-9 items-center gap-2 border px-3.5 font-heading text-[10px] font-medium uppercase tracking-[0.14em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground",
                active ? "border-foreground bg-foreground text-background" : "border-border text-foreground/80 hover:border-foreground/60",
            )}
        >
            {swatch && <span className="h-3.5 w-3.5 rounded-full border border-foreground/20" style={{ backgroundColor: swatch }} />}
            {children}
        </button>
    )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <fieldset className="min-w-0 space-y-3">
            <legend className="mb-3 font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">{label}</legend>
            <div className="flex flex-wrap gap-2">{children}</div>
        </fieldset>
    )
}

export function ShopClient({
    title,
    eyebrow = "Shop",
    subtitle,
    initialSearch = "",
    scope = {},
    facets,
    categoryNames = {},
    defaultSort = "featured",
    initialCatalogPromise,
    emptyMessage,
}: ShopClientProps) {
    const pathname = usePathname()
    const router = useRouter()
    const shouldReduceMotion = useReducedMotion()
    const [searchQuery, setSearchQuery] = useState(initialSearch)
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 300)
    const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS, sort: defaultSort })
    const [showFilters, setShowFilters] = useState(false)
    const [visibleCount, setVisibleCount] = useState(12)
    const pendingRestoreRef = useRef<ShopRestoreState | null>(null)
    const restoredRef = useRef(false)

    const priceBand = PRICE_BANDS.find((band) => band.label === filters.priceBand) ?? null

    const catalogQuery = useMemo<ShopCatalogQuery>(() => {
        const trimmedSearch = debouncedSearchQuery.trim()
        return {
            limit: 24,
            search: trimmedSearch || undefined,
            category: scope.category ?? filters.category ?? undefined,
            collection: scope.collection,
            isNew: scope.isNew || undefined,
            isFeatured: scope.isFeatured || undefined,
            onSale: scope.onSale || undefined,
            color: filters.color ?? undefined,
            material: filters.material ?? undefined,
            size: filters.size ?? undefined,
            availability: filters.inStock ? "in-stock" : undefined,
            minPrice: priceBand && priceBand.min > 0 ? String(priceBand.min) : undefined,
            maxPrice: priceBand && Number.isFinite(priceBand.max) ? String(priceBand.max) : undefined,
            sort: filters.sort === "featured" ? undefined : filters.sort,
        }
    }, [debouncedSearchQuery, filters, priceBand, scope])

    const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
        setFilters((current) => ({ ...current, [key]: value }))
        setVisibleCount(12)
    }

    const toggleFilter = <K extends "category" | "color" | "material" | "size" | "priceBand">(key: K, value: string) => {
        setFilters((current) => ({ ...current, [key]: current[key] === value ? null : value }))
        setVisibleCount(12)
    }

    useEffect(() => {
        if (restoredRef.current || typeof window === "undefined") return
        restoredRef.current = true

        const params = new URLSearchParams(window.location.search)
        const urlSort = parseCatalogSort(params.get("sort"))
        const applyUrlState = () => {
            const urlSearch = params.get("search")
            if (urlSearch) setSearchQuery(urlSearch)
            if (urlSort) setFilters((current) => ({ ...current, sort: urlSort }))
        }

        const raw = window.sessionStorage.getItem(`${SHOP_SCROLL_PREFIX}${pathname}`)
        if (!raw) {
            applyUrlState()
            return
        }

        try {
            const saved = JSON.parse(raw) as ShopRestoreState
            const currentHistoryIndex = typeof window.history.state?.idx === "number" ? window.history.state.idx : null
            const shouldRestore =
                saved.historyIndex === null ||
                currentHistoryIndex === null ||
                currentHistoryIndex <= saved.historyIndex

            if (!shouldRestore) {
                window.sessionStorage.removeItem(`${SHOP_SCROLL_PREFIX}${pathname}`)
                applyUrlState()
                return
            }

            pendingRestoreRef.current = saved
            const timer = window.setTimeout(() => {
                const urlSearch = params.get("search")
                setSearchQuery(urlSearch !== null ? urlSearch : saved.searchQuery)
                setFilters({ ...EMPTY_FILTERS, ...saved.filters })
                setVisibleCount(Math.max(12, saved.visibleCount))
            }, 0)
            return () => window.clearTimeout(timer)
        } catch {
            window.sessionStorage.removeItem(`${SHOP_SCROLL_PREFIX}${pathname}`)
        }
    }, [pathname])

    const saveScrollState = (clickedProductId: string) => {
        if (typeof window === "undefined") return
        const state: ShopRestoreState = {
            scrollY: window.scrollY,
            visibleCount,
            historyIndex: typeof window.history.state?.idx === "number" ? window.history.state.idx : null,
            searchQuery,
            filters,
            clickedProductId,
        }
        window.sessionStorage.setItem(`${SHOP_SCROLL_PREFIX}${pathname}`, JSON.stringify(state))
    }

    const navigateUrlSearch = useCallback((value: string, mode: "push" | "replace" = "replace") => {
        if (typeof window === "undefined") return

        const params = new URLSearchParams(window.location.search)
        const trimmedValue = value.trim()
        if (trimmedValue) params.set("search", trimmedValue)
        else params.delete("search")

        const query = params.toString()
        const nextUrl = `${pathname}${query ? `?${query}` : ""}`
        const currentUrl = `${pathname}${window.location.search}`
        if (nextUrl === currentUrl) return

        if (mode === "push") router.push(nextUrl, { scroll: false })
        else router.replace(nextUrl, { scroll: false })
    }, [pathname, router])

    useEffect(() => {
        navigateUrlSearch(debouncedSearchQuery, "replace")
    }, [debouncedSearchQuery, navigateUrlSearch])

    const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        navigateUrlSearch(searchQuery, "push")
        setVisibleCount(12)
    }

    const clearFilters = () => {
        setSearchQuery("")
        navigateUrlSearch("")
        setFilters({ ...EMPTY_FILTERS, sort: defaultSort })
        setVisibleCount(12)
    }

    const activeFilterCount = [
        searchQuery.trim() !== "",
        !scope.category && filters.category !== null,
        filters.color !== null,
        filters.material !== null,
        filters.size !== null,
        filters.priceBand !== null,
        filters.inStock,
    ].filter(Boolean).length

    const categoryOptions = !scope.category ? (facets?.categories ?? []).filter((category) => categoryNames[category.slug]) : []
    const priceBands = PRICE_BANDS.filter((band) => {
        if (!facets) return true
        return facets.price.max >= band.min && facets.price.min < band.max
    })

    return (
        <div className="flex min-h-screen flex-col">
            {/* Header */}
            <div className="border-b border-border/60 px-5 py-14 md:px-12 md:py-20">
                <p className="mb-4 font-heading text-[10px] font-medium uppercase tracking-[0.34em] text-brand-strong">{eyebrow}</p>
                <h1 className="font-display text-4xl leading-[1.05] md:text-6xl">{title}</h1>
                {subtitle && <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">{subtitle}</p>}
            </div>

            {/* Toolbar */}
            <div className="sticky top-14 z-40 flex flex-col items-stretch justify-between gap-3 border-b border-border/60 bg-background/85 px-5 py-3 backdrop-blur-xl md:top-20 md:flex-row md:items-center md:px-12 md:py-4">
                <form onSubmit={submitSearch} className="relative flex-1 md:max-w-md" role="search">
                    <label htmlFor="shop-search" className="sr-only">Search products</label>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                        id="shop-search"
                        type="search"
                        placeholder="Search by name, material or colour"
                        value={searchQuery}
                        onChange={(event) => {
                            setSearchQuery(event.target.value)
                            setVisibleCount(12)
                        }}
                        className="h-10 w-full border border-input bg-card/60 pl-10 pr-4 text-sm transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </form>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowFilters((open) => !open)}
                        aria-expanded={showFilters}
                        aria-controls="shop-filters"
                        className="inline-flex h-10 items-center gap-2 border border-input px-4 font-heading text-[10px] font-medium uppercase tracking-[0.16em] transition-colors hover:border-foreground/60"
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Filter{activeFilterCount > 0 && ` (${activeFilterCount})`}
                    </button>
                    <div className="relative flex-1 md:flex-none">
                        <label htmlFor="shop-sort" className="sr-only">Sort products</label>
                        <select
                            id="shop-sort"
                            value={filters.sort}
                            onChange={(event) => updateFilter("sort", event.target.value as CatalogSort)}
                            className="h-10 w-full appearance-none border border-input bg-transparent pl-4 pr-9 font-heading text-[10px] font-medium uppercase tracking-[0.16em] focus:outline-none focus:ring-1 focus:ring-ring md:w-auto"
                        >
                            {CATALOG_SORTS.map((sort) => (
                                <option key={sort} value={sort}>{CATALOG_SORT_LABELS[sort]}</option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    {activeFilterCount > 0 && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex h-10 items-center gap-1 px-2 font-heading text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" /> Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <AnimatePresence initial={false}>
                {showFilters && (
                    <motion.div
                        id="shop-filters"
                        initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        animate={shouldReduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className="overflow-hidden border-b border-border/60 bg-secondary/40"
                    >
                        <div className="grid gap-8 px-5 py-6 sm:grid-cols-2 md:px-12 lg:grid-cols-3 xl:grid-cols-5">
                            {categoryOptions.length > 1 && (
                                <FilterGroup label="Category">
                                    {categoryOptions.map((category) => (
                                        <FilterChip key={category.slug} active={filters.category === category.slug} onClick={() => toggleFilter("category", category.slug)}>
                                            {categoryNames[category.slug]}
                                        </FilterChip>
                                    ))}
                                </FilterGroup>
                            )}
                            {(facets?.colors.length ?? 0) > 0 && (
                                <FilterGroup label="Colour & finish">
                                    {facets!.colors.map((color) => (
                                        <FilterChip key={color.name} swatch={color.hex} active={filters.color === color.name} onClick={() => toggleFilter("color", color.name)}>
                                            {color.name}
                                        </FilterChip>
                                    ))}
                                </FilterGroup>
                            )}
                            {(facets?.materials.length ?? 0) > 0 && (
                                <FilterGroup label="Material">
                                    {facets!.materials.map((material) => (
                                        <FilterChip key={material.name} active={filters.material === material.name} onClick={() => toggleFilter("material", material.name)}>
                                            {material.name}
                                        </FilterChip>
                                    ))}
                                </FilterGroup>
                            )}
                            {(facets?.sizes.length ?? 0) > 0 && (
                                <FilterGroup label="Size & option">
                                    {facets!.sizes.map((size) => (
                                        <FilterChip key={size.name} active={filters.size === size.name} onClick={() => toggleFilter("size", size.name)}>
                                            {size.name}
                                        </FilterChip>
                                    ))}
                                </FilterGroup>
                            )}
                            <FilterGroup label="Price">
                                {priceBands.map((band) => (
                                    <FilterChip key={band.label} active={filters.priceBand === band.label} onClick={() => toggleFilter("priceBand", band.label)}>
                                        {band.label}
                                    </FilterChip>
                                ))}
                            </FilterGroup>
                            <FilterGroup label="Availability">
                                <FilterChip active={filters.inStock} onClick={() => updateFilter("inStock", !filters.inStock)}>
                                    In stock only
                                </FilterChip>
                            </FilterGroup>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Product grid */}
            <div className="px-5 py-10 md:px-12">
                <Suspense fallback={<ShopProductGridSkeleton />}>
                    <ShopProductGrid
                        title={title}
                        subtitle={subtitle}
                        catalogPromise={initialCatalogPromise}
                        query={catalogQuery}
                        isDefaultQuery={activeFilterCount === 0 && filters.sort === defaultSort}
                        clearFilters={clearFilters}
                        visibleCount={visibleCount}
                        setVisibleCount={setVisibleCount}
                        pathname={pathname}
                        saveScrollState={saveScrollState}
                        pendingRestoreRef={pendingRestoreRef}
                        emptyMessage={emptyMessage}
                    />
                </Suspense>
            </div>
        </div>
    )
}

interface ShopProductGridProps {
    title: string
    subtitle?: string
    catalogPromise: Promise<ProductPageResponse>
    query: ShopCatalogQuery
    isDefaultQuery: boolean
    clearFilters: () => void
    visibleCount: number
    setVisibleCount: (value: number | ((prev: number) => number)) => void
    pathname: string
    saveScrollState: (clickedProductId: string) => void
    pendingRestoreRef: React.MutableRefObject<ShopRestoreState | null>
    emptyMessage?: string
}

function ShopProductGrid({
    title,
    subtitle,
    catalogPromise,
    query,
    isDefaultQuery,
    clearFilters,
    visibleCount,
    setVisibleCount,
    pathname,
    saveScrollState,
    pendingRestoreRef,
    emptyMessage,
}: ShopProductGridProps) {
    const initialCatalog = use(catalogPromise)
    const baseUrl = normalizeSiteUrl()

    const {
        data: products = [],
        isLoading: loading,
        isError,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useShopCatalog(query, isDefaultQuery ? initialCatalog : undefined)

    const visibleProducts = products.slice(0, visibleCount)
    const hasMore = visibleCount < products.length || Boolean(hasNextPage)

    const sentinelRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!hasMore || loading || isFetchingNextPage) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    if (visibleCount < products.length) setVisibleCount((prev) => prev + 12)
                    else if (hasNextPage) fetchNextPage()
                }
            },
            { rootMargin: typeof window !== "undefined" && window.innerWidth < 768 ? "150px" : "300px" }
        )
        const el = sentinelRef.current
        if (el) observer.observe(el)
        return () => { if (el) observer.unobserve(el) }
    }, [fetchNextPage, hasMore, hasNextPage, isFetchingNextPage, loading, products.length, visibleCount, setVisibleCount])

    useEffect(() => {
        const saved = pendingRestoreRef.current
        if (!saved || loading || products.length === 0) return

        const clickedIndex = products.findIndex((product) => product.id === saved.clickedProductId)
        const requiredVisibleCount = Math.max(saved.visibleCount, clickedIndex >= 0 ? clickedIndex + 1 : 12)

        if (visibleCount < requiredVisibleCount) {
            setVisibleCount(requiredVisibleCount)
            return
        }

        let attempts = 0
        const restore = () => {
            attempts += 1
            const maxReachableScroll = document.documentElement.scrollHeight - window.innerHeight
            if (maxReachableScroll >= saved.scrollY || attempts > 24) {
                window.scrollTo({ top: saved.scrollY, behavior: "instant" as ScrollBehavior })
                pendingRestoreRef.current = null
                return
            }
            window.requestAnimationFrame(restore)
        }

        window.requestAnimationFrame(restore)
    }, [products, loading, visibleCount, pendingRestoreRef, setVisibleCount])

    return (
        <>
            <JsonLd
                data={collectionJsonLd(baseUrl, {
                    name: `${title} | Miti Home`,
                    description: subtitle || `${title} — curated home décor and lifestyle pieces from Miti Home.`,
                    url: pathname,
                    products: initialCatalog.products.map((product) => ({
                        name: product.name,
                        slug: product.slug,
                        image: product.images[0],
                        sellingPrice: product.sellingPrice,
                    })),
                })}
            />

            {loading ? (
                <ShopProductGridSkeleton />
            ) : isError ? (
                <div className="py-24 text-center" role="alert">
                    <p className="text-sm text-muted-foreground">We couldn&apos;t load products just now.</p>
                    <button type="button" onClick={() => refetch()} className="mt-4 border-b border-foreground/30 pb-0.5 font-heading text-[11px] uppercase tracking-[0.2em]">
                        Try again
                    </button>
                </div>
            ) : (
                <>
                    <p className="mb-6 font-heading text-[10px] uppercase tabular-nums tracking-[0.18em] text-muted-foreground" aria-live="polite">
                        {products.length} {products.length === 1 ? "piece" : "pieces"}{hasNextPage ? "+" : ""}
                    </p>
                    {visibleProducts.length > 0 ? (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
                            {visibleProducts.map((product, index) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    priority={index < 4}
                                    onNavigate={() => saveScrollState(product.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="mx-auto max-w-md py-24 text-center">
                            <p className="font-display text-2xl">Nothing here just yet</p>
                            <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                {emptyMessage ?? "No pieces match these filters. Try removing a filter or searching for a material, colour or room."}
                            </p>
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-6 border-b border-foreground/30 pb-0.5 font-heading text-[11px] uppercase tracking-[0.2em] hover:border-brand hover:text-brand-strong"
                            >
                                Clear all filters
                            </button>
                        </div>
                    )}
                </>
            )}

            {hasMore && !loading && !isError && (
                <div ref={sentinelRef} className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading more products" />
                </div>
            )}
        </>
    )
}
