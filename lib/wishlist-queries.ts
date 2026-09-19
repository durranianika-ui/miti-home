import { getProductWishlist, getWishlistNavState } from "@/lib/actions/wishlist"

// The static preview has no server to call, so every visitor is a guest there.
const STATIC_PREVIEW = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "1"

export function fetchWishlistNavState(): ReturnType<typeof getWishlistNavState> {
    if (STATIC_PREVIEW) return Promise.resolve({ authenticated: false as const, count: 0, productIds: [] as string[] })
    return getWishlistNavState()
}

export function fetchProductWishlist(productId: string): ReturnType<typeof getProductWishlist> {
    if (STATIC_PREVIEW) return Promise.resolve({ authenticated: false as const, saved: false, wishlistId: null, savedAt: null })
    return getProductWishlist(productId)
}
