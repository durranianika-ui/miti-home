import type { Metadata } from "next"
import { ListingPage } from "@/components/features/listing-page"
import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
    title: "New Arrivals",
    description: "The latest pieces to join Miti Home — new décor, lighting and clever finds, delivered across the UAE.",
    alternates: { canonical: "/new" },
    openGraph: {
        title: `New Arrivals | ${BRAND.name}`,
        description: "The latest pieces to join Miti Home.",
        url: "/new",
    },
}

export default function NewArrivalsPage() {
    return (
        <ListingPage
            title="New arrivals"
            eyebrow="Just landed"
            subtitle="Fresh discoveries, newly added to the collection."
            scope={{ isNew: true }}
            breadcrumbs={[
                { name: "Home", url: "/" },
                { name: "New Arrivals", url: "/new" },
            ]}
            emptyMessage="New pieces are on their way — check back soon."
        />
    )
}
