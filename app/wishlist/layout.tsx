import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your saved pieces at Miti Home.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/wishlist",
  },
};

export default function WishlistLayout({ children }: { children: ReactNode }) {
  return children;
}
