import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession, isAdmin } from "@/lib/auth-server";
import { AdminNav } from "./_components/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/account?redirect=/admin");
  }

  const admin = await isAdmin();
  if (!admin) {
    redirect("/?error=unauthorized");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur-md">
        <div className="flex h-14 items-center gap-4 px-4 md:px-8">
          <Link href="/admin" className="flex select-none items-baseline gap-2 font-display text-xl tracking-tight">
            Miti Home
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-strong">
              Admin
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden select-none font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground sm:inline">
              {session.user.email}
            </span>
            <Link
              href="/"
              className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              View store →
            </Link>
          </div>
        </div>
        <AdminNav />
      </header>

      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/admin",
  },
};
