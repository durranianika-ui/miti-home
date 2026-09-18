"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/combos", label: "Combos" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/newsletter", label: "Newsletter" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Horizontal, scrollable admin navigation. Works on every width: on phones
 * the strip scrolls sideways; on desktop all items fit on one line.
 */
export function AdminNav() {
  const pathname = usePathname() ?? "/admin";

  return (
    <nav aria-label="Admin sections" className="border-b border-border/40 bg-background">
      <ul className="flex gap-1 overflow-x-auto px-2 py-2 md:px-6 [scrollbar-width:thin]">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  active
                    ? "bg-brand text-neutral-950"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
