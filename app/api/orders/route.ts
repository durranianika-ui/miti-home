import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { CheckoutQuoteError, createCheckoutQuote } from "@/lib/checkout/quote";
import { getCodUnavailableReason } from "@/lib/checkout/cod";
import { createOrderRecord } from "@/lib/orders/create-order";
import { sanitizeUaeAddress } from "@/lib/uae";

/** Places a cash-on-delivery order from a server-priced quote. */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Please sign in to place your order." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || body.paymentMethod !== "cod") {
      return NextResponse.json({ success: false, error: "Invalid payment method for this endpoint" }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ success: false, error: "Your bag is empty" }, { status: 400 });
    }

    let shippingAddress;
    try {
      shippingAddress = sanitizeUaeAddress(body.shippingAddress);
    } catch (error) {
      return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
    }

    const quote = await createCheckoutQuote({
      items: body.items,
      couponCode: body.couponCode,
      paymentMethod: "cod",
      userId: session.user.id,
    });

    const codReason = getCodUnavailableReason({ emirate: shippingAddress.emirate, total: quote.total });
    if (codReason) {
      return NextResponse.json({ success: false, error: codReason }, { status: 400 });
    }

    const result = await createOrderRecord({
      userId: session.user.id,
      quote,
      shippingAddress,
      paymentMethod: "cod",
      paymentStatus: "pending",
    });

    return NextResponse.json(result, { status: result.success ? 200 : 409 });
  } catch (error) {
    if (error instanceof CheckoutQuoteError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("COD order creation error:", error);
    return NextResponse.json({ success: false, error: "We couldn't place your order. Please try again." }, { status: 500 });
  }
}
