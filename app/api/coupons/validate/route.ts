import { NextRequest, NextResponse } from "next/server";
import { validateCoupon } from "@/lib/coupon-validation";
import { getServerSession } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const { code, orderTotal } = await req.json();
    
    if (!code || orderTotal === undefined) {
      return NextResponse.json(
        { valid: false, error: "Code and order total are required" },
        { status: 400 }
      );
    }

    const session = await getServerSession();
    const userId = session?.user?.id;

    const amount = Number(orderTotal);
    if (typeof code !== "string" || !Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ valid: false, error: "Invalid request" }, { status: 400 });
    }

    const result = await validateCoupon(code.trim().slice(0, 40), amount, userId);

    // Never echo the coupon row (limits, owner, usage) back to the browser.
    return NextResponse.json(
      result.valid
        ? { valid: true, code: result.coupon!.code, discount: result.discount }
        : { valid: false, error: result.error },
    );
  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json(
      { valid: false, error: "We couldn’t check that code. Please try again." },
      { status: 500 }
    );
  }
}
