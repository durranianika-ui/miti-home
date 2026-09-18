"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { NavigationLink } from "@/lib/navigation";

function FooterShell() {
  return (
    <footer
      aria-hidden="true"
      className="relative min-h-[90svh] overflow-hidden border-t border-border/60 bg-background text-foreground"
    />
  );
}

const Footer = dynamic(
  () => import("@/components/layout/footer").then((mod) => mod.Footer),
  { loading: () => <FooterShell /> },
);

export function FooterGate({ shopLinks }: { shopLinks: NavigationLink[] }) {
  const pathname = usePathname();

  if (pathname === "/gallery" || pathname.startsWith("/admin")) return null;

  return <Footer shopLinks={shopLinks} />;
}
