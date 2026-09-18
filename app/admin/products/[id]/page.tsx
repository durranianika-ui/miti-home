import { notFound } from "next/navigation";
import {
  getAdminCategories,
  getAdminCollections,
  getProductById,
  getProductVariants,
} from "@/lib/actions/admin";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const [product, variants, categories, collections] = await Promise.all([
    getProductById(id),
    getProductVariants(id),
    getAdminCategories(),
    getAdminCollections(),
  ]);

  if (!product) notFound();

  return (
    <ProductForm
      key={product.id}
      initial={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.description,
        mrp: product.mrp,
        sellingPrice: product.sellingPrice,
        maxBargainDiscount: product.maxBargainDiscount,
        category: product.category,
        tags: product.tags,
        images: product.images,
        material: product.material,
        dimensions: product.dimensions,
        careInstructions: product.careInstructions,
        features: product.features,
        sizeLabel: product.sizeLabel,
        colorLabel: product.colorLabel,
        sizes: product.sizes,
        colors: product.colors,
        isNew: product.isNew,
        isFeatured: product.isFeatured,
        isActive: product.isActive,
        displayOrder: product.displayOrder,
        collectionIds: product.collectionIds,
        variants: variants.map(({ size, color, stock }) => ({ size, color, stock })),
      }}
      categories={categories.map(({ slug, name, isActive }) => ({ slug, name, isActive }))}
      collections={collections.map(({ id: collectionId, name, isActive }) => ({ id: collectionId, name, isActive }))}
    />
  );
}
