import type { Metadata } from "next"
import { ListingPage } from "@/components/features/listing-page"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
    title: "Sale",
    description: "Selected Miti Home pieces at a special price, while stocks last.",
    alternates: { canonical: "/sale" },
    openGraph: {
        title: `Sale | ${BRAND.name}`,
        description: "Selected Miti Home pieces at a special price.",
        url: "/sale",
    },
}

export default function SalePage() {
    return (
        <ListingPage
            title="Sale"
            eyebrow="While stocks last"
            subtitle="A small, considered selection at a special price."
            scope={{ onSale: true }}
            defaultSort="price-asc"
            breadcrumbs={[
                { name: "Home", url: "/" },
                { name: "Sale", url: "/sale" },
            ]}
            emptyMessage="There's nothing on sale right now. Explore the full collection instead."
        />
    )
}
