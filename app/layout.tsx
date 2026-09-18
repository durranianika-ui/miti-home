import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Lato, Montserrat } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Navbar } from "@/app/navbar";
import { FooterGate } from "@/components/layout/footer-gate";
import { CartProvider } from "@/lib/cart-context";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { QueryProvider } from "@/components/ui/query-provider";
import { Analytics } from "@/components/analytics/analytics";
import { CursorDotLoader } from "@/components/effects/cursor-dot-loader";
import { BRAND } from "@/lib/brand";
import { getNavigationData } from "@/lib/navigation";
import { DEFAULT_OG_IMAGE, DEFAULT_SITE_URL, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo";

const CartDrawer = dynamic(() =>
  import("@/components/features/cart-drawer").then((mod) => mod.CartDrawer),
  { loading: () => null }
);

function RouteShellFallback() {
  return <div className="min-h-[calc(100svh-7rem)] bg-background" aria-hidden="true" />;
}

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND.colors.ivory },
    { media: "(prefers-color-scheme: dark)", color: "#100f0e" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${BRAND.name}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: BRAND.name,
  keywords: [
    "Miti Home",
    "home décor Dubai",
    "luxury home accessories UAE",
    "decorative sculptures",
    "designer vases",
    "pendant lighting Dubai",
    "home organisation",
    "housewarming gifts UAE",
    "tissue box",
    "home lifestyle store",
  ],
  authors: [{ name: BRAND.name }],
  creator: BRAND.name,
  publisher: BRAND.name,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: BRAND.ogLocale,
    siteName: BRAND.name,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND.name} — ${BRAND.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} | ${BRAND.tagline}`,
    description: BRAND.shortDescription,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "shopping",
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: false },
};

const THEME_INIT_SCRIPT = `
(function() {
  try {
    var root = document.documentElement;
    var stored = localStorage.getItem('miti-theme');
    var cookieMatch = document.cookie.match(/(?:^|; )miti-theme=(light|dark)(?:;|$)/);
    var cookieTheme = cookieMatch ? cookieMatch[1] : null;
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : cookieTheme === 'light' || cookieTheme === 'dark'
        ? cookieTheme
        : 'light';
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme !== 'dark');
    root.style.colorScheme = theme;
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navigation = await getNavigationData();

  return (
    <html lang="en" dir="ltr" className="light" suppressHydrationWarning>
      <head>
        <script id="miti-theme-init" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${lato.variable} ${montserrat.variable} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-foreground focus:px-4 focus:py-2 focus:text-xs focus:uppercase focus:tracking-[0.2em] focus:text-background"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <QueryProvider>
            <CartProvider>
              <Navbar navigation={navigation} />
              <div id="main-content-container" className="flex-1 flex flex-col">
                <main id="main-content" className="flex-1 overflow-x-hidden relative">
                  <Suspense fallback={<RouteShellFallback />}>{children}</Suspense>
                </main>
                <Suspense fallback={null}>
                  <FooterGate shopLinks={navigation.shop} />
                </Suspense>
              </div>
              <CartDrawer />
              <CursorDotLoader />
              {/* Fine paper grain for a tactile, printed feel */}
              <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 z-[60] opacity-[0.02] dark:opacity-[0.03]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
              />
            </CartProvider>
          </QueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
