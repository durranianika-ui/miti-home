import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCategoryPath,
  buildCollectionPath,
  getPublicComboMutationPaths,
  getPublicProductMutationPaths,
  getPublicTaxonomyMutationPaths,
} from "./public-cache.ts";

test("product mutations invalidate storefront listings, taxonomy and slug pages", () => {
  assert.deepEqual(
    getPublicProductMutationPaths({
      nextSlug: "moai-tissue-box-silver",
      previousSlug: "moai-tissue-box",
      categorySlugs: ["home-decor"],
      collectionSlugs: ["the-silver-edit"],
    }),
    [
      "/",
      "/shop",
      "/new",
      "/best-sellers",
      "/sale",
      "/collections",
      "/gallery",
      "/sitemap.xml",
      "/feeds/google-merchant.xml",
      "/product/moai-tissue-box-silver",
      "/product/moai-tissue-box",
      "/shop/home-decor",
      "/collections/the-silver-edit",
    ],
  );
});

test("product mutation paths are deduped when the slug is unchanged", () => {
  assert.deepEqual(
    getPublicProductMutationPaths({ nextSlug: "same", previousSlug: "same", categorySlugs: ["a", "a"] })
      .filter((path) => path === "/product/same" || path === "/shop/a"),
    ["/product/same", "/shop/a"],
  );
});

test("combo and taxonomy mutations invalidate the right public paths", () => {
  assert.deepEqual(getPublicComboMutationPaths("combo-1"), ["/", "/shop", "/combo/combo-1"]);
  assert.deepEqual(getPublicTaxonomyMutationPaths({ categorySlugs: ["lighting"], collectionSlugs: ["soft-glow"] }), [
    "/",
    "/shop",
    "/collections",
    "/sitemap.xml",
    "/shop/lighting",
    "/collections/soft-glow",
  ]);
  assert.equal(buildCategoryPath("smart-storage"), "/shop/smart-storage");
  assert.equal(buildCollectionPath("the-silver-edit"), "/collections/the-silver-edit");
});
