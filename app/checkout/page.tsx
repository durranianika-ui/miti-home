import { CheckoutClient } from "@/components/features/checkout-client"
import { getCardPaymentProvider } from "@/lib/payments"

// Payment availability depends on server-only secrets, so resolve it per request.
export const dynamic = "force-dynamic"

export default function CheckoutPage() {
    const provider = getCardPaymentProvider()
    return <CheckoutClient cardPayment={provider ? { label: provider.label } : null} />
}
