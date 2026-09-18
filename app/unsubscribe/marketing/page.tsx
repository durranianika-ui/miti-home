import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unsubscribeFromMarketing } from "@/lib/actions/marketing";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email Preferences",
  robots: { index: false, follow: false },
};

export default async function MarketingUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string; email?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";

  async function confirmUnsubscribe() {
    "use server";
    const result = await unsubscribeFromMarketing(token);
    if (!result.success) {
      redirect("/unsubscribe/marketing?status=invalid");
    }
    redirect(`/unsubscribe/marketing?status=success&email=${encodeURIComponent(result.email ?? "")}`);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground md:py-24">
      <div className="mx-auto max-w-xl text-center">
        <p className="font-heading text-[10px] font-medium uppercase tracking-[0.34em] text-brand-strong">
          Email preferences
        </p>
        <h1 className="font-display mt-5 text-4xl leading-tight md:text-5xl">Marketing emails</h1>
        <div className="brand-rule mx-auto mt-8 w-40 text-[10px]">
          <span className="h-1.5 w-1.5 rotate-45 bg-brand" />
        </div>

        {params.status === "success" ? (
          <p className="mt-8 text-sm leading-7 text-muted-foreground">
            {params.email ? `${params.email} has` : "You have"} been unsubscribed from {BRAND.name} marketing emails.
            You will still receive emails about any orders you place.
          </p>
        ) : params.status === "invalid" || !token ? (
          <p className="mt-8 text-sm leading-7 text-muted-foreground">
            This unsubscribe link is invalid or has expired.
          </p>
        ) : (
          <form action={confirmUnsubscribe} className="mt-8 space-y-7">
            <p className="text-sm leading-7 text-muted-foreground">
              Confirm that you would like to stop receiving {BRAND.name} emails about new arrivals, curated edits and
              offers.
            </p>
            <button
              type="submit"
              className="h-12 bg-foreground px-7 font-heading text-[11px] uppercase tracking-[0.22em] text-background transition-colors duration-300 hover:bg-brand hover:text-neutral-950"
            >
              Unsubscribe
            </button>
          </form>
        )}

        <p className="mt-12">
          <Link
            href="/"
            className="font-heading text-[10px] uppercase tracking-[0.22em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Return to {BRAND.name}
          </Link>
        </p>
      </div>
    </main>
  );
}
