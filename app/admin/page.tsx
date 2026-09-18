import { getDashboardStats } from "@/lib/actions/admin";
import { AdminDashboardClient } from "./dashboard-client";
import { requireAdminPage } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdminPage("/admin");

  const stats = await getDashboardStats();
  return <AdminDashboardClient initialStats={stats} />;
}
