import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Stores a newsletter sign-up. Idempotent per email address. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  // Honeypot: real visitors never fill the hidden "company" field.
  if (typeof body?.company === "string" && body.company.trim()) {
    return NextResponse.json({ success: true });
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ success: false, error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    await db
      .insert(newsletterSubscribers)
      .values({ email, source: typeof body?.source === "string" ? body.source.slice(0, 40) : "website" })
      .onConflictDoNothing();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter sign-up failed:", error);
    return NextResponse.json({ success: false, error: "We couldn't sign you up just now. Please try again." }, { status: 500 });
  }
}
