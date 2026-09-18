import type { getProducts } from "@/lib/actions/admin";

export type PickerProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  category: string;
  image: string | null;
  isActive: boolean;
};

/** Trims full product rows down to what the collection membership picker needs. */
export function toPickerProducts(rows: Awaited<ReturnType<typeof getProducts>>): PickerProduct[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    category: row.category,
    image: row.images?.[0] ?? null,
    isActive: row.isActive,
  }));
}
