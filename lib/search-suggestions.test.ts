import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildGeneralSearchPhrases,
  mergeMerchandisingSuggestionPool,
  seededShuffle,
  type SearchSuggestionProductSource,
} from "./search-suggestions.ts";

const baseProduct: SearchSuggestionProductSource = {
  id: "product-1",
  name: "Knotted Stripe Vase",
  category: "home-decor",
  categoryName: "Home Décor",
  tags: ["vase"],
  material: null,
  features: [],
  colors: [],
  isNew: false,
  isFeatured: false,
  displayOrder: 0,
  stock: 1,
  searchText: "Knotted Stripe Vase home decor vase ceramic",
};

test("seeded shuffle changes with different seeds and is stable for the same seed", () => {
  const items = ["a", "b", "c", "d", "e"];

  assert.deepEqual(seededShuffle(items, "open-1"), seededShuffle(items, "open-1"));
  assert.notDeepEqual(seededShuffle(items, "open-1"), seededShuffle(items, "open-2"));
});

test("merchandising suggestion pool merges best-seller, new and display buckets, dedupes, excludes sold out, and returns three", () => {
  const result = mergeMerchandisingSuggestionPool({
    seed: "overlay-open",
    limit: 3,
    featuredProducts: [
      { ...baseProduct, id: "featured", isFeatured: true },
      { ...baseProduct, id: "duplicate", isFeatured: true },
      { ...baseProduct, id: "sold-out", isFeatured: true, stock: 0 },
    ],
    newProducts: [
      { ...baseProduct, id: "new", isNew: true },
      { ...baseProduct, id: "duplicate", isNew: true },
    ],
    displayOrderProducts: [
      { ...baseProduct, id: "display", displayOrder: 1000 },
      { ...baseProduct, id: "featured", displayOrder: 900 },
    ],
  });

  assert.equal(result.length, 3);
  assert.equal(new Set(result.map((product) => product.id)).size, 3);
  assert.equal(result.some((product) => product.id === "sold-out"), false);
});

test("phrase suggestions combine finishes and materials with product types and skip exact names", () => {
  const silverTissueBoxes = Array.from({ length: 2 }, (_, index) => ({
    ...baseProduct,
    id: `tissue-${index}`,
    name: `Sculpted Tissue Box ${index}`,
    tags: ["tissue box", "silver"],
    material: "Silver-plated ceramic",
    colors: [{ name: "Mirror Silver", hex: "#C0C0C0" }],
    searchText: `Sculpted Tissue Box ${index} tissue box silver ceramic mirror silver`,
  }));

  const phrases = buildGeneralSearchPhrases({
    products: [...silverTissueBoxes, { ...baseProduct, id: "single" }],
    seed: "phrase-open",
    limit: 20,
    minMatches: 2,
  });

  assert.ok(phrases.includes("Tissue boxes"));
  assert.ok(phrases.includes("Mirror Silver tissue boxes"));
  assert.ok(phrases.includes("Silver-plated Ceramic tissue boxes") || phrases.includes("Silver-plated tissue boxes") || phrases.some((phrase) => /ceramic tissue boxes/i.test(phrase)));
  assert.equal(phrases.includes("Sculpted Tissue Box 1"), false);
  // A single vase does not meet the two-match threshold.
  assert.equal(phrases.includes("Vases"), false);
});

test("phrase suggestions filter by the typed query and never leak digits or symbols", () => {
  const lamps = Array.from({ length: 3 }, (_, index) => ({
    ...baseProduct,
    id: `lamp-${index}`,
    name: `Glow Lamp ${index}`,
    category: "lighting",
    categoryName: "Lighting",
    tags: ["lamp"],
    material: "Smoked glass",
    searchText: `Glow Lamp ${index} lighting lamp smoked glass`,
  }));

  const phrases = buildGeneralSearchPhrases({ products: lamps, seed: "q", limit: 10, minMatches: 2, query: "lamp" });

  assert.ok(phrases.length > 0);
  assert.ok(phrases.every((phrase) => phrase.toLowerCase().includes("lamp")));
  assert.equal(phrases.some((phrase) => /[%\d]/.test(phrase)), false);
});
