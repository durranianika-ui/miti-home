"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Heart,
    Minus,
    Plus,
    RotateCcw,
    ShieldCheck,
    Truck,
    X,
    ZoomIn,
} from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { addWishlistItem, getProductWishlist, removeWishlistItem } from "@/lib/actions/wishlist"
import { normalizeProductImage } from "@/lib/image"
import { discountPercent, formatPrice } from "@/lib/money"
import { buildProductPath } from "@/lib/seo"
import { buildCategoryPath, buildCollectionPath } from "@/lib/public-cache"
import { trackEcommerce } from "@/lib/analytics"
import {
    COD_ENABLED,
    COD_FEE,
    DELIVERY_ESTIMATE,
    FREE_SHIPPING_THRESHOLD,
    FREE_SHIPPING_THRESHOLD_DISPLAY,
    RETURN_WINDOW_DAYS,
} from "@/lib/constants"
import type { ProductDetails } from "@/lib/product-detail"
import { ProductCard, type ProductCardProduct } from "@/components/features/product-card"
import { ViewportPrefetchLink } from "@/components/ui/viewport-prefetch-link"
import { ProductAssistant } from "@/components/features/bargain-ai"
import { cn } from "@/lib/utils"

type Product = ProductDetails

const EASE = [0.32, 0.72, 0, 1] as const
const RECENT_KEY = "miti-recently-viewed"
const MAX_QUANTITY = 10

// ============================================
// Recently viewed (per-browser convenience)
// ============================================

function readRecentlyViewed(): ProductCardProduct[] {
    try {
        const raw = window.localStorage.getItem(RECENT_KEY)
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function rememberProduct(product: ProductCardProduct) {
    try {
        const next = [product, ...readRecentlyViewed().filter((item) => item.id !== product.id)].slice(0, 12)
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
        // Storage can be unavailable (private mode); recently viewed is optional.
    }
}

// ============================================
// Accordion
// ============================================

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen)
    const shouldReduceMotion = useReducedMotion()
    const id = `pdp-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`

    return (
        <div className="border-b border-border/70">
            <h3>
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={id}
                    onClick={() => setOpen((value) => !value)}
                    className="flex w-full items-center justify-between py-5 text-left font-heading text-[11px] font-medium uppercase tracking-[0.2em] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
                >
                    {title}
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", open && "rotate-180")} />
                </button>
            </h3>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        id={id}
                        initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        animate={shouldReduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className="overflow-hidden"
                    >
                        <div className="pb-6 text-sm leading-7 text-muted-foreground">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ============================================
// Zoom lightbox
// ============================================

function Lightbox({
    images,
    index,
    name,
    onClose,
    onChange,
}: {
    images: string[]
    index: number
    name: string
    onClose: () => void
    onChange: (index: number) => void
}) {
    const closeRef = useRef<HTMLButtonElement>(null)
    const [zoomed, setZoomed] = useState(false)
    const [origin, setOrigin] = useState("50% 50%")

    useEffect(() => {
        closeRef.current?.focus()
        const previous = document.body.style.overflow
        document.body.style.overflow = "hidden"
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose()
            if (event.key === "ArrowRight") onChange(Math.min(index + 1, images.length - 1))
            if (event.key === "ArrowLeft") onChange(Math.max(index - 1, 0))
        }
        window.addEventListener("keydown", onKey)
        return () => {
            document.body.style.overflow = previous
            window.removeEventListener("keydown", onKey)
        }
    }, [images.length, index, onChange, onClose])

    return (
        <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${name} — image ${index + 1} of ${images.length}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[120] flex flex-col bg-background"
        >
            <div className="flex h-16 items-center justify-between px-5 md:px-8">
                <p className="font-heading text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    {index + 1} / {images.length}
                </p>
                <button
                    ref={closeRef}
                    type="button"
                    onClick={onClose}
                    aria-label="Close image viewer"
                    className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
            <div
                className={cn("relative flex-1 overflow-hidden", zoomed ? "cursor-zoom-out" : "cursor-zoom-in")}
                onClick={() => setZoomed((value) => !value)}
                onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect()
                    setOrigin(`${((event.clientX - rect.left) / rect.width) * 100}% ${((event.clientY - rect.top) / rect.height) * 100}%`)
                }}
            >
                <Image
                    src={images[index]}
                    alt={`${name} — image ${index + 1}`}
                    fill
                    sizes="100vw"
                    className="object-contain transition-transform duration-300 ease-out"
                    style={{ transform: zoomed ? "scale(2)" : "scale(1)", transformOrigin: origin }}
                />
            </div>
            {images.length > 1 && (
                <div className="flex justify-center gap-2 overflow-x-auto px-5 py-4 scrollbar-hide">
                    {images.map((src, i) => (
                        <button
                            key={src}
                            type="button"
                            onClick={() => {
                                setZoomed(false)
                                onChange(i)
                            }}
                            aria-label={`View image ${i + 1}`}
                            aria-current={i === index}
                            className={cn("relative h-16 w-16 flex-none overflow-hidden border", i === index ? "border-foreground" : "border-transparent opacity-60 hover:opacity-100")}
                        >
                            <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </motion.div>
    )
}

// ============================================
// Product page
// ============================================

export function ProductClient({ initialProduct }: { initialProduct: Product }) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const shouldReduceMotion = useReducedMotion()
    const { addItem } = useCart()
    const product = initialProduct

    const sizes = useMemo(() => (product.sizes?.length ? product.sizes : ["Standard"]), [product.sizes])
    const colors = useMemo(() => product.colors ?? [], [product.colors])
    const hasSizeChoice = sizes.length > 1 || sizes[0] !== "Standard"
    const hasColorChoice = colors.length > 0

    const [selectedSize, setSelectedSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null)
    const [selectedColor, setSelectedColor] = useState<string | null>(colors.length === 1 ? colors[0].name : null)
    const [selectedImage, setSelectedImage] = useState(0)
    const [quantity, setQuantity] = useState(1)
    const [added, setAdded] = useState(false)
    const [showSelectionHint, setShowSelectionHint] = useState(false)
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [wishlistPending, setWishlistPending] = useState(false)
    const [wishlistError, setWishlistError] = useState<string | null>(null)
    const [recentlyViewed, setRecentlyViewed] = useState<ProductCardProduct[]>([])

    const { data: wishlistState } = useQuery({
        queryKey: ["wishlist-product", product.id],
        queryFn: () => getProductWishlist(product.id),
        staleTime: 1000 * 30,
    })

    const images = useMemo(() => {
        const list = (product.images ?? []).map((image) => normalizeProductImage(image))
        return list.length > 0 ? list : [normalizeProductImage()]
    }, [product.images])

    const price = Number(product.sellingPrice)
    const saving = discountPercent(product.mrp, product.sellingPrice)
    const inWishlist = Boolean(wishlistState?.saved)

    // Stock by (option, colour). Products without variant rows fall back to product stock.
    const variantStock = useMemo(() => {
        const map = new Map<string, number>()
        for (const variant of product.variants ?? []) map.set(`${variant.size}|${variant.color ?? ""}`, variant.stock)
        return map
    }, [product.variants])

    const stockFor = (size: string | null, color: string | null) => {
        if (variantStock.size === 0) return product.stock
        if (size && (color || !hasColorChoice)) return variantStock.get(`${size}|${color ?? ""}`) ?? 0
        let total = 0
        for (const [key, stock] of variantStock) {
            const [variantSize, variantColor] = key.split("|")
            if ((size === null || variantSize === size) && (color === null || variantColor === color)) total += stock
        }
        return total
    }

    const selectionComplete = Boolean(selectedSize) && (!hasColorChoice || Boolean(selectedColor))
    const currentStock = selectionComplete ? stockFor(selectedSize, selectedColor) : null
    const soldOut = product.stock <= 0 || currentStock === 0
    const maxQuantity = Math.max(1, Math.min(MAX_QUANTITY, currentStock ?? MAX_QUANTITY))
    const effectiveQuantity = Math.min(quantity, maxQuantity)

    // Choosing a finish shows its photography.
    const chooseColor = (name: string) => {
        setSelectedColor(name)
        const colorImage = colors.find((color) => color.name === name)?.images?.[0]
        if (!colorImage) return
        const index = images.indexOf(normalizeProductImage(colorImage))
        if (index >= 0) setSelectedImage(index)
    }

    useEffect(() => {
        const summary: ProductCardProduct = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            sellingPrice: product.sellingPrice,
            mrp: product.mrp,
            images: product.images ?? [],
            stock: product.stock,
            isNew: product.isNew,
            sizes: product.sizes ?? [],
            colors: (product.colors ?? []).map(({ name, hex }) => ({ name, hex })),
            colorLabel: product.colorLabel,
        }
        const timer = window.setTimeout(() => {
            setRecentlyViewed(readRecentlyViewed().filter((item) => item.id !== product.id).slice(0, 8))
            rememberProduct(summary)
        }, 0)
        trackEcommerce("view_item", {
            items: [{ id: product.id, name: product.name, price: Number(product.sellingPrice), quantity: 1, category: product.categoryName ?? product.category }],
        })
        return () => window.clearTimeout(timer)
    }, [product])

    useEffect(() => {
        if (images.length <= 1) return
        const preload = () => images.slice(1).forEach((src) => { const image = new window.Image(); image.src = src })
        const idle = window.requestIdleCallback
        if (idle) {
            const id = idle(preload, { timeout: 1500 })
            return () => window.cancelIdleCallback?.(id)
        }
        const timer = window.setTimeout(preload, 200)
        return () => window.clearTimeout(timer)
    }, [images])

    const optionSummary = [
        hasSizeChoice && selectedSize ? `${product.sizeLabel}: ${selectedSize}` : null,
        selectedColor && hasColorChoice ? `${product.colorLabel}: ${selectedColor}` : null,
    ].filter(Boolean).join(" · ")

    const addToBag = (goToCheckout = false) => {
        if (!selectionComplete) {
            setShowSelectionHint(true)
            return false
        }
        if (soldOut) return false

        const colorImage = selectedColor ? colors.find((color) => color.name === selectedColor)?.images?.[0] : undefined
        addItem(
            {
                id: product.id,
                slug: product.slug,
                name: product.name,
                price,
                displayPrice: formatPrice(price),
                image: normalizeProductImage(colorImage ?? images[0]),
                size: selectedSize!,
                color: selectedColor || undefined,
                sizeLabel: product.sizeLabel,
                colorLabel: product.colorLabel,
            },
            effectiveQuantity,
            { openDrawer: !goToCheckout },
        )
        trackEcommerce("add_to_cart", {
            items: [{ id: product.id, name: product.name, price, quantity: effectiveQuantity, variant: optionSummary || undefined, category: product.categoryName ?? undefined }],
        })
        setAdded(true)
        window.setTimeout(() => setAdded(false), 2000)
        if (goToCheckout) router.push("/checkout")
        return true
    }

    const toggleWishlist = async () => {
        if (wishlistPending) return
        if (wishlistState && !wishlistState.authenticated) {
            router.push(`/account?redirect=${encodeURIComponent(buildProductPath(product.slug))}`)
            return
        }
        setWishlistPending(true)
        setWishlistError(null)
        const result = inWishlist ? await removeWishlistItem(product.id) : await addWishlistItem(product.id)
        if (!result.success) setWishlistError("error" in result ? result.error : "Please try again.")
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["wishlist-product", product.id] }),
            queryClient.invalidateQueries({ queryKey: ["wishlist-nav"] }),
        ])
        setWishlistPending(false)
    }

    const detailRows = [
        product.material ? ["Material", product.material] : null,
        product.dimensions ? ["Dimensions", product.dimensions] : null,
        product.sku ? ["Reference", product.sku] : null,
    ].filter(Boolean) as [string, string][]
    const spotlight = [product.material, product.dimensions, ...(product.features ?? []).slice(0, 1)].filter(Boolean) as string[]
    const showSpotlight = images.length > 1 && selectedImage === images.length - 1 && spotlight.length > 0

    return (
        <>
            <div className="min-h-screen bg-background pb-28 lg:pb-24 lg:pt-6">
                <nav aria-label="Breadcrumb" className="px-5 pt-5 md:px-12 lg:pt-0">
                    <ol className="flex flex-wrap items-center gap-2 font-heading text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        <li><Link href="/" className="hover:text-foreground">Home</Link></li>
                        <li aria-hidden="true">/</li>
                        <li><Link href="/shop" className="hover:text-foreground">Shop</Link></li>
                        {product.categoryName && (
                            <>
                                <li aria-hidden="true">/</li>
                                <li><Link href={buildCategoryPath(product.category)} className="hover:text-foreground">{product.categoryName}</Link></li>
                            </>
                        )}
                    </ol>
                </nav>

                <div className="mt-4 grid grid-cols-1 gap-0 lg:mt-6 lg:grid-cols-[1.1fr_0.9fr]">
                    {/* Gallery */}
                    <div className="lg:flex lg:gap-4 lg:pl-12">
                        {images.length > 1 && (
                            <div className="order-first hidden w-20 flex-none flex-col gap-3 lg:flex">
                                {images.map((src, index) => (
                                    <button
                                        key={src}
                                        type="button"
                                        onClick={() => setSelectedImage(index)}
                                        aria-label={`Show image ${index + 1}`}
                                        aria-current={selectedImage === index}
                                        className={cn(
                                            "relative aspect-square overflow-hidden border transition-opacity duration-300",
                                            selectedImage === index ? "border-foreground" : "border-transparent opacity-60 hover:opacity-100",
                                        )}
                                    >
                                        <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="group relative flex-1 overflow-hidden bg-muted/50">
                            <div className="relative aspect-square w-full lg:aspect-[4/5]">
                                <AnimatePresence initial={false} mode="popLayout">
                                    <motion.div
                                        key={selectedImage}
                                        className="absolute inset-0"
                                        initial={{ opacity: 0.4 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0.4 }}
                                        transition={{ duration: 0.3, ease: EASE }}
                                        style={{ willChange: "opacity" }}
                                    >
                                        <Image
                                            src={images[selectedImage]}
                                            alt={`${product.name}${images.length > 1 ? ` — image ${selectedImage + 1} of ${images.length}` : ""}`}
                                            fill
                                            priority={selectedImage === 0}
                                            sizes="(max-width: 1024px) 100vw, 55vw"
                                            className="object-cover object-center"
                                            draggable={false}
                                        />
                                    </motion.div>
                                </AnimatePresence>

                                <AnimatePresence>
                                    {showSpotlight && (
                                        <motion.div
                                            key="spotlight"
                                            className="pointer-events-none absolute bottom-8 left-6 z-20 max-w-[75%] bg-background/85 p-5 backdrop-blur-sm md:left-8"
                                            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: shouldReduceMotion ? 0.01 : 0.45, ease: EASE }}
                                        >
                                            <p className="font-heading text-[10px] uppercase tracking-[0.28em] text-brand-strong">The details</p>
                                            <ul className="mt-3 space-y-1.5">
                                                {spotlight.map((attribute, index) => (
                                                    <motion.li
                                                        key={attribute}
                                                        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ duration: shouldReduceMotion ? 0.01 : 0.4, delay: shouldReduceMotion ? 0 : 0.1 + index * 0.08, ease: EASE }}
                                                        className="text-sm"
                                                    >
                                                        {attribute}
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {images.length > 1 && (
                                    <motion.div
                                        className="absolute inset-0 z-10 touch-pan-y"
                                        drag="x"
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={0.15}
                                        onDragEnd={(_event, info) => {
                                            if (info.offset.x < -40 || info.velocity.x < -300) setSelectedImage((prev) => Math.min(prev + 1, images.length - 1))
                                            else if (info.offset.x > 40 || info.velocity.x > 300) setSelectedImage((prev) => Math.max(prev - 1, 0))
                                        }}
                                        onTap={() => setLightboxOpen(true)}
                                        aria-hidden="true"
                                    />
                                )}

                                <button
                                    type="button"
                                    onClick={() => setLightboxOpen(true)}
                                    aria-label="Zoom image"
                                    className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
                                >
                                    <ZoomIn className="h-4 w-4" />
                                </button>

                                {images.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            className="absolute left-4 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 opacity-0 backdrop-blur-sm transition-all duration-500 group-hover:opacity-100 disabled:opacity-0 md:flex"
                                            onClick={() => setSelectedImage((prev) => Math.max(prev - 1, 0))}
                                            disabled={selectedImage === 0}
                                            aria-label="Previous image"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            className="absolute right-4 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 opacity-0 backdrop-blur-sm transition-all duration-500 group-hover:opacity-100 disabled:opacity-0 md:flex"
                                            onClick={() => setSelectedImage((prev) => Math.min(prev + 1, images.length - 1))}
                                            disabled={selectedImage === images.length - 1}
                                            aria-label="Next image"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </>
                                )}
                            </div>

                            {images.length > 1 && (
                                <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 lg:hidden">
                                    {images.map((_, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            className={cn(
                                                "h-1.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                                                selectedImage === index ? "w-6 bg-brand" : "w-1.5 bg-foreground/30",
                                            )}
                                            onClick={() => setSelectedImage(index)}
                                            aria-label={`Show image ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="flex flex-col px-5 pt-8 md:px-12 lg:sticky lg:top-24 lg:max-h-[calc(100svh-7rem)] lg:self-start lg:overflow-y-auto lg:px-14 lg:pt-0">
                        <div className="space-y-4">
                            {product.categoryName && (
                                <Link href={buildCategoryPath(product.category)} className="font-heading text-[10px] font-medium uppercase tracking-[0.3em] text-brand-strong hover:underline">
                                    {product.categoryName}
                                </Link>
                            )}
                            <h1 className="font-display text-3xl leading-[1.12] md:text-5xl">{product.name}</h1>
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
                                <p className={cn("text-xl", saving !== null && "text-brand-strong")}>{formatPrice(price)}</p>
                                {saving !== null && (
                                    <>
                                        <p className="text-sm text-muted-foreground line-through">{formatPrice(product.mrp)}</p>
                                        <span className="bg-brand px-2 py-0.5 font-heading text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-950">Save {saving}%</span>
                                    </>
                                )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">Price includes VAT</p>
                            {product.description && (
                                <p className="max-w-lg text-[15px] leading-7 text-foreground/80">{product.description}</p>
                            )}
                        </div>

                        <div className="mt-8 space-y-7">
                            {hasColorChoice && (
                                <fieldset>
                                    <legend className="mb-3 flex w-full items-center justify-between font-heading text-[10px] font-medium uppercase tracking-[0.22em]">
                                        <span>{product.colorLabel}{selectedColor ? `: ${selectedColor}` : ""}</span>
                                        {showSelectionHint && !selectedColor && <span className="normal-case tracking-normal text-destructive">Please choose</span>}
                                    </legend>
                                    <div className="flex flex-wrap gap-3">
                                        {colors.map((color) => {
                                            const available = stockFor(selectedSize, color.name) > 0
                                            const selected = selectedColor === color.name
                                            return (
                                                <button
                                                    key={color.name}
                                                    type="button"
                                                    onClick={() => chooseColor(color.name)}
                                                    aria-pressed={selected}
                                                    aria-label={`${color.name}${available ? "" : " — out of stock"}`}
                                                    title={color.name}
                                                    className={cn(
                                                        "relative flex h-11 items-center gap-2 border px-3 text-xs transition-colors duration-300",
                                                        selected ? "border-foreground" : "border-border hover:border-foreground/60",
                                                        !available && "opacity-45",
                                                    )}
                                                >
                                                    <span className="h-5 w-5 rounded-full border border-foreground/15" style={{ backgroundColor: color.hex }} />
                                                    <span className={cn(!available && "line-through")}>{color.name}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </fieldset>
                            )}

                            {hasSizeChoice && (
                                <fieldset>
                                    <legend className="mb-3 flex w-full items-center justify-between font-heading text-[10px] font-medium uppercase tracking-[0.22em]">
                                        <span>{product.sizeLabel}{selectedSize ? `: ${selectedSize}` : ""}</span>
                                        {showSelectionHint && !selectedSize && <span className="normal-case tracking-normal text-destructive">Please choose</span>}
                                    </legend>
                                    <div className="flex flex-wrap gap-2">
                                        {sizes.map((size) => {
                                            const available = stockFor(size, selectedColor) > 0
                                            const selected = selectedSize === size
                                            return (
                                                <button
                                                    key={size}
                                                    type="button"
                                                    onClick={() => setSelectedSize(size)}
                                                    aria-pressed={selected}
                                                    aria-label={`${size}${available ? "" : " — out of stock"}`}
                                                    className={cn(
                                                        "h-11 min-w-[3rem] border px-4 text-xs transition-colors duration-300",
                                                        selected ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/60",
                                                        !available && !selected && "text-muted-foreground line-through opacity-50",
                                                    )}
                                                >
                                                    {size}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </fieldset>
                            )}

                            <div aria-live="polite" className="min-h-[1.25rem] text-xs">
                                {product.stock <= 0 ? (
                                    <p className="text-destructive">Sold out — check back soon.</p>
                                ) : currentStock === 0 ? (
                                    <p className="text-destructive">This option is sold out. Please choose another.</p>
                                ) : currentStock !== null && currentStock <= 3 ? (
                                    <p className="text-brand-strong">Only {currentStock} left</p>
                                ) : currentStock !== null ? (
                                    <p className="flex items-center gap-1.5 text-muted-foreground"><Check className="h-3.5 w-3.5" /> In stock, ready to dispatch</p>
                                ) : null}
                            </div>

                            <div className="flex items-stretch gap-2 sm:gap-3">
                                <div className="flex h-13 items-center border border-border" role="group" aria-label="Quantity">
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(Math.max(1, effectiveQuantity - 1))}
                                        disabled={effectiveQuantity <= 1}
                                        aria-label="Decrease quantity"
                                        className="flex h-full w-11 items-center justify-center disabled:opacity-30"
                                    >
                                        <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{effectiveQuantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(Math.min(maxQuantity, effectiveQuantity + 1))}
                                        disabled={effectiveQuantity >= maxQuantity}
                                        aria-label="Increase quantity"
                                        className="flex h-full w-11 items-center justify-center disabled:opacity-30"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => addToBag(false)}
                                    disabled={soldOut}
                                    className="flex h-13 min-w-0 flex-1 items-center justify-center gap-2 bg-foreground px-4 sm:px-6 font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-background transition-colors duration-500 hover:bg-brand hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {soldOut ? "Sold out" : added ? <><Check className="h-4 w-4" /> Added to bag</> : "Add to bag"}
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleWishlist}
                                    disabled={wishlistPending}
                                    aria-pressed={inWishlist}
                                    aria-label={inWishlist ? "Remove from wishlist" : "Save to wishlist"}
                                    className="flex h-13 w-13 items-center justify-center border border-border transition-colors hover:border-foreground disabled:opacity-60"
                                >
                                    <Heart className={cn("h-4 w-4", inWishlist && "fill-current text-brand-strong")} />
                                </button>
                            </div>
                            {!soldOut && (
                                <button
                                    type="button"
                                    onClick={() => addToBag(true)}
                                    className="flex h-12 w-full items-center justify-center border border-foreground font-heading text-[11px] font-medium uppercase tracking-[0.22em] transition-colors duration-500 hover:bg-foreground hover:text-background"
                                >
                                    Buy now
                                </button>
                            )}
                            {wishlistError && <p className="text-xs text-destructive" role="alert">{wishlistError}</p>}

                            <ul className="grid gap-3 border-y border-border/70 py-5 text-xs text-muted-foreground">
                                <li className="flex items-start gap-3">
                                    <Truck className="mt-0.5 h-4 w-4 flex-none text-brand-strong" />
                                    <span>Delivered {DELIVERY_ESTIMATE}. {price >= FREE_SHIPPING_THRESHOLD ? "Complimentary delivery on this piece." : `Complimentary delivery over ${FREE_SHIPPING_THRESHOLD_DISPLAY}.`}</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <RotateCcw className="mt-0.5 h-4 w-4 flex-none text-brand-strong" />
                                    <span>Easy returns within {RETURN_WINDOW_DAYS} days of delivery. <Link href="/policies/returns" className="underline underline-offset-2 hover:text-foreground">Details</Link></span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-brand-strong" />
                                    <span>{COD_ENABLED ? `Pay securely online or cash on delivery (${formatPrice(COD_FEE)} fee).` : "Secure checkout."}</span>
                                </li>
                            </ul>
                        </div>

                        <div className="mt-2">
                            {detailRows.length > 0 || (product.features?.length ?? 0) > 0 ? (
                                <Accordion title="Details" defaultOpen>
                                    {detailRows.length > 0 && (
                                        <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2">
                                            {detailRows.map(([label, value]) => (
                                                <div key={label} className="contents">
                                                    <dt className="text-foreground">{label}</dt>
                                                    <dd>{value}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    )}
                                    {(product.features?.length ?? 0) > 0 && (
                                        <ul className={cn("list-none space-y-1.5", detailRows.length > 0 && "mt-4")}>
                                            {product.features!.map((feature) => (
                                                <li key={feature} className="flex gap-2"><span className="text-brand">—</span>{feature}</li>
                                            ))}
                                        </ul>
                                    )}
                                </Accordion>
                            ) : null}
                            {(product.careInstructions?.length ?? 0) > 0 && (
                                <Accordion title="Care">
                                    <ul className="space-y-1.5">
                                        {product.careInstructions!.map((care) => <li key={care}>{care}</li>)}
                                    </ul>
                                </Accordion>
                            )}
                            <Accordion title="Delivery & returns">
                                <p>
                                    We deliver across the UAE, usually {DELIVERY_ESTIMATE.replace(/ across the UAE$/, "")}. Delivery is complimentary on orders over {FREE_SHIPPING_THRESHOLD_DISPLAY}.
                                    {COD_ENABLED ? ` Cash on delivery is available for a ${formatPrice(COD_FEE)} fee.` : ""}
                                </p>
                                <p className="mt-3">
                                    Changed your mind? Return unused pieces in their original packaging within {RETURN_WINDOW_DAYS} days.{" "}
                                    <Link href="/policies/shipping" className="underline underline-offset-2 hover:text-foreground">Delivery</Link>
                                    {" · "}
                                    <Link href="/policies/returns" className="underline underline-offset-2 hover:text-foreground">Returns</Link>
                                </p>
                            </Accordion>
                            {product.collections.length > 0 && (
                                <p className="pt-5 text-xs text-muted-foreground">
                                    Part of{" "}
                                    {product.collections.map((collection, index) => (
                                        <span key={collection.slug}>
                                            {index > 0 && ", "}
                                            <Link href={buildCollectionPath(collection.slug)} className="text-foreground underline underline-offset-2 hover:text-brand-strong">{collection.name}</Link>
                                        </span>
                                    ))}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Complete the set */}
                {(product.relatedCombos?.length ?? 0) > 0 && (
                    <section className="mt-20 border-t border-border/60 px-5 pt-14 md:px-12 lg:px-16">
                        <h2 className="mb-8 font-display text-2xl md:text-3xl">Complete the set</h2>
                        <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 scrollbar-hide md:mx-0 md:scroll-px-0 md:px-0">
                            {product.relatedCombos.map((combo) => (
                                <ViewportPrefetchLink key={combo.id} href={`/combo/${combo.id}`} className="group w-[78vw] max-w-[380px] flex-none snap-start">
                                    <div className="grid aspect-[2/1] grid-cols-2 gap-px overflow-hidden bg-muted">
                                        {[combo.productA, combo.productB].map((item) => (
                                            <div key={item.id} className="relative">
                                                <Image src={normalizeProductImage(item.images?.[0])} alt={item.name} fill sizes="190px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-3 font-heading text-xs uppercase tracking-[0.08em]">{combo.productA.name} + {combo.productB.name}</p>
                                    <p className="mt-1 text-sm tabular-nums">
                                        {formatPrice(Number(combo.productA.sellingPrice) + Number(combo.productB.sellingPrice) - Number(combo.discountAmount))}
                                        {Number(combo.discountAmount) > 0 && <span className="ml-2 text-xs text-brand-strong">Save {formatPrice(combo.discountAmount)}</span>}
                                    </p>
                                </ViewportPrefetchLink>
                            ))}
                        </div>
                    </section>
                )}

                {/* You may also like */}
                {(product.relatedProducts?.length ?? 0) > 0 && (
                    <section className="mt-20 border-t border-border/60 px-5 pt-14 md:px-12 lg:px-16">
                        <h2 className="mb-8 font-display text-2xl md:text-3xl">You may also like</h2>
                        <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 scrollbar-hide md:mx-0 md:scroll-px-0 md:gap-6 md:px-0">
                            {product.relatedProducts.map((related) => (
                                <div key={related.id} className="w-[60vw] max-w-[280px] flex-none snap-start">
                                    <ProductCard product={related} sizes="(max-width: 640px) 60vw, 280px" />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Recently viewed */}
                {recentlyViewed.length > 0 && (
                    <section className="mt-16 border-t border-border/60 px-5 pt-14 md:px-12 lg:px-16">
                        <h2 className="mb-8 font-display text-2xl md:text-3xl">Recently viewed</h2>
                        <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 scrollbar-hide md:mx-0 md:scroll-px-0 md:gap-6 md:px-0">
                            {recentlyViewed.map((item) => (
                                <div key={item.id} className="w-[44vw] max-w-[220px] flex-none snap-start">
                                    <ProductCard product={item} sizes="(max-width: 640px) 44vw, 220px" />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Mobile sticky purchase bar */}
            {!soldOut && (
                <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden">
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-heading text-[11px] uppercase tracking-[0.08em]">{product.name}</p>
                        <p className="text-sm tabular-nums">{formatPrice(price)}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (!addToBag(false)) window.scrollTo({ top: 0, behavior: shouldReduceMotion ? "auto" : "smooth" })
                        }}
                        className="h-12 flex-none bg-foreground px-6 font-heading text-[11px] font-medium uppercase tracking-[0.2em] text-background"
                    >
                        {added ? "Added" : "Add to bag"}
                    </button>
                </div>
            )}

            <AnimatePresence>
                {lightboxOpen && (
                    <Lightbox
                        images={images}
                        index={selectedImage}
                        name={product.name}
                        onClose={() => setLightboxOpen(false)}
                        onChange={setSelectedImage}
                    />
                )}
            </AnimatePresence>

            <ProductAssistant
                key={product.id}
                productContext={{
                    id: product.id,
                    name: product.name,
                    mrp: product.mrp,
                    sellingPrice: product.sellingPrice,
                    category: product.categoryName ?? product.category,
                    material: product.material,
                    dimensions: product.dimensions,
                    features: product.features,
                    sizes: product.sizes,
                    sizeLabel: product.sizeLabel,
                    colors: product.colors,
                    colorLabel: product.colorLabel,
                    description: product.description,
                    careInstructions: product.careInstructions,
                }}
            />
        </>
    )
}
