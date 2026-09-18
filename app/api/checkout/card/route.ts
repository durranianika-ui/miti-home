import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { startCardCheckout } from "@/lib/checkout/card-checkout";
import { CheckoutQuoteError, createCheckoutQuote } from "@/lib/checkout/quote";
import { getCardPaymentProvider, PaymentProviderError } from "@/lib/payments";
import { sanitizeUaeAddress } from "@/lib/uae";

/** Starts a hosted card payment for a server-priced quote. */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please sign in to pay." }, { status: 401 });
    }

    if (!getCardPaymentProvider()) {
      return NextResponse.json({ error: "Card payments are not available right now." }, { status: 503 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Your bag is empty" }, { status: 400 });
    }

    let shippingAddress;
    try {
      shippingAddress = sanitizeUaeAddress(body.shippingAddress);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }

    const quote = await createCheckoutQuote({
      items: body.items,
      couponCode: body.couponCode,
      paymentMethod: "card",
      userId: session.user.id,
    });

    const result = await startCardCheckout({ userId: session.user.id, quote, shippingAddress });
    return NextResponse.json({ redirectUrl: result.redirectUrl });
  } catch (error) {
    if (error instanceof CheckoutQuoteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof PaymentProviderError) {
      console.error("Card checkout provider error:", error.message);
      return NextResponse.json({ error: "The payment page could not be opened. Please try again." }, { status: 502 });
    }
    console.error("Card checkout error:", error);
    return NextResponse.json({ error: "The payment page could not be opened. Please try again." }, { status: 500 });
  }
}
