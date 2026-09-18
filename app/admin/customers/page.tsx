import Link from "next/link";
import { Search } from "lucide-react";
import { getCustomers } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { formatPriceExact } from "@/lib/money";
import { displayPhone, formatDate, inputClass } from "../_lib/format";
import { requireAdminPage } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  await requireAdminPage("/admin/customers");

  const params = await searchParams;
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().slice(0, 100) ?? "";
  const customers = await getCustomers({ search: q || undefined, limit: 200 });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">Registered accounts, newest first</p>
      </div>

      <form role="search" method="get" className="flex items-end gap-2 rounded-lg border border-border p-3">
        <div className="flex-1 space-y-1">
          <label htmlFor="customer-search" className="text-xs font-medium text-muted-foreground">
            Search name, email or phone
          </label>
          <input id="customer-search" name="q" type="search" defaultValue={q} className={inputClass} placeholder="e.g. +971 or @gmail.com" />
        </div>
        <Button type="submit" variant="outline" aria-label="Search customers">
          <Search className="h-4 w-4" />
        </Button>
        {q && (
          <Button asChild variant="ghost">
            <Link href="/admin/customers">Clear</Link>
          </Button>
        )}
      </form>

      <p className="text-sm text-muted-foreground" role="status">
        {customers.length === 0
          ? q
            ? `No customers match “${q}”.`
            : "No customers yet."
          : `${customers.length}${customers.length >= 200 ? "+" : ""} customer${customers.length === 1 ? "" : "s"}${q ? ` matching “${q}”` : ""}`}
      </p>

      {customers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th scope="col" className="p-3 font-medium">Name</th>
                <th scope="col" className="p-3 font-medium">Email</th>
                <th scope="col" className="p-3 font-medium">Phone</th>
                <th scope="col" className="p-3 text-right font-medium">Orders</th>
                <th scope="col" className="p-3 text-right font-medium">Total spent</th>
                <th scope="col" className="p-3 font-medium">Joined</th>
                <th scope="col" className="p-3 font-medium">Verified</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{customer.name}</div>
                    {customer.role === "admin" && (
                      <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-brand-strong">
                        Admin
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <a href={`mailto:${customer.email}`} className="hover:underline">
                      {customer.email}
                    </a>
                  </td>
                  <td className="p-3 whitespace-nowrap">{displayPhone(customer.phone) ?? "—"}</td>
                  <td className="p-3 text-right tabular-nums">{customer.ordersCount}</td>
                  <td className="p-3 text-right tabular-nums whitespace-nowrap">{formatPriceExact(customer.totalSpent)}</td>
                  <td className="p-3 whitespace-nowrap">{formatDate(customer.createdAt)}</td>
                  <td className="p-3">
                    {customer.emailVerified ? (
                      <span className="text-green-700 dark:text-green-400">Yes</span>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
