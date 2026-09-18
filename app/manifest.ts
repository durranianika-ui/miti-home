import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — ${BRAND.tagline}`,
    short_name: BRAND.name,
    description: BRAND.shortDescription,
    start_url: "/",
    display: "standalone",
    background_color: BRAND.colors.ivory,
    theme_color: BRAND.colors.ivory,
    icons: [
      { src: "/brand/miti-home-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/miti-home-icon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
