"use server";

import { getServerSession, requireAuth } from "@/lib/auth-server";
import {
  addProductWishlistItem,
  getProductWishlistState,
  getWishlistProductIds,
  removeProductWishlistItem,
} from "@/lib/wishlist";

function friendlyActionError(error: unknown, fallback: string) {
  console.error(fallback, error);
  if (error instanceof Error && /unauthorized|auth/i.test(error.message)) {
    return "Sign in to continue.";
  }
  return fallback;
}

export async function getWishlistNavState() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return {
      authenticated: false as const,
      count: 0,
      productIds: [] as string[],
    };
  }

  try {
    const productIds = await getWishlistProductIds(session.user.id);
    return {
      authenticated: true as const,
      count: productIds.length,
      productIds,
    };
  } catch (error) {
    return {
      authenticated: true as const,
      count: 0,
      productIds: [] as string[],
      error: friendlyActionError(error, "Could not load your wishlist."),
    };
  }
}

export async function getProductWishlist(productId: string) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return {
      authenticated: false as const,
      saved: false,
      wishlistId: null,
      savedAt: null,
    };
  }

  try {
    return {
      authenticated: true as const,
      ...(await getProductWishlistState(session.user.id, productId)),
    };
  } catch (error) {
    return {
      authenticated: true as const,
      saved: false,
      wishlistId: null,
      savedAt: null,
      error: friendlyActionError(error, "Could not load wishlist state."),
    };
  }
}

export async function addWishlistItem(productId: string) {
  try {
    const session = await requireAuth();
    return addProductWishlistItem(session.user.id, productId);
  } catch (error) {
    return {
      success: false as const,
      error: friendlyActionError(error, "Could not save this product."),
    };
  }
}

export async function removeWishlistItem(productId: string) {
  try {
    const session = await requireAuth();
    return removeProductWishlistItem(session.user.id, productId);
  } catch (error) {
    return {
      success: false as const,
      error: friendlyActionError(error, "Could not remove this product."),
    };
  }
}
