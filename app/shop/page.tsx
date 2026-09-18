import type { Metadata } from "next"
import { ListingPage } from "@/components/features/listing-page"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
    title: "Shop All Home Décor & Lifestyle",
    description:
        "Shop the full Miti Home collection — sculptural décor, vases, designer lighting, smart storage and hosting essentials. Prices in AED, delivered across the UAE.",
    alternates: { canonical: "/shop" },
    openGraph: {
        title: `Shop All | ${BRAND.name}`,
        description: "Sculptural décor, designer lighting, smart storage and hosting essentials, curated by Miti Home.",
        url: "/shop",
    },
}

export default function ShopPage() {
    return (
        <ListingPage
            title="Shop all"
            eyebrow={BRAND.tagline}
            subtitle="Every piece, thoughtfully curated — from statement décor and sculptural lighting to clever everyday finds."
            breadcrumbs={[
                { name: "Home", url: "/" },
                { name: "Shop", url: "/shop" },
            ]}
            note={{
                label: "The Miti Home edit",
                body: `${BRAND.description} Every product is chosen for beauty, quality and usefulness — curated, not crowded.`,
            }}
        />
    )
}
