/**
 * Homepage merchandising — the editorial content the team changes most often.
 * Imagery comes from /public/products (the Miti Home catalogue photography).
 * Product references use slugs; missing or inactive products are skipped.
 */

export type HeroSlide = {
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
  cta: string;
  href: string;
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    src: "/products/resting-figures-sculpture-pair/1.webp",
    alt: "Two terracotta abstract figure sculptures leaning together beside a stack of books",
    eyebrow: "Beautiful spaces · A better you",
    title: "A more beautiful everyday",
    cta: "Shop sculptural forms",
    href: "/collections/sculptural-forms",
  },
  {
    src: "/products/deer-family-sculpture-set/2.webp",
    alt: "Three mirror-silver deer sculptures glowing in a warm-lit niche",
    eyebrow: "The Silver Edit",
    title: "Pieces that catch the light",
    cta: "Discover the edit",
    href: "/collections/the-silver-edit",
  },
  {
    src: "/products/smoked-glass-ambient-table-lamp/1.webp",
    alt: "Smoked glass table lamp glowing on a walnut sideboard",
    eyebrow: "Soft Glow",
    title: "Light, softened",
    cta: "Shop lighting",
    href: "/shop/lighting",
  },
  {
    src: "/products/vanity-tissue-tray-organiser/1.webp",
    alt: "Cream vanity tray with tissues, a diffuser and perfume bottles on a coffee table",
    eyebrow: "Curated, not crowded",
    title: "Order, beautifully",
    cta: "Smart storage",
    href: "/shop/smart-storage",
  },
  {
    src: "/products/astronaut-digital-clock/1.webp",
    alt: "White astronaut figure holding a large digital clock on a desk",
    eyebrow: "Why didn't I have this before?",
    title: "Clever, useful, unexpected",
    cta: "Clever finds",
    href: "/shop/clever-finds",
  },
];

export type SpaceDefinition = {
  id: string;
  title: string;
  image: string;
  video?: string;
  productSlugs: string[];
};

export const SHOP_THE_SPACE: SpaceDefinition[] = [
  {
    id: "console",
    title: "The console",
    image: "/products/horse-and-rider-sculpture/1.webp",
    productSlugs: ["horse-and-rider-sculpture", "knotted-stripe-vase"],
  },
  {
    id: "vanity",
    title: "The vanity",
    image: "/products/vanity-tissue-tray-organiser/1.webp",
    productSlugs: ["vanity-tissue-tray-organiser", "mirror-bear-figurine"],
  },
  {
    id: "reading-corner",
    title: "The reading corner",
    image: "/products/geometric-embroidered-cushion-cover/1.webp",
    productSlugs: ["geometric-embroidered-cushion-cover", "smoked-glass-ambient-table-lamp"],
  },
  {
    id: "study",
    title: "The study",
    image: "/products/kinetic-perpetual-motion-sculpture/1.webp",
    productSlugs: ["kinetic-perpetual-motion-sculpture", "astronaut-digital-clock"],
  },
  {
    id: "bedside",
    title: "The bedside",
    image: "/products/teardrop-smoked-glass-pendant/1.webp",
    productSlugs: ["teardrop-smoked-glass-pendant", "glass-dome-propagation-vase"],
  },
];

export const EDITORIAL_STORY = {
  eyebrow: "The edit",
  title: "Sculptural Forms",
  body:
    "Soft silhouettes, figurative ceramics and art objects with a gallery feel — chosen to bring a quiet sense of calm to consoles, shelves and coffee tables.",
  cta: "Explore the collection",
  href: "/collections/sculptural-forms",
  images: [
    { src: "/products/resting-figures-sculpture-pair/2.webp", alt: "Monochrome abstract figure sculptures on a stack of books" },
    { src: "/products/deer-family-sculpture-set/1.webp", alt: "Matte ceramic deer family sculptures in earth tones" },
  ],
};

export const LIFESTYLE_BANNER = {
  image: "/products/deer-family-sculpture-set/2.webp",
  alt: "Mirror-silver deer sculptures glowing against a warm gold wall",
  eyebrow: "Luxury Living",
  title: "Beautiful spaces. A better you.",
  cta: "Shop the collection",
  href: "/shop",
};

export const FEATURED_COLLECTION_SLUG = "the-silver-edit";

export const MARQUEE_PHRASES = ["Curated, not crowded", "Beautiful spaces", "A better you", "Quality over quantity", "Delivered across the UAE"];
