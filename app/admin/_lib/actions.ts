"use server";

/**
 * Thin wrappers around lib/actions/admin.ts that turn thrown validation errors
 * into `{ ok: false, error }` results. In production Next.js redacts the
 * message of errors thrown from server actions, so returning them is the only
 * way to show the admin *why* a save failed ("Price cannot be higher than the
 * compare-at price", "Category … does not exist", …).
 */
import { revalidatePath } from "next/cache";
import {
  createProduct,
  deleteCategory,
  deleteCollection,
  deleteProduct,
  issueStoreCredit,
  markOrderRefunded,
  saveCategory,
  saveCollection,
  updateOrderStatus,
  updateProduct,
  updateVariantStock,
  type CategoryInput,
  type CollectionInput,
  type ProductInput,
} from "@/lib/actions/admin";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function failure(error: unknown, fallback: string): { ok: false; error: string } {
  if (error instanceof Error && error.message) {
    // Unique-constraint violations from Postgres are not user friendly.
    if (/duplicate key|unique constraint/i.test(error.message)) {
      if (/slug/i.test(error.message)) return { ok: false, error: "That slug is already in use. Choose another." };
      return { ok: false, error: "A record with that value already exists." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: false, error: fallback };
}

export async function saveProductAction(
  id: string | null,
  input: ProductInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const product = id ? await updateProduct(id, input) : await createProduct(input);
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    return { ok: true, data: { id: product.id, slug: product.slug } };
  } catch (error) {
    return failure(error, "Could not save the product.");
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult<{ archived: boolean }>> {
  try {
    const result = await deleteProduct(id);
    revalidatePath("/admin/products");
    return { ok: true, data: { archived: result.archived } };
  } catch (error) {
    return failure(error, "Could not delete the product.");
  }
}

export async function updateVariantStockAction(variantId: string, stock: number): Promise<ActionResult<{ total: number }>> {
  try {
    const result = await updateVariantStock(variantId, stock);
    return { ok: true, data: { total: result.total } };
  } catch (error) {
    return failure(error, "Could not update stock.");
  }
}

export async function saveCategoryAction(id: string | null, input: CategoryInput): Promise<ActionResult> {
  try {
    await saveCategory(id, input);
    revalidatePath("/admin/categories");
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error, "Could not save the category.");
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    const result = await deleteCategory(id);
    if (!result.success) return { ok: false, error: result.error ?? "Could not delete the category." };
    revalidatePath("/admin/categories");
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error, "Could not delete the category.");
  }
}

export async function saveCollectionAction(id: string | null, input: CollectionInput): Promise<ActionResult<{ id: string }>> {
  try {
    const result = await saveCollection(id, input);
    revalidatePath("/admin/collections");
    return { ok: true, data: { id: result.id } };
  } catch (error) {
    return failure(error, "Could not save the collection.");
  }
}

export async function deleteCollectionAction(id: string): Promise<ActionResult> {
  try {
    const result = await deleteCollection(id);
    if (!result.success) return { ok: false, error: result.error ?? "Could not delete the collection." };
    revalidatePath("/admin/collections");
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error, "Could not delete the collection.");
  }
}

type OrderStatus = Parameters<typeof updateOrderStatus>[1];

export async function updateOrderStatusAction(
  id: string,
  status: OrderStatus,
  shipping?: { courier?: string; trackingNumber?: string },
): Promise<ActionResult> {
  try {
    await updateOrderStatus(id, status, shipping);
    revalidatePath("/admin");
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error, "Could not update the order.");
  }
}

export async function markOrderRefundedAction(id: string): Promise<ActionResult> {
  try {
    await markOrderRefunded(id);
    revalidatePath("/admin/orders");
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error, "Could not mark the order as refunded.");
  }
}

export async function issueStoreCreditAction(input: {
  orderId: string;
  amount: number;
  reason: string;
  validDays?: number;
}): Promise<ActionResult<{ code: string }>> {
  try {
    const result = await issueStoreCredit(input);
    return { ok: true, data: { code: result.coupon.code } };
  } catch (error) {
    return failure(error, "Could not issue store credit.");
  }
}
