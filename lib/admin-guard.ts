import "server-only";

import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";

/**
 * Page-level admin guard. Next.js renders layouts and pages in parallel, so
 * the admin layout's redirect alone does not stop a page from running its
 * data queries. Every admin page calls this first: visitors are redirected
 * (not shown an error) and only admins reach the data layer.
 */
export async function requireAdminPage(returnTo = "/admin") {
  const session = await getServerSession();
  if (!session) redirect(`/account?redirect=${encodeURIComponent(returnTo)}`);
  if (session.user.role !== "admin") redirect("/");
  return session;
}
