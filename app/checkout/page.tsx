import { CheckoutClient } from "@/components/features/checkout-client"
import { getCardPaymentProvider } from "@/lib/payments"
import { PreviewUnavailable, STATIC_PREVIEW } from "@/components/layout/preview-banner"

// Payment availability depends on server-only secrets, so resolve it per request.
export const dynamic = "force-dynamic"

export default function CheckoutPage() {
    if (STATIC_PREVIEW) return <PreviewUnavailable title="Checkout" />
    const provider = getCardPaymentProvider()
    return <CheckoutClient cardPayment={provider ? { label: provider.label } : null} />
}
