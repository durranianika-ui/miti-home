"use client";

import { useId, useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProductsPage } from "@/lib/actions/admin";
import { ADMIN_PRODUCTS_PAGE_SIZE } from "@/lib/admin-products-pagination";
import { ADMIN_QUERY_OPTIONS } from "@/lib/admin-query-options";
import { normalizeProductImage } from "@/lib/image";
import { formatPrice } from "@/lib/money";
import { deleteProductAction } from "../_lib/actions";
import { inputClass } from "../_lib/format";
import { invalidateProductSurfaces } from "../_lib/query";

type AdminProductsPage = Awaited<ReturnType<typeof getProductsPage>>;
type AdminProduct = AdminProductsPage["products"][number];

const LOW_STOCK = 3;

export function AdminProductsClient({
  initialPage,
  categories,
}: {
  initialPage: AdminProductsPage;
  categories: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const uid = useId();
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [visibility, setVisibility] = useState<"" | "visible" | "hidden">("");
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const isDefaultView = !search && !category && !visibility;

  const categoryNames = useMemo(
    () => new Map(categories.map((option) => [option.slug, option.name])),
    [categories],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } = useInfiniteQuery({
    queryKey: ["admin-products", { search, category, visibility }],
    queryFn: ({ pageParam }) =>
      getProductsPage({
        limit: ADMIN_PRODUCTS_PAGE_SIZE,
        offset: pageParam,
        search: search || undefined,
        category: category || undefined,
        isActive: visibility === "" ? undefined : visibility === "visible",
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    ...ADMIN_QUERY_OPTIONS,
    initialData: isDefaultView ? { pages: [initialPage], pageParams: [0] } : undefined,
  });

  const products = useMemo(() => data?.pages.flatMap((page) => page.products) ?? [], [data]);

  const deleteMutation = useMutation({
    mutationFn: deleteProductAction,
    onSuccess: (result, productId) => {
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setMessage({
        tone: "info",
        text: result.data.archived
          ? "Product has order history, so it was hidden from the store instead of deleted."
          : "Product deleted.",
      });
      invalidateProductSurfaces(queryClient, productId);
      router.refresh();
    },
    onError: () => setMessage({ tone: "error", text: "Failed to delete product." }),
  });

  const handleDelete = (product: AdminProduct) => {
    if (!confirm(`Delete "${product.name}"? Products with past orders are hidden instead of deleted.`)) return;
    setMessage(null);
    deleteMutation.mutate(product.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage the Miti Home catalogue</p>
        </div>
        <Button asChild className="bg-brand text-neutral-950 hover:bg-brand/90">
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" />
            Add product
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-3 md:flex-row md:items-end">
        <form
          role="search"
          className="flex flex-1 items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchDraft.trim());
          }}
        >
          <div className="flex-1 space-y-1">
            <label htmlFor={`${uid}-search`} className="text-xs font-medium text-muted-foreground">
              Search name, slug or SKU
            </label>
            <input
              id={`${uid}-search`}
              type="search"
              value={searchDraft}
              onChange={(event) => {
                setSearchDraft(event.target.value);
                if (event.target.value === "") setSearch("");
              }}
              className={inputClass}
              placeholder="e.g. vase"
            />
          </div>
          <Button type="submit" variant="outline" aria-label="Search products">
            <Search className="h-4 w-4" />
          </Button>
          {search && (
            <Button
              type="button"
              variant="ghost"
              aria-label="Clear search"
              onClick={() => {
                setSearch("");
                setSearchDraft("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </form>
        <div className="space-y-1 md:w-56">
          <label htmlFor={`${uid}-category`} className="text-xs font-medium text-muted-foreground">
            Category
          </label>
          <select
            id={`${uid}-category`}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={inputClass}
          >
            <option value="">All categories</option>
            {categories.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 md:w-44">
          <label htmlFor={`${uid}-visibility`} className="text-xs font-medium text-muted-foreground">
            Visibility
          </label>
          <select
            id={`${uid}-visibility`}
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as typeof visibility)}
            className={inputClass}
          >
            <option value="">All</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>

      {message && (
        <div
          role={message.tone === "error" ? "alert" : "status"}
          className={
            message.tone === "error"
              ? "rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              : "rounded-lg border border-border bg-muted p-3 text-sm"
          }
        >
          {message.text}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th scope="col" className="p-3 font-medium">Product</th>
              <th scope="col" className="p-3 font-medium">Category</th>
              <th scope="col" className="p-3 font-medium">Price</th>
              <th scope="col" className="p-3 font-medium">Stock</th>
              <th scope="col" className="p-3 font-medium">Visibility</th>
              <th scope="col" className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  {isFetching ? "Loading…" : isDefaultView ? "No products yet. Add your first product to get started." : "No products match these filters."}
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const isDeleting = deleteMutation.isPending && deleteMutation.variables === product.id;
                const onSale = Number(product.mrp) > Number(product.sellingPrice);
                return (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] ? (
                          <Image
                            src={normalizeProductImage(product.images[0])}
                            alt=""
                            width={48}
                            height={48}
                            className="h-12 w-12 shrink-0 rounded object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="h-12 w-12 shrink-0 rounded bg-muted" aria-hidden="true" />
                        )}
                        <div className="min-w-0">
                          <Link href={`/admin/products/${product.id}`} className="line-clamp-1 font-medium hover:underline">
                            {product.name}
                          </Link>
                          <div className="line-clamp-1 text-xs text-muted-foreground">
                            {product.sku ? `${product.sku} · ` : ""}
                            {product.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{categoryNames.get(product.category) ?? product.category}</td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-medium">{formatPrice(product.sellingPrice)}</div>
                      {onSale && (
                        <div className="text-xs text-muted-foreground line-through">{formatPrice(product.mrp)}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={
                          product.stock === 0
                            ? "font-semibold text-destructive"
                            : product.stock <= LOW_STOCK
                              ? "font-semibold text-yellow-700 dark:text-yellow-400"
                              : ""
                        }
                      >
                        {product.stock}
                      </span>
                      {product.stock === 0 ? (
                        <span className="ml-1 text-xs text-destructive">Sold out</span>
                      ) : product.stock <= LOW_STOCK ? (
                        <span className="ml-1 text-xs text-yellow-700 dark:text-yellow-400">Low</span>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {product.isActive ? (
                          <span className="inline-flex rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-400">
                            Visible
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Hidden</span>
                        )}
                        {product.isNew && (
                          <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs text-foreground">New</span>
                        )}
                        {product.isFeatured && (
                          <span className="inline-flex rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand-strong">
                            Best seller
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" aria-label={`View ${product.name} in store`}>
                          <Link href={`/product/${product.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon" aria-label={`Edit ${product.name}`}>
                          <Link href={`/admin/products/${product.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product)}
                          disabled={isDeleting}
                          className="text-destructive hover:text-destructive"
                          aria-label={`Delete ${product.name}`}
                        >
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex min-h-12 items-center justify-center gap-3 text-sm text-muted-foreground">
        {hasNextPage ? (
          <Button variant="outline" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
            Load more products
          </Button>
        ) : products.length > 0 ? (
          `${products.length} product${products.length === 1 ? "" : "s"}`
        ) : null}
      </div>
    </div>
  );
}
