export type SearchSuggestionProductSource = {
  id: string;
  name: string;
  category: string;
  categoryName?: string | null;
  tags?: string[] | null;
  material?: string | null;
  features?: string[] | null;
  colors?: { name: string; hex?: string; images?: string[] }[] | null;
  isNew?: boolean | null;
  isFeatured?: boolean | null;
  displayOrder?: number | null;
  stock: number;
  searchText?: string | null;
};

type MerchandisingPoolInput<T extends SearchSuggestionProductSource> = {
  featuredProducts: T[];
  newProducts: T[];
  displayOrderProducts: T[];
  seed: string;
  limit?: number;
};

type PhraseInput = {
  products: SearchSuggestionProductSource[];
  seed: string;
  limit?: number;
  minMatches?: number;
  query?: string;
};

/**
 * Product-type nouns worth suggesting ("vases", "tissue boxes"). Tags that are
 * adjectives or occasions (gift, silver, playful…) are combined with these
 * rather than suggested on their own.
 */
const PRODUCT_NOUNS: Record<string, string> = {
  vase: "vases",
  "bud vase": "bud vases",
  sculpture: "sculptures",
  figurine: "figurines",
  "tissue box": "tissue boxes",
  lamp: "lamps",
  "table lamp": "table lamps",
  pendant: "pendant lights",
  lighting: "lighting",
  cushion: "cushions",
  tray: "trays",
  hooks: "hooks",
  shelf: "shelves",
  clock: "clocks",
  mug: "mugs",
  bookends: "bookends",
  ornament: "ornaments",
  desk: "desks",
  keyring: "keyrings",
};

const DESCRIPTOR_STOP_TOKENS = new Set(["premium", "miti", "home", "standard"]);

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: string) {
  let state = hashString(seed || "miti-search-suggestions");
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: string) {
  const shuffled = [...items];
  const random = createSeededRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function mergeMerchandisingSuggestionPool<T extends SearchSuggestionProductSource>({
  featuredProducts,
  newProducts,
  displayOrderProducts,
  seed,
  limit = 3,
}: MerchandisingPoolInput<T>) {
  const byId = new Map<string, T>();

  for (const product of [...featuredProducts, ...newProducts, ...displayOrderProducts]) {
    if (product.stock <= 0 || byId.has(product.id)) continue;
    byId.set(product.id, product);
  }

  return seededShuffle(Array.from(byId.values()), seed).slice(0, limit);
}

function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function cleanDescriptor(value: string) {
  const words = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z\s-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 2 && !DESCRIPTOR_STOP_TOKENS.has(word.toLowerCase()));

  return titleCase(words.join(" "));
}

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function phraseWords(phrase: string) {
  return normalize(phrase)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.endsWith("ves") && word.length > 4) return word.slice(0, -3);
      if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
      if (word.endsWith("xes")) return word.slice(0, -2);
      if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
      return word;
    });
}

function productHaystack(product: SearchSuggestionProductSource) {
  return normalize([
    product.name,
    product.categoryName,
    product.category,
    product.material,
    product.searchText,
    ...(product.tags || []),
    ...(product.features || []),
    ...(product.colors || []).map((color) => color.name),
    product.isNew ? "new" : "",
  ].filter(Boolean).join(" "));
}

function countPhraseMatches(phrase: string, products: SearchSuggestionProductSource[]) {
  const words = phraseWords(phrase);
  return products.filter((product) => {
    const haystack = productHaystack(product);
    return words.every((word) => haystack.includes(word));
  }).length;
}

function addPhrase(candidatePhrases: Set<string>, phrase: string) {
  const normalized = phrase.replace(/\s+/g, " ").trim();
  if (normalized.length > 2) candidatePhrases.add(normalized.charAt(0).toUpperCase() + normalized.slice(1));
}

function productNouns(product: SearchSuggestionProductSource) {
  return (product.tags || [])
    .map((tag) => PRODUCT_NOUNS[tag.toLowerCase()])
    .filter((noun): noun is string => Boolean(noun));
}

export function buildGeneralSearchPhrases({
  products,
  seed,
  limit = 4,
  minMatches = 2,
  query,
}: PhraseInput) {
  const activeProducts = products.filter((product) => product.stock > 0);
  const exactProductNames = new Set(activeProducts.map((product) => normalize(product.name)));
  const candidates = new Set<string>();

  for (const product of activeProducts) {
    if (product.categoryName) addPhrase(candidates, product.categoryName);
    const nouns = productNouns(product);

    for (const noun of nouns) {
      addPhrase(candidates, noun);
      if (product.isNew) addPhrase(candidates, `New ${noun}`);

      for (const color of product.colors || []) {
        const colorName = cleanDescriptor(color.name);
        if (colorName) addPhrase(candidates, `${colorName} ${noun}`);
      }

      if (product.material) {
        const primaryMaterial = cleanDescriptor(product.material.split(/,|with|&/i)[0] ?? "");
        if (primaryMaterial && primaryMaterial.split(" ").length <= 2) addPhrase(candidates, `${primaryMaterial} ${noun}`);
      }
    }
  }

  const normalizedQuery = normalize(query || "");
  const validated = Array.from(candidates).filter((phrase) => {
    if (exactProductNames.has(normalize(phrase))) return false;
    if (countPhraseMatches(phrase, activeProducts) < minMatches) return false;
    if (!normalizedQuery) return true;
    return normalize(phrase).includes(normalizedQuery);
  });

  return seededShuffle(validated, seed).slice(0, limit);
}
