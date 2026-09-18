import { validateCartQuantities } from "@/lib/checkout/validation";
import {
  type CheckoutPaymentMethod,
  type CheckoutQuote,
  type VerifiedCheckoutItem,
  buildCheckoutQuoteFromVerifiedItems,
} from "@/lib/checkout/pricing";
import { computeComboDiscountFromItems } from "@/lib/combos";
import { validateCoupon } from "@/lib/coupon-validation";
import { db } from "@/lib/db";
import { products, productVariants } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export type CheckoutQuoteItemInput = {
  productId: string;
  productName?: string;
  productImage?: string;
  size: string;
  color?: string;
  comboId?: string;
  comboGroupId?: string;
  quantity: number;
};

export type CreateCheckoutQuoteInput = {
  items: CheckoutQuoteItemInput[];
  couponCode?: string | null;
  paymentMethod: CheckoutPaymentMethod;
  userId?: string;
};

export class CheckoutQuoteError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "CheckoutQuoteError";
  }
}

export function isCheckoutPaymentMethod(value: unknown): value is CheckoutPaymentMethod {
  return value === "cod" || value === "card";
}

type ProductRow = {
  id: string;
  name: string;
  sellingPrice: string;
  images: string[] | null;
  sizes: string[] | null;
  colors: { name: string; images?: string[] }[] | null;
  stock: number;
};

type VariantRow = { productId: string; size: string; color: string | null; stock: number };

function optionLabel(size: string, color?: string | null) {
  return [size !== "Standard" ? size : null, color].filter(Boolean).join(", ");
}

/**
 * Rejects options that do not exist and quantities that exceed current stock.
 * Order creation re-checks stock atomically; this pre-check stops customers
 * from paying on a hosted card page for something we cannot ship.
 */
function assertItemsAvailable(
  items: CheckoutQuoteItemInput[],
  productMap: Map<string, ProductRow>,
  variantsByProduct: Map<string, VariantRow[]>,
) {
  const requested = new Map<string, number>();

  for (const item of items) {
    const product = productMap.get(item.productId)!;
    const variants = variantsByProduct.get(item.productId) ?? [];
    const color = item.color || null;
    const label = optionLabel(item.size, color);
    const name = label ? `${product.name} (${label})` : product.name;

    if (variants.length > 0) {
      const variant = variants.find((row) => row.size === item.size && (row.color ?? null) === color);
      if (!variant) throw new CheckoutQuoteError(`The selected option is unavailable for ${name}`);
      const key = `${item.productId}|${item.size}|${color ?? ""}`;
      const total = (requested.get(key) ?? 0) + item.quantity;
      requested.set(key, total);
      if (variant.stock < total) {
        throw new CheckoutQuoteError(
          variant.stock > 0 ? `Only ${variant.stock} left of ${name}` : `${name} is out of stock`,
        );
      }
    } else {
      const sizes = product.sizes ?? [];
      if (sizes.length > 0 && !sizes.includes(item.size)) {
        throw new CheckoutQuoteError(`The selected option is unavailable for ${name}`);
      }
      const key = item.productId;
      const total = (requested.get(key) ?? 0) + item.quantity;
      requested.set(key, total);
      if (product.stock < total) {
        throw new CheckoutQuoteError(
          product.stock > 0 ? `Only ${product.stock} left of ${product.name}` : `${product.name} is out of stock`,
        );
      }
    }
  }
}

export async function createCheckoutQuote(input: CreateCheckoutQuoteInput): Promise<CheckoutQuote> {
  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    throw new CheckoutQuoteError("No items provided");
  }

  if (!validateCartQuantities(input.items)) {
    throw new CheckoutQuoteError("Invalid item quantity");
  }

  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const [productRows, variantRows] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        sellingPrice: products.sellingPrice,
        images: products.images,
        sizes: products.sizes,
        colors: products.colors,
        stock: products.stock,
      })
      .from(products)
      .where(and(inArray(products.id, productIds), eq(products.isActive, true))),
    db
      .select({
        productId: productVariants.productId,
        size: productVariants.size,
        color: productVariants.color,
        stock: productVariants.stock,
      })
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds)),
  ]);

  const productMap = new Map<string, ProductRow>(productRows.map((product) => [product.id, product]));
  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const variant of variantRows) {
    const list = variantsByProduct.get(variant.productId) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.productId, list);
  }

  for (const item of input.items) {
    if (!productMap.has(item.productId)) {
      throw new CheckoutQuoteError("An item in your bag is no longer available. Please remove it and try again.");
    }
    if (typeof item.size !== "string" || !item.size.trim()) {
      throw new CheckoutQuoteError("Please choose an option for every item in your bag");
    }
  }

  assertItemsAvailable(input.items, productMap, variantsByProduct);
  const verifiedItems: VerifiedCheckoutItem[] = input.items.map((item) => {
    const product = productMap.get(item.productId);

    if (!product) {
      throw new CheckoutQuoteError("An item in your bag is no longer available");
    }

    const unitPrice = Number(product.sellingPrice);
    const totalPrice = unitPrice * item.quantity;
    const colorImage = item.color
      ? product.colors?.find((color) => color.name === item.color)?.images?.[0]
      : undefined;
    const fallbackImage = colorImage || product.images?.[0];

    return {
      productId: item.productId,
      productName: product.name,
      // Never trust a client-supplied image URL for the order snapshot.
      productImage: fallbackImage,
      size: item.size,
      color: item.color || undefined,
      comboId: item.comboId,
      comboGroupId: item.comboGroupId,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
    };
  });

  let comboDiscount = 0;
  try {
    comboDiscount = await computeComboDiscountFromItems(verifiedItems);
  } catch (error) {
    throw new CheckoutQuoteError(error instanceof Error ? error.message : "Invalid combo selected");
  }

  const preCouponQuote = buildCheckoutQuoteFromVerifiedItems({
    items: verifiedItems,
    paymentMethod: input.paymentMethod,
    comboDiscount,
  });

  let couponDiscount = 0;
  const couponCode = input.couponCode?.trim().toUpperCase();
  if (couponCode) {
    const couponResult = await validateCoupon(couponCode, preCouponQuote.subtotal, input.userId);

    if (!couponResult.valid) {
      throw new CheckoutQuoteError(couponResult.error || "Invalid coupon code");
    }

    couponDiscount = couponResult.discount ?? 0;
  }

  return buildCheckoutQuoteFromVerifiedItems({
    items: verifiedItems,
    paymentMethod: input.paymentMethod,
    comboDiscount,
    couponDiscount,
    couponCode,
  });
}
