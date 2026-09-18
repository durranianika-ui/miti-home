import type { NextConfig } from "next";

import { CATALOG_NOINDEX_PARAMS } from "./lib/seo.ts";

const catalogNoindexParams = [...CATALOG_NOINDEX_PARAMS];
const catalogNoindexSources = ["/shop", "/shop/:path*", "/new", "/best-sellers", "/sale", "/collections/:path*"];
const staticMediaSources = ["/products/:path*", "/brand/:path*"];

function catalogNoindexHeaders() {
  return catalogNoindexSources.flatMap((source) =>
    catalogNoindexParams.map((key) => ({
      source,
      has: [{ type: "query" as const, key }],
      headers: [
        {
          key: "X-Robots-Tag",
          value: "noindex, follow",
        },
      ],
    }))
  );
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  reactCompiler: true,
  async headers() {
    return [
      ...catalogNoindexHeaders(),
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
      ...staticMediaSources.map((source) => ({
        source,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      })),
    ];
  },
};

export default nextConfig;
