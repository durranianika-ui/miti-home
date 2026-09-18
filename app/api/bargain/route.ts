import { streamText } from "ai";
import { headers } from "next/headers";
import { bargainModel, isOpenRouterConfigured } from "@/lib/openrouter";
import { auth } from "@/lib/auth";
import { BARGAIN_AI_ENABLED } from "@/lib/constants";
import { formatPrice } from "@/lib/money";
import { BARGAIN_SYSTEM_PROMPT } from "@/lib/bargain/prompt";
import { createBargainCoupon } from "@/lib/actions/bargain";
import { getBargainEligibilityContext } from "@/lib/bargain/context";
import {
  type BargainCartItem,
  MAX_NEGOTIATION_ROUNDS,
  calculateMaxDiscount,
  calculateOfferAmount,
  detectAcceptanceIntent,
  getLastUserMessage,
  isUnreasonableDemand,
  parseRequestedDiscount,
  shouldFinalizeThisRound,
} from "@/lib/bargain/logic";

export const maxDuration = 30;

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * The concierge is optional. Off unless NEXT_PUBLIC_FEATURE_BARGAIN_AI=true,
 * and unavailable (never an error) when the model provider key is missing.
 */
function availabilityError() {
  if (!BARGAIN_AI_ENABLED) return json({ error: "Not available" }, 404);
  if (!isOpenRouterConfigured()) return json({ error: "The concierge is unavailable right now" }, 503);
  return null;
}

/** Lets the checkout ask whether to show the concierge at all. */
export async function GET() {
  return availabilityError() ?? json({ available: true }, 200);
}

export async function POST(req: Request) {
  const unavailable = availabilityError();
  if (unavailable) return unavailable;

  try {
    const body = await req.json().catch(() => null);
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const cartItems = Array.isArray(body?.cartItems) ? (body.cartItems as BargainCartItem[]) : [];
    const cartTotal = Number(body?.cartTotal);
    const negotiationRound = Number(body?.negotiationRound) || 0;

    if (cartItems.length === 0 || !Number.isFinite(cartTotal) || cartTotal <= 0) {
      return json({ error: "Cart information required" }, 400);
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;
    const { configuredCap, isFirstTimeUser } = await getBargainEligibilityContext({
      cartItems,
      cartTotal,
      userId,
    });

    // The courtesy never exceeds the cart rule OR the per-product / per-set caps set in admin.
    const { maxDiscount } = calculateMaxDiscount(cartTotal, isFirstTimeUser, configuredCap);

    if (maxDiscount <= 0) {
      return new Response(
        "Thank you for asking. There is no additional courtesy available on this order, but I hope you enjoy your new pieces.",
        { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    const safeRound = Math.max(1, Math.min(negotiationRound || 1, MAX_NEGOTIATION_ROUNDS));
    const lastUserMessage = getLastUserMessage(messages);
    const requestedDiscount = parseRequestedDiscount(lastUserMessage);
    const acceptanceIntent = detectAcceptanceIntent(lastUserMessage);
    const unreasonableDemand = isUnreasonableDemand(requestedDiscount, maxDiscount);

    const currentOffer = calculateOfferAmount(safeRound, maxDiscount, requestedDiscount);

    const finalizeNow = shouldFinalizeThisRound(
      safeRound,
      maxDiscount,
      currentOffer,
      requestedDiscount,
      acceptanceIntent,
      unreasonableDemand
    );

    const finalDiscountAmount = Math.max(0, Math.min(maxDiscount, currentOffer));
    let finalCoupon: Awaited<ReturnType<typeof createBargainCoupon>> | null = null;

    if (finalizeNow && userId) {
      try {
        finalCoupon = await createBargainCoupon({
          userId,
          cartTotal,
          discountAmount: finalDiscountAmount,
        });
      } catch (dbError) {
        console.error("Failed to save concierge coupon:", dbError);
      }
    }

    const cartItemsList = cartItems
      .map((item) => `- ${item.name} x${item.quantity} @ ${formatPrice(item.price)}${item.comboId ? " (part of a set)" : ""}`)
      .join("\n");

    const contextMessage = finalCoupon
      ? `

CURRENT CART (prices in AED, VAT included):
${cartItemsList}
Cart total: ${formatPrice(cartTotal)}

CONVERSATION STATE:
- Round: ${safeRound}/${MAX_NEGOTIATION_ROUNDS}
- GIVE_FINAL_COUPON: true
- COUPON_CODE: ${finalCoupon.code}
- DISCOUNT_AMOUNT: AED ${finalDiscountAmount}
- ZERO_DISCOUNT_MODE: false
- GUEST_SIGNED_IN: true

IMPORTANT: Present the courtesy of AED ${finalDiscountAmount} graciously. The code ${finalCoupon.code} appears as a button below your message. Mention that it is reserved for five minutes.
`
      : `

CURRENT CART (prices in AED, VAT included):
${cartItemsList}
Cart total: ${formatPrice(cartTotal)}

CONVERSATION STATE:
- Round: ${safeRound}/${MAX_NEGOTIATION_ROUNDS}
- CURRENT_OFFER: AED ${currentOffer}
- GIVE_FINAL_COUPON: false
- ZERO_DISCOUNT_MODE: false
- GUEST_REQUESTED_AMOUNT: ${requestedDiscount !== null ? `AED ${requestedDiscount}` : "unknown"}
- REQUEST_EXCEEDS_WHAT_IS_POSSIBLE: ${unreasonableDemand ? "true" : "false"}
- GUEST_SIGNED_IN: ${userId ? "true" : "false"}

IMPORTANT: The conversation is still open. You may offer AED ${currentOffer}. NO code has been generated yet: do not mention or invent any code. If the guest asks for the code, say the courtesy will be confirmed shortly.${userId ? "" : " The guest is not signed in; invite them to sign in so the courtesy can be reserved for them."}
`;

    const result = streamText({
      model: bargainModel,
      system: BARGAIN_SYSTEM_PROMPT + contextMessage,
      messages,
      temperature: 0.6,
    });

    const response = result.toTextStreamResponse();

    // Coupon details travel in headers so the client never has to parse them from prose.
    if (finalCoupon) {
      response.headers.set("X-Coupon-Code", finalCoupon.code);
      response.headers.set("X-Coupon-Discount", finalCoupon.discountAmount.toString());
      response.headers.set("X-Coupon-Expires", finalCoupon.expiresAt.getTime().toString());
    }

    return response;
  } catch (error) {
    console.error("Concierge error:", error);
    return json({ error: "The concierge is unavailable right now" }, 503);
  }
}
