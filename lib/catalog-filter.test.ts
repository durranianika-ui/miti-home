import assert from "node:assert/strict";
import { test } from "node:test";
import { filterCatalogProducts, isOnSale, type FilterableProduct } from "./catalog-filter.ts";

type TestProduct = FilterableProduct & { id: string };

function product(overrides: Partial<TestProduct>): TestProduct {
  return {
    id: "product-id",
    name: "Product",
    sellingPrice: "199.00",
    mrp: "199.00",
    category: "home-decor",
    isNew: false,
    isFeatured: false,
    stock: 10,
    ...overrides,
  };
}

test("filterCatalogProducts returns best sellers and new arrivals when requested", () => {
  const products = [
    product({ id: "regular" }),
    product({ id: "featured", isFeatured: true }),
    product({ id: "new", isNew: true }),
  ];

  assert.deepEqual(filterCatalogProducts(products, { isFeatured: true }).map((item) => item.id), ["featured"]);
  assert.deepEqual(filterCatalogProducts(products, { isNew: true }).map((item) => item.id), ["new"]);
});

test("filterCatalogProducts narrows by category, sale price and search query", () => {
  const products = [
    product({ id: "lamp", name: "Smoked Glass Table Lamp", category: "lighting" }),
    product({ id: "vase", name: "Knotted Stripe Vase", mrp: "249.00", sellingPrice: "199.00" }),
  ];

  assert.deepEqual(filterCatalogProducts(products, { category: "lighting" }).map((item) => item.id), ["lamp"]);
  assert.deepEqual(filterCatalogProducts(products, { onSale: true }).map((item) => item.id), ["vase"]);
  assert.deepEqual(filterCatalogProducts(products, { searchQuery: "VASE" }).map((item) => item.id), ["vase"]);
  assert.equal(isOnSale(products[0]), false);
});

test("filterCatalogProducts can surface in-stock pieces first and apply a limit", () => {
  const products = [
    product({ id: "sold-out", stock: 0, isFeatured: true }),
    product({ id: "a", isFeatured: true }),
    product({ id: "b", isFeatured: true }),
  ];

  assert.deepEqual(
    filterCatalogProducts(products, { isFeatured: true, inStockFirst: true, limit: 2 }).map((item) => item.id),
    ["a", "b"],
  );
});
