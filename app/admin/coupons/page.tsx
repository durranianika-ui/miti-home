import { getCoupons } from "@/lib/actions/admin";
import { AdminCouponsClient } from "./coupons-client";
import { requireAdminPage } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  await requireAdminPage("/admin/coupons");

  const coupons = await getCoupons();
  return <AdminCouponsClient initialCoupons={coupons} />;
}
