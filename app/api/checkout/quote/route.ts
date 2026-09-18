import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { getCodUnavailableReason } from "@/lib/checkout/cod";
import { CheckoutQuoteError, createCheckoutQuote, isCheckoutPaymentMethod } from "@/lib/checkout/quote";

/**
 * Server-priced order summary for the checkout page. The browser only ever
 * displays these numbers; orders are re-quoted again at placement.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Your bag is empty" }, { status: 400 });
  }

  const paymentMethod = isCheckoutPaymentMethod(body.paymentMethod) ? body.paymentMethod : "card";

  try {
    const session = await getServerSession();
    const quote = await createCheckoutQuote({
      items: body.items,
      couponCode: typeof body.couponCode === "string" ? body.couponCode : undefined,
      paymentMethod,
      userId: session?.user?.id,
    });

    const codQuote = paymentMethod === "cod"
      ? quote
      : await createCheckoutQuote({
          items: body.items,
          couponCode: typeof body.couponCode === "string" ? body.couponCode : undefined,
          paymentMethod: "cod",
          userId: session?.user?.id,
        });

    return NextResponse.json({
      subtotal: quote.subtotal,
      comboDiscount: quote.comboDiscount,
      couponDiscount: quote.couponDiscount,
      couponCode: quote.couponCode ?? null,
      shippingCost: quote.shippingCost,
      codFee: quote.codFee,
      vatAmount: quote.vatAmount,
      total: quote.total,
      codUnavailableReason: typeof body.emirate === "string"
        ? getCodUnavailableReason({ emirate: body.emirate, total: codQuote.total })
        : null,
    });
  } catch (error) {
    if (error instanceof CheckoutQuoteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Checkout quote error:", error);
    return NextResponse.json({ error: "We couldn't price your bag just now. Please try again." }, { status: 500 });
  }
}
