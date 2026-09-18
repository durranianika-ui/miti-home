"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Heart, Plus } from "lucide-react"
import { ViewportPrefetchLink } from "@/components/ui/viewport-prefetch-link"
import { useCart } from "@/lib/cart-context"
import { addWishlistItem, getWishlistNavState, removeWishlistItem } from "@/lib/actions/wishlist"
import { normalizeProductImage } from "@/lib/image"
import { discountPercent, formatPrice } from "@/lib/money"
import { buildProductPath } from "@/lib/seo"
import { trackEcommerce } from "@/lib/analytics"
import { cn } from "@/lib/utils"

export type ProductCardProduct = {
    id: string
    name: string
    slug: string
    sellingPrice: string
    mrp: string
    images: string[]
    stock: number
    isNew?: boolean
    sizes?: string[]
    colors?: { name: string; hex: string }[]
    availableSizes?: string[]
    colorLabel?: string
}

function isSingleOption(product: ProductCardProduct) {
    const sizes = product.sizes ?? []
    return (product.colors?.length ?? 0) === 0 && sizes.length <= 1
}

export function ProductCardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("space-y-3", className)} aria-hidden="true">
            <div className="aspect-[4/5] animate-pulse bg-muted" />
            <div className="space-y-2 px-1">
                <div className="h-3 w-3/4 animate-pulse bg-muted" />
                <div className="h-3 w-1/3 animate-pulse bg-muted" />
            </div>
        </div>
    )
}

/**
 * Home-product card: primary image with a secondary image revealed on hover,
 * honest badges (new / sale / sold out / low stock), finish swatches, a
 * wishlist heart and quick add for single-option pieces.
 */
export function ProductCard({
    product,
    sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
    priority = false,
    onNavigate,
}: {
    product: ProductCardProduct
    sizes?: string
    priority?: boolean
    onNavigate?: () => void
}) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { addItem, setIsOpen } = useCart()
    const [added, setAdded] = useState(false)
    const [wishlistPending, setWishlistPending] = useState(false)
    const { data: wishlist } = useQuery({
        queryKey: ["wishlist-nav"],
        queryFn: getWishlistNavState,
        staleTime: 1000 * 30,
    })

    const href = buildProductPath(product.slug)
    const primary = normalizeProductImage(product.images?.[0])
    const secondary = product.images?.[1] ? normalizeProductImage(product.images[1]) : null
    const soldOut = product.stock <= 0
    const lowStock = !soldOut && product.stock <= 3
    const saving = discountPercent(product.mrp, product.sellingPrice)
    const saved = Boolean(wishlist?.productIds?.includes(product.id))
    const quickAddable = isSingleOption(product) && !soldOut
    const colors = product.colors ?? []

    const toggleWishlist = async (event: React.MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        if (wishlistPending) return
        if (wishlist && !wishlist.authenticated) {
            router.push(`/account?redirect=${encodeURIComponent(href)}`)
            return
        }
        setWishlistPending(true)
        await (saved ? removeWishlistItem(product.id) : addWishlistItem(product.id))
        await queryClient.invalidateQueries({ queryKey: ["wishlist-nav"] })
        await queryClient.invalidateQueries({ queryKey: ["wishlist-product", product.id] })
        setWishlistPending(false)
    }

    const quickAdd = (event: React.MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        if (!quickAddable) {
            onNavigate?.()
            router.push(href)
            return
        }
        const price = Number(product.sellingPrice)
        addItem({
            id: product.id,
            name: product.name,
            price,
            displayPrice: formatPrice(price),
            image: primary,
            size: product.sizes?.[0] ?? "Standard",
        })
        trackEcommerce("add_to_cart", { items: [{ id: product.id, name: product.name, price, quantity: 1 }] })
        setAdded(true)
        window.setTimeout(() => setAdded(false), 1800)
        setIsOpen(true)
    }

    return (
        <ViewportPrefetchLink href={href} onClick={onNavigate} className="group block focus-visible:outline-none">
            <article className="hover-lift">
                <div className="relative aspect-[4/5] overflow-hidden bg-muted/60 ring-offset-2 ring-offset-background group-focus-visible:ring-1 group-focus-visible:ring-foreground">
                    <Image
                        src={primary}
                        alt={product.name}
                        fill
                        sizes={sizes}
                        priority={priority}
                        className={cn(
                            "object-cover transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.035]",
                            secondary && "md:group-hover:opacity-0",
                        )}
                    />
                    {secondary && (
                        <Image
                            src={secondary}
                            alt=""
                            aria-hidden="true"
                            fill
                            sizes={sizes}
                            className="hidden object-cover opacity-0 transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] md:block md:group-hover:scale-[1.035] md:group-hover:opacity-100"
                        />
                    )}

                    <div className="absolute left-2.5 top-2.5 z-10 flex flex-col items-start gap-1.5 sm:left-3 sm:top-3">
                        {soldOut ? (
                            <span className="badge-sold-out">Sold out</span>
                        ) : (
                            <>
                                {product.isNew && (
                                    <span className="bg-background/90 px-2 py-1 font-heading text-[9px] font-medium uppercase tracking-[0.16em] text-foreground backdrop-blur-sm">
                                        New
                                    </span>
                                )}
                                {saving !== null && (
                                    <span className="bg-brand px-2 py-1 font-heading text-[9px] font-medium uppercase tracking-[0.16em] text-brand-foreground">
                                        −{saving}%
                                    </span>
                                )}
                            </>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={toggleWishlist}
                        disabled={wishlistPending}
                        aria-pressed={saved}
                        aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
                        className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition-all duration-300 hover:bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground disabled:opacity-60 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 data-[saved=true]:opacity-100"
                        data-saved={saved}
                    >
                        <Heart className={cn("h-4 w-4 transition-transform duration-300", saved && "fill-current text-brand-strong")} />
                    </button>

                    {!soldOut && (
                        <button
                            type="button"
                            onClick={quickAdd}
                            aria-label={quickAddable ? `Add ${product.name} to bag` : `Choose options for ${product.name}`}
                            className="absolute inset-x-2 bottom-2 z-10 hidden h-10 items-center justify-center gap-2 bg-background/92 font-heading text-[10px] font-medium uppercase tracking-[0.2em] text-foreground opacity-0 backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-foreground hover:text-background focus-visible:opacity-100 md:flex md:translate-y-2 md:group-hover:translate-y-0 md:group-hover:opacity-100"
                        >
                            {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            {added ? "Added" : quickAddable ? "Quick add" : "Choose options"}
                        </button>
                    )}
                </div>

                <div className="space-y-1.5 px-0.5 pb-2 pt-3.5 sm:px-1">
                    <h3 className="line-clamp-2 font-heading text-[12px] font-normal uppercase leading-snug tracking-[0.08em] sm:text-[13px]">
                        {product.name}
                    </h3>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums">
                        <span className={cn("text-sm", saving !== null && "text-brand-strong")}>{formatPrice(product.sellingPrice)}</span>
                        {saving !== null && (
                            <span className="text-[11px] text-muted-foreground line-through">{formatPrice(product.mrp)}</span>
                        )}
                    </div>
                    {(colors.length > 1 || lowStock) && (
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                            {colors.length > 1 ? (
                                <div className="flex items-center gap-1.5" aria-label={`${colors.length} ${(product.colorLabel ?? "colour").toLowerCase()}s available`}>
                                    {colors.slice(0, 4).map((color) => (
                                        <span
                                            key={color.name}
                                            title={color.name}
                                            className="h-3.5 w-3.5 rounded-full border border-foreground/15"
                                            style={{ backgroundColor: color.hex }}
                                        />
                                    ))}
                                    {colors.length > 4 && <span className="text-[10px] text-muted-foreground">+{colors.length - 4}</span>}
                                </div>
                            ) : <span />}
                            {lowStock && <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Only {product.stock} left</span>}
                        </div>
                    )}
                </div>
            </article>
        </ViewportPrefetchLink>
    )
}
