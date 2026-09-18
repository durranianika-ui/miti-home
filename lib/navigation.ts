import { getNavigationCategories, getNavigationCollections } from "@/lib/taxonomy";
import { buildCategoryPath } from "@/lib/public-cache";

export type NavigationLink = { href: string; label: string; img?: string | null };

export type NavigationData = {
  /** Desktop header links. */
  primary: NavigationLink[];
  /** Full-screen menu, with preview imagery. */
  menu: NavigationLink[];
  /** Footer "Shop" column. */
  shop: NavigationLink[];
};

const STATIC_PRIMARY: NavigationLink[] = [
  { href: "/shop", label: "Shop" },
  { href: "/new", label: "New In" },
  { href: "/collections", label: "Collections" },
  { href: "/about", label: "Our Story" },
];

/**
 * Navigation is derived from the live catalogue: only categories and
 * collections with active products appear. If the database is unreachable the
 * storefront still renders with the static links.
 */
export async function getNavigationData(): Promise<NavigationData> {
  try {
    const [categories, collections] = await Promise.all([getNavigationCategories(), getNavigationCollections()]);
    const categoryLinks = categories.map((category) => ({
      href: buildCategoryPath(category.slug),
      label: category.name,
      img: category.coverImage,
    }));
    const featuredCollection = collections[0];

    return {
      primary: STATIC_PRIMARY,
      menu: [
        ...categoryLinks,
        {
          href: "/collections",
          label: "Collections",
          img: featuredCollection?.coverImage ?? categoryLinks[0]?.img ?? null,
        },
        { href: "/new", label: "New Arrivals", img: categoryLinks[1]?.img ?? null },
      ],
      shop: [
        { href: "/new", label: "New Arrivals" },
        { href: "/best-sellers", label: "Best Sellers" },
        ...categoryLinks.map(({ href, label }) => ({ href, label })),
        { href: "/collections", label: "Collections" },
        { href: "/sale", label: "Sale" },
      ],
    };
  } catch (error) {
    console.error("Navigation data unavailable:", error instanceof Error ? error.message : error);
    return {
      primary: STATIC_PRIMARY,
      menu: [
        { href: "/shop", label: "Shop All" },
        { href: "/new", label: "New Arrivals" },
        { href: "/collections", label: "Collections" },
      ],
      shop: [
        { href: "/shop", label: "Shop All" },
        { href: "/new", label: "New Arrivals" },
        { href: "/collections", label: "Collections" },
      ],
    };
  }
}
