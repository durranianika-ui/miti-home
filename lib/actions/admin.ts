"use server";

import { db } from "@/lib/db";
import {
  categories,
  collectionProducts,
  collections,
  checkoutSessions,
  coupons,
  newsletterSubscribers,
  orderItems,
  orders,
  products,
  productVariants,
  user,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";
import { and, asc, count, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { ADMIN_PRODUCTS_PAGE_SIZE } from "@/lib/admin-products-pagination";
import { getPublicProductMutationPaths, getPublicTaxonomyMutationPaths } from "@/lib/public-cache";
import {
  deleteProductSearchIndexAfterMutation,
  refreshProductSearchText,
  syncProductSearchIndexAfterMutation,
} from "@/lib/product-search-index";
import { refreshProductRecommendationsAfterMutation } from "@/lib/product-recommendations";
import {
  buildDefaultVariants,
  normalizeProductInput,
  normalizeProductPatch,
  normalizeSlug,
  type ProductInput,
} from "@/lib/admin-product-input";
import { buildProductSearchText } from "@/lib/product-search";
import { restoreStock } from "@/lib/orders/create-order";
import { sendOrderStatusEmail } from "@/lib/email";

export type { ProductInput } from "@/lib/admin-product-input";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ProductMutationClient = typeof db | Tx;
type OrderStatus = (typeof orders.status.enumValues)[number];

function revalidatePaths(paths: string[]) {
  for (const path of paths) revalidatePath(path);
}

async function collectionSlugsFor(productId: string) {
  const rows = await db
    .select({ slug: collections.slug })
    .from(collectionProducts)
    .innerJoin(collections, eq(collections.id, collectionProducts.collectionId))
    .where(eq(collectionProducts.productId, productId));
  return rows.map((row) => row.slug);
}

async function assertCategoryExists(slug: string) {
  const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug));
  if (!category) throw new Error(`Category "${slug}" does not exist. Create it under Admin → Categories first.`);
}

async function recomputeProductStock(client: ProductMutationClient, productId: string) {
  const [row] = await client
    .select({ totalStock: sql<number>`COALESCE(SUM(${productVariants.stock}), 0)` })
    .from(productVariants)
    .where(eq(productVariants.productId, productId));

  const totalStock = Number(row?.totalStock ?? 0);
  await client.update(products).set({ stock: totalStock, updatedAt: new Date() }).where(eq(products.id, productId));
  return totalStock;
}

async function syncProductVariants(
  client: ProductMutationClient,
  productId: string,
  variants: { size: string; color: string | null; stock: number }[],
) {
  await client.delete(productVariants).where(eq(productVariants.productId, productId));
  if (variants.length > 0) {
    await client.insert(productVariants).values(variants.map((variant) => ({ productId, ...variant })));
  }
  return recomputeProductStock(client, productId);
}

async function syncProductCollections(client: ProductMutationClient, productId: string, collectionIds: string[]) {
  await client.delete(collectionProducts).where(eq(collectionProducts.productId, productId));
  if (collectionIds.length === 0) return;
  const existing = await client
    .select({ id: collections.id })
    .from(collections)
    .where(inArray(collections.id, collectionIds));
  const valid = existing.map((row) => row.id);
  if (valid.length === 0) return;
  const [maxRow] = await client
    .select({ max: sql<number>`COALESCE(MAX(${collectionProducts.position}), 0)` })
    .from(collectionProducts);
  await client.insert(collectionProducts).values(
    valid.map((collectionId, index) => ({ collectionId, productId, position: Number(maxRow?.max ?? 0) + index + 1 })),
  );
}

async function afterProductMutation(productId: string, slugs: { nextSlug?: string | null; previousSlug?: string | null }, categorySlugs: string[]) {
  const searchResult = await syncProductSearchIndexAfterMutation(productId);
  if (searchResult.status !== "failed") {
    await refreshProductRecommendationsAfterMutation(productId);
  }
  revalidatePaths(
    getPublicProductMutationPaths({
      ...slugs,
      categorySlugs,
      collectionSlugs: await collectionSlugsFor(productId),
    }),
  );
}

// ============================================
// PRODUCTS
// ============================================

export async function createProduct(data: ProductInput) {
  await requireAdmin();
  const input = normalizeProductInput(data);
  await assertCategoryExists(input.category);

  const sizes = input.sizes ?? ["Standard"];
  const colors = input.colors ?? [];

  const product = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(products)
      .values({
        name: input.name,
        slug: input.slug,
        sku: input.sku,
        description: input.description,
        mrp: input.mrp,
        sellingPrice: input.sellingPrice,
        maxBargainDiscount: input.maxBargainDiscount || "0",
        category: input.category,
        tags: input.tags || [],
        stock: 0,
        images: input.images || [],
        material: input.material,
        dimensions: input.dimensions,
        careInstructions: input.careInstructions || [],
        features: input.features || [],
        sizeLabel: input.sizeLabel ?? "Size",
        colorLabel: input.colorLabel ?? "Colour",
        sizes,
        colors,
        searchText: buildProductSearchText({ ...input, sizes, colors }),
        isNew: input.isNew ?? false,
        isFeatured: input.isFeatured ?? false,
        isActive: input.isActive ?? true,
        displayOrder: input.displayOrder ?? 0,
      })
      .returning();

    const variants = input.variants && input.variants.length > 0
      ? input.variants
      : buildDefaultVariants(sizes, colors, input.stock);
    await syncProductVariants(tx, created.id, variants);
    await syncProductCollections(tx, created.id, input.collectionIds ?? []);
    return created;
  });

  await afterProductMutation(product.id, { nextSlug: product.slug }, [product.category]);
  return product;
}

export async function updateProduct(id: string, data: Partial<ProductInput>) {
  await requireAdmin();
  const input = normalizeProductPatch(data);

  const [existing] = await db.select().from(products).where(eq(products.id, id));
  if (!existing) throw new Error("Product not found");
  if (input.category && input.category !== existing.category) await assertCategoryExists(input.category);

  const { variants, collectionIds, stock, ...fields } = input;
  const nextSizes = fields.sizes ?? existing.sizes ?? ["Standard"];
  const nextColors = fields.colors ?? existing.colors ?? [];

  const product = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(products)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    if (variants) {
      await syncProductVariants(tx, id, variants);
    } else if (fields.sizes || fields.colors || typeof stock === "number") {
      // Options changed without an explicit matrix: rebuild it, keeping stock.
      const total = typeof stock === "number" ? stock : existing.stock;
      await syncProductVariants(tx, id, buildDefaultVariants(nextSizes, nextColors, total));
    }
    if (collectionIds) await syncProductCollections(tx, id, collectionIds);
    return updated;
  });

  await afterProductMutation(id, { nextSlug: product.slug, previousSlug: existing.slug }, [product.category, existing.category]);
  return product;
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  const [existing] = await db.select({ slug: products.slug, category: products.category }).from(products).where(eq(products.id, id));
  const collectionSlugs = await collectionSlugsFor(id);

  // Products with order history are archived, not deleted, so records stay intact.
  const [history] = await db.select({ count: count() }).from(orderItems).where(eq(orderItems.productId, id));
  if (Number(history?.count ?? 0) > 0) {
    await db.update(products).set({ isActive: false, updatedAt: new Date() }).where(eq(products.id, id));
  } else {
    await db.delete(products).where(eq(products.id, id));
    await deleteProductSearchIndexAfterMutation(id);
  }

  revalidatePaths(
    getPublicProductMutationPaths({
      previousSlug: existing?.slug,
      categorySlugs: existing ? [existing.category] : [],
      collectionSlugs,
    }),
  );
  return { success: true, archived: Number(history?.count ?? 0) > 0 };
}

export async function getProducts(options?: {
  category?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  await requireAdmin();

  const conditions = [];
  if (options?.category) conditions.push(eq(products.category, options.category));
  if (options?.isActive !== undefined) conditions.push(eq(products.isActive, options.isActive));
  if (options?.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(or(ilike(products.name, term), ilike(products.slug, term), ilike(products.sku, term))!);
  }

  return db
    .select()
    .from(products)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(products.displayOrder), desc(products.createdAt))
    .limit(options?.limit || 50)
    .offset(options?.offset || 0);
}

export async function getProductsPage(options?: {
  category?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.max(1, Math.min(options?.limit ?? ADMIN_PRODUCTS_PAGE_SIZE, 100));
  const offset = Math.max(0, options?.offset ?? 0);
  const rows = await getProducts({ ...options, limit: limit + 1, offset });

  return {
    products: rows.slice(0, limit),
    nextOffset: rows.length > limit ? offset + limit : null,
  };
}

export async function getProductById(id: string) {
  await requireAdmin();
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) return product;
  const collectionRows = await db
    .select({ collectionId: collectionProducts.collectionId })
    .from(collectionProducts)
    .where(eq(collectionProducts.productId, id));
  return { ...product, collectionIds: collectionRows.map((row) => row.collectionId) };
}

export async function getProductBySlug(slug: string) {
  await requireAdmin();
  const [product] = await db.select().from(products).where(eq(products.slug, slug));
  return product;
}

export async function getProductVariants(productId: string) {
  await requireAdmin();
  return db.select().from(productVariants).where(eq(productVariants.productId, productId));
}

/** Quick inventory edit from the product list: set stock for one variant. */
export async function updateVariantStock(variantId: string, stock: number) {
  await requireAdmin();
  if (!Number.isInteger(stock) || stock < 0) throw new Error("Stock must be a whole number of 0 or more");
  const [variant] = await db
    .update(productVariants)
    .set({ stock, updatedAt: new Date() })
    .where(eq(productVariants.id, variantId))
    .returning({ productId: productVariants.productId });
  if (!variant) throw new Error("Variant not found");
  const total = await recomputeProductStock(db, variant.productId);
  const [product] = await db.select({ slug: products.slug, category: products.category }).from(products).where(eq(products.id, variant.productId));
  revalidatePaths(getPublicProductMutationPaths({ nextSlug: product?.slug, categorySlugs: product ? [product.category] : [] }));
  return { success: true, total };
}

// ============================================
// CATEGORIES
// ============================================

export type CategoryInput = {
  slug: string;
  name: string;
  description?: string | null;
  image?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  displayOrder?: number;
  isActive?: boolean;
};

function normalizeTaxonomyInput(data: CategoryInput) {
  const name = data.name?.trim();
  if (!name) throw new Error("Name is required");
  return {
    slug: normalizeSlug(data.slug, "Slug"),
    name,
    description: data.description?.trim() || null,
    image: data.image?.trim() || null,
    seoTitle: data.seoTitle?.trim() || null,
    seoDescription: data.seoDescription?.trim() || null,
    displayOrder: Number.isInteger(data.displayOrder) ? Number(data.displayOrder) : 0,
    isActive: data.isActive ?? true,
  };
}

export async function getAdminCategories() {
  await requireAdmin();
  const rows = await db
    .select({
      category: categories,
      productCount: sql<number>`count(${products.id})`.mapWith(Number),
    })
    .from(categories)
    .leftJoin(products, eq(products.category, categories.slug))
    .groupBy(categories.id)
    .orderBy(asc(categories.displayOrder), asc(categories.name));
  return rows.map((row) => ({ ...row.category, productCount: row.productCount }));
}

export async function saveCategory(id: string | null, data: CategoryInput) {
  await requireAdmin();
  const values = normalizeTaxonomyInput(data);

  let previousSlug: string | null = null;
  if (id) {
    const [existing] = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.id, id));
    if (!existing) throw new Error("Category not found");
    previousSlug = existing.slug;
    await db.transaction(async (tx) => {
      await tx.update(categories).set({ ...values, updatedAt: new Date() }).where(eq(categories.id, id));
      if (previousSlug && previousSlug !== values.slug) {
        await tx.update(products).set({ category: values.slug, updatedAt: new Date() }).where(eq(products.category, previousSlug));
      }
    });
  } else {
    await db.insert(categories).values(values);
  }

  if (previousSlug && previousSlug !== values.slug) {
    const moved = await db.select({ id: products.id }).from(products).where(eq(products.category, values.slug));
    for (const row of moved) await refreshProductSearchText(row.id);
  }

  revalidatePaths(getPublicTaxonomyMutationPaths({ categorySlugs: [values.slug, ...(previousSlug ? [previousSlug] : [])] }));
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  const [category] = await db.select().from(categories).where(eq(categories.id, id));
  if (!category) return { success: false, error: "Category not found" };
  const [inUse] = await db.select({ count: count() }).from(products).where(eq(products.category, category.slug));
  if (Number(inUse?.count ?? 0) > 0) {
    return { success: false, error: "Move this category's products to another category before deleting it." };
  }
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePaths(getPublicTaxonomyMutationPaths({ categorySlugs: [category.slug] }));
  revalidatePath("/", "layout");
  return { success: true };
}

// ============================================
// COLLECTIONS
// ============================================

export type CollectionInput = CategoryInput & { eyebrow?: string | null; isFeatured?: boolean; productIds?: string[] };

export async function getAdminCollections() {
  await requireAdmin();
  const rows = await db
    .select({
      collection: collections,
      productCount: sql<number>`count(${collectionProducts.productId})`.mapWith(Number),
    })
    .from(collections)
    .leftJoin(collectionProducts, eq(collectionProducts.collectionId, collections.id))
    .groupBy(collections.id)
    .orderBy(asc(collections.displayOrder), asc(collections.name));
  return rows.map((row) => ({ ...row.collection, productCount: row.productCount }));
}

export async function getAdminCollection(id: string) {
  await requireAdmin();
  const [collection] = await db.select().from(collections).where(eq(collections.id, id));
  if (!collection) return null;
  const members = await db
    .select({ productId: collectionProducts.productId })
    .from(collectionProducts)
    .where(eq(collectionProducts.collectionId, id))
    .orderBy(asc(collectionProducts.position));
  return { ...collection, productIds: members.map((member) => member.productId) };
}

export async function saveCollection(id: string | null, data: CollectionInput) {
  await requireAdmin();
  const values = {
    ...normalizeTaxonomyInput(data),
    eyebrow: data.eyebrow?.trim() || null,
    isFeatured: data.isFeatured ?? false,
  };

  let previousSlug: string | null = null;
  const collectionId = await db.transaction(async (tx) => {
    let targetId = id;
    if (id) {
      const [existing] = await tx.select({ slug: collections.slug }).from(collections).where(eq(collections.id, id));
      if (!existing) throw new Error("Collection not found");
      previousSlug = existing.slug;
      await tx.update(collections).set({ ...values, updatedAt: new Date() }).where(eq(collections.id, id));
    } else {
      const [created] = await tx.insert(collections).values(values).returning({ id: collections.id });
      targetId = created.id;
    }

    if (data.productIds) {
      await tx.delete(collectionProducts).where(eq(collectionProducts.collectionId, targetId!));
      const unique = [...new Set(data.productIds)];
      if (unique.length > 0) {
        await tx.insert(collectionProducts).values(unique.map((productId, position) => ({ collectionId: targetId!, productId, position })));
      }
    }
    return targetId!;
  });

  if (data.productIds) {
    for (const productId of data.productIds) await refreshProductSearchText(productId);
  }

  revalidatePaths(getPublicTaxonomyMutationPaths({ collectionSlugs: [values.slug, ...(previousSlug ? [previousSlug] : [])] }));
  revalidatePath("/", "layout");
  return { success: true, id: collectionId };
}

export async function deleteCollection(id: string) {
  await requireAdmin();
  const [collection] = await db.select().from(collections).where(eq(collections.id, id));
  if (!collection) return { success: false, error: "Collection not found" };
  const members = await db.select({ productId: collectionProducts.productId }).from(collectionProducts).where(eq(collectionProducts.collectionId, id));
  await db.delete(collections).where(eq(collections.id, id));
  for (const member of members) await refreshProductSearchText(member.productId);
  revalidatePaths(getPublicTaxonomyMutationPaths({ collectionSlugs: [collection.slug] }));
  revalidatePath("/", "layout");
  return { success: true };
}

// ============================================
// COUPONS
// ============================================

export type CouponInput = {
  code: string;
  discountType: "fixed" | "percentage";
  discountValue: string;
  maxDiscount?: string;
  minOrderValue?: string;
  validFrom?: Date;
  validUntil?: Date;
  maxUses?: number;
  forNewUsersOnly?: boolean;
  userId?: string;
  isBargainGenerated?: boolean;
  isActive?: boolean;
};

function assertCouponValues(data: Partial<CouponInput>) {
  if (data.code !== undefined && !/^[A-Z0-9-]{3,32}$/i.test(data.code.trim())) {
    throw new Error("Coupon codes are 3–32 letters, numbers or hyphens");
  }
  if (data.discountValue !== undefined) {
    const value = Number(data.discountValue);
    if (!Number.isFinite(value) || value <= 0) throw new Error("Discount must be greater than zero");
    if (data.discountType === "percentage" && value > 100) throw new Error("Percentage discounts cannot exceed 100%");
  }
}

export async function createCoupon(data: CouponInput) {
  await requireAdmin();
  assertCouponValues(data);

  const [coupon] = await db
    .insert(coupons)
    .values({
      code: data.code.trim().toUpperCase(),
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxDiscount: data.maxDiscount,
      minOrderValue: data.minOrderValue,
      validFrom: data.validFrom || new Date(),
      validUntil: data.validUntil,
      maxUses: data.maxUses,
      forNewUsersOnly: data.forNewUsersOnly ?? false,
      userId: data.userId,
      isBargainGenerated: data.isBargainGenerated ?? false,
      isActive: data.isActive ?? true,
    })
    .returning();

  return coupon;
}

export async function updateCoupon(id: string, data: Partial<CouponInput>) {
  await requireAdmin();
  assertCouponValues(data);
  const [coupon] = await db
    .update(coupons)
    .set({ ...data, ...(data.code ? { code: data.code.trim().toUpperCase() } : {}) })
    .where(eq(coupons.id, id))
    .returning();
  return coupon;
}

export async function deleteCoupon(id: string) {
  await requireAdmin();
  await db.delete(coupons).where(eq(coupons.id, id));
  return { success: true };
}

export async function getCoupons(options?: { isActive?: boolean }) {
  await requireAdmin();
  const conditions = [];
  if (options?.isActive !== undefined) conditions.push(eq(coupons.isActive, options.isActive));
  return db
    .select()
    .from(coupons)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(coupons.createdAt));
}

// ============================================
// ORDERS
// ============================================

export async function getOrders(options?: {
  status?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}) {
  await requireAdmin();
  const conditions = [];
  if (options?.status && (orders.status.enumValues as readonly string[]).includes(options.status)) {
    conditions.push(eq(orders.status, options.status as OrderStatus));
  }
  if (options?.userId) conditions.push(eq(orders.userId, options.userId));

  return db
    .select()
    .from(orders)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(options?.limit || 50)
    .offset(options?.offset || 0);
}

export async function getOrderById(id: string) {
  await requireAdmin();
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return null;
  const [items, customer, storeCredits] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    order.userId
      ? db.select({ id: user.id, name: user.name, email: user.email, ordersCount: user.ordersCount }).from(user).where(eq(user.id, order.userId))
      : Promise.resolve([]),
    order.userId
      ? db.select().from(coupons).where(and(eq(coupons.userId, order.userId), ilike(coupons.code, `CREDIT-%`))).orderBy(desc(coupons.createdAt))
      : Promise.resolve([]),
  ]);
  return { ...order, items, customer: customer[0] ?? null, storeCredits };
}

const CANCELLABLE_STATUSES: OrderStatus[] = ["pending", "confirmed", "processing"];

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  shipping?: { courier?: string; trackingNumber?: string },
) {
  await requireAdmin();
  if (!(orders.status.enumValues as readonly string[]).includes(status)) throw new Error("Invalid status");

  const [current] = await db.select().from(orders).where(eq(orders.id, id));
  if (!current) throw new Error("Order not found");
  if (current.status === status && !shipping) return current;
  if (current.status === "cancelled") throw new Error("Cancelled orders cannot be reopened");

  const touched = new Set<string>();
  const order = await db.transaction(async (tx) => {
    if (status === "cancelled") {
      if (!CANCELLABLE_STATUSES.includes(current.status)) {
        throw new Error("Only orders that haven't shipped can be cancelled");
      }
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id));
      for (const item of items) {
        const restored = await restoreStock(tx, item);
        if (restored) touched.add(restored);
      }
      if (current.userId) {
        await tx
          .update(user)
          .set({
            ordersCount: sql`GREATEST(${user.ordersCount} - 1, 0)`,
            totalSpent: sql`GREATEST(${user.totalSpent} - ${Number(current.total)}, 0)`,
          })
          .where(eq(user.id, current.userId));
      }
    }

    const [updated] = await tx
      .update(orders)
      .set({
        status,
        ...(status === "delivered" && current.paymentMethod === "cod" ? { paymentStatus: "paid" } : {}),
        ...(status === "cancelled"
          ? { paymentStatus: current.paymentStatus === "paid" ? "refund_due" : "cancelled" }
          : {}),
        ...(shipping?.courier !== undefined ? { courier: shipping.courier.trim() || null } : {}),
        ...(shipping?.trackingNumber !== undefined ? { trackingNumber: shipping.trackingNumber.trim() || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  });

  if (touched.size > 0) {
    const rows = await db.select({ slug: products.slug, category: products.category }).from(products).where(inArray(products.id, [...touched]));
    for (const row of rows) revalidatePaths(getPublicProductMutationPaths({ nextSlug: row.slug, categorySlugs: [row.category] }));
  }

  if (current.status !== status) {
    sendOrderStatusEmail(id).catch((error) => console.error("Order status email failed:", error instanceof Error ? error.message : error));
  }
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  return order;
}

/** Marks a card refund as completed after it was issued in the provider dashboard. */
export async function markOrderRefunded(id: string) {
  await requireAdmin();
  const [order] = await db
    .update(orders)
    .set({ paymentStatus: "refunded", updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning();
  revalidatePath(`/admin/orders/${id}`);
  return order;
}

// ============================================
// STORE CREDIT (refunds / goodwill as single-use credit codes)
// ============================================

export async function issueStoreCredit(data: { orderId: string; amount: number; reason: string; validDays?: number }) {
  await requireAdmin();
  const amount = Math.round(Number(data.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a credit amount greater than zero");
  if (!data.reason?.trim()) throw new Error("Add a reason for the credit");

  const [order] = await db.select().from(orders).where(eq(orders.id, data.orderId));
  if (!order?.userId) throw new Error("Store credit needs an order placed by a registered customer");
  if (amount > Number(order.total)) throw new Error("Credit cannot exceed the order total");

  const code = `CREDIT-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const validUntil = new Date(Date.now() + (data.validDays ?? 180) * 24 * 60 * 60 * 1000);

  const [coupon] = await db
    .insert(coupons)
    .values({
      code,
      discountType: "fixed",
      discountValue: amount.toFixed(2),
      maxUses: 1,
      userId: order.userId,
      validUntil,
      isActive: true,
    })
    .returning();

  revalidatePath(`/admin/orders/${data.orderId}`);
  return { success: true, coupon };
}

// ============================================
// CUSTOMERS
// ============================================

export async function getCustomers(options?: { search?: string; limit?: number; offset?: number }) {
  await requireAdmin();
  const conditions = [];
  if (options?.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(or(ilike(user.name, term), ilike(user.email, term), ilike(user.phone, term))!);
  }
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      ordersCount: user.ordersCount,
      totalSpent: user.totalSpent,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
    })
    .from(user)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0);
}

export async function getNewsletterSubscribers() {
  await requireAdmin();
  return db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt)).limit(500);
}

// ============================================
// DASHBOARD
// ============================================

export async function getDashboardStats(timeframe: "7d" | "30d" | "all" = "30d") {
  await requireAdmin();

  const dateLimit = timeframe === "7d"
    ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : timeframe === "30d"
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      : null;

  const orderConditions = dateLimit ? [gte(orders.createdAt, dateLimit)] : [];
  // Revenue counts orders that are paid or delivered and not cancelled.
  const revenueConditions = [
    sql`${orders.status} <> 'cancelled'`,
    or(eq(orders.paymentStatus, "paid"), eq(orders.status, "delivered"))!,
    ...orderConditions,
  ];

  const [
    [{ count: totalProducts }],
    [{ count: totalOrders }],
    [{ sum: totalRevenue }],
    [{ count: activeCoupons }],
    [{ count: lowStock }],
    [{ count: attention }],
    recentOrders,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.isActive, true)),
    db.select({ count: sql<number>`count(*)` }).from(orders).where(orderConditions.length > 0 ? and(...orderConditions) : undefined),
    db.select({ sum: sql<string>`COALESCE(sum(total), 0)` }).from(orders).where(and(...revenueConditions)),
    db.select({ count: sql<number>`count(*)` }).from(coupons).where(and(eq(coupons.isActive, true), eq(coupons.isBargainGenerated, false))),
    db.select({ count: sql<number>`count(*)` }).from(products).where(and(eq(products.isActive, true), sql`${products.stock} <= 3`)),
    db.select({ count: sql<number>`count(*)` }).from(checkoutSessions).where(eq(checkoutSessions.status, "paid_unfulfilled")),
    db
      .select({
        id: orders.id,
        total: orders.total,
        status: orders.status,
        createdAt: orders.createdAt,
        shippingAddress: orders.shippingAddress,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(5),
  ]);

  return {
    totalProducts: Number(totalProducts),
    totalOrders: Number(totalOrders),
    totalRevenue: parseFloat(totalRevenue || "0"),
    activeCoupons: Number(activeCoupons),
    lowStockProducts: Number(lowStock),
    paidUnfulfilledCheckouts: Number(attention),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      total: parseFloat(order.total || "0"),
      status: order.status,
      createdAt: order.createdAt,
      customerName: order.shippingAddress
        ? `${order.shippingAddress.firstName ?? ""} ${order.shippingAddress.lastName ?? ""}`.trim() || "Customer"
        : "Customer",
    })),
  };
}

/** Card payments captured but not turned into orders (stock ran out meanwhile) — need a refund. */
export async function getPaidUnfulfilledCheckouts() {
  await requireAdmin();
  return db
    .select()
    .from(checkoutSessions)
    .where(eq(checkoutSessions.status, "paid_unfulfilled"))
    .orderBy(desc(checkoutSessions.updatedAt))
    .limit(50);
}
