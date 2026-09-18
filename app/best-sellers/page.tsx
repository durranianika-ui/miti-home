import type { Metadata } from "next"
import { ListingPage } from "@/components/features/listing-page"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
    title: "Best Sellers",
    description: "The Miti Home pieces our customers love most — sculptural décor, lighting and everyday luxuries.",
    alternates: { canonical: "/best-sellers" },
    openGraph: {
        title: `Best Sellers | ${BRAND.name}`,
        description: "The Miti Home pieces our customers love most.",
        url: "/best-sellers",
    },
}

export default function BestSellersPage() {
    return (
        <ListingPage
            title="Best sellers"
            eyebrow="Most loved"
            subtitle="The pieces that find their way into the most homes."
            scope={{ isFeatured: true }}
            breadcrumbs={[
                { name: "Home", url: "/" },
                { name: "Best Sellers", url: "/best-sellers" },
            ]}
        />
    )
}
