"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { 
  Package, 
  ShoppingCart, 
  Banknote,
  Ticket,
  AlertTriangle,
  PackageX,
  Plus, 
  ArrowRight,
  FileText
} from "lucide-react";
import { getDashboardStats } from "@/lib/actions/admin";
import { ADMIN_QUERY_OPTIONS } from "@/lib/admin-query-options";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/money";
import { formatDate, orderNumber } from "./_lib/format";

type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;

export function AdminDashboardClient({ initialStats }: { initialStats: DashboardStats }) {
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "all">("30d");
  const shouldReduceMotion = useReducedMotion();

  const { data: stats = initialStats, isFetching } = useQuery({
    queryKey: ["admin-dashboard", timeframe],
    queryFn: () => getDashboardStats(timeframe),
    initialData: timeframe === "30d" ? initialStats : undefined,
    ...ADMIN_QUERY_OPTIONS,
  });

  const periodLabel = timeframe === "all" ? "all-time" : `last ${timeframe === "7d" ? "7" : "30"} days`;
  const statsItems: {
    label: string;
    value: string;
    description: string;
    icon: typeof Package;
    code: string;
    href?: string;
    alert?: boolean;
  }[] = [
    {
      label: "Revenue",
      value: formatPrice(stats.totalRevenue),
      description: `Paid or delivered orders, ${periodLabel} (VAT incl.)`,
      icon: Banknote,
      code: "REV",
    },
    {
      label: "Orders",
      value: stats.totalOrders.toLocaleString("en-AE"),
      description: `Orders placed, ${periodLabel}`,
      icon: ShoppingCart,
      code: "ORD",
      href: "/admin/orders",
    },
    {
      label: "Active catalogue",
      value: stats.totalProducts.toLocaleString("en-AE"),
      description: "Products visible in store",
      icon: Package,
      code: "CAT",
      href: "/admin/products",
    },
    {
      label: "Active coupons",
      value: stats.activeCoupons.toLocaleString("en-AE"),
      description: "Discount codes customers can use",
      icon: Ticket,
      code: "CPN",
      href: "/admin/coupons",
    },
    {
      label: "Low stock",
      value: stats.lowStockProducts.toLocaleString("en-AE"),
      description: "Visible products with 3 or fewer units",
      icon: PackageX,
      code: "STK",
      href: "/admin/products",
      alert: stats.lowStockProducts > 0,
    },
    {
      label: "Payments needing refund",
      value: stats.paidUnfulfilledCheckouts.toLocaleString("en-AE"),
      description: "Card charged but no order was created",
      icon: AlertTriangle,
      code: "RFD",
      href: "/admin/orders",
      alert: stats.paidUnfulfilledCheckouts > 0,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 15 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1] as const
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 md:py-16 space-y-16 px-2 sm:px-4">
      {/* Editorial Header */}
      <div className="border-b border-border/40 pb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="mb-2">
              <span className="text-[10px] uppercase font-mono tracking-[0.3em] text-muted-foreground">
                MITI HOME // ADMIN DESK
              </span>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tighter leading-none font-sans md:text-6xl">
              OVERVIEW
            </h1>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 border border-border/40 rounded-full p-1 bg-secondary/15 backdrop-blur-sm self-start md:self-auto">
            {(["7d", "30d", "all"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={timeframe === t}
                onClick={() => setTimeframe(t)}
                className={cn(
                  "text-[9px] uppercase tracking-[0.2em] px-4 py-2 rounded-full transition-all duration-300 font-bold cursor-pointer select-none",
                  timeframe === t
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "7d" ? "7 Days" : t === "30d" ? "30 Days" : "All Time"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px border border-border/30 bg-border/30"
      >
        {statsItems.map((item) => {
          const Icon = item.icon;
          const body = (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-muted-foreground">
                  {item.code} {"//"} {item.label}
                </span>
                <Icon className={cn("h-4 w-4", item.alert ? "text-destructive" : "text-muted-foreground/60")} aria-hidden="true" />
              </div>
              <div className="mt-6 space-y-1">
                <div
                  className={cn(
                    "text-4xl md:text-5xl font-light font-serif tracking-tight tabular-nums transition-opacity duration-300",
                    isFetching ? "opacity-40" : "opacity-100",
                    item.alert && "text-destructive"
                  )}
                >
                  {item.value}
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal pt-1">{item.description}</p>
              </div>
            </>
          );
          return (
            <motion.div key={item.label} variants={itemVariants} className="bg-background">
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex h-full min-h-[170px] flex-col justify-between p-6 transition-colors duration-300 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex h-full min-h-[170px] flex-col justify-between p-6">{body}</div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Main Grid: Actions & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        {/* Directives // Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          <div>
            <h2 className="text-[10px] uppercase font-mono tracking-[0.3em] text-muted-foreground">
              ADMIN DIRECTIVES
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Quick pathways to catalog and settings actions.</p>
          </div>

          <div className="flex flex-col gap-4">
            <Link 
              href="/admin/products/new" 
              className="group flex flex-col justify-between p-6 border border-border/40 hover:border-foreground/50 transition-all duration-300 min-h-[140px] bg-secondary/5 rounded-lg hover-lift"
            >
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-mono tracking-widest text-muted-foreground">DIR_01 // CATALOG</span>
                <Plus className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight group-hover:text-brand-strong transition-colors">
                  Add New Product
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  List a new piece with options, finishes, stock and imagery.
                </p>
              </div>
            </Link>

            <Link 
              href="/admin/coupons/new" 
              className="group flex flex-col justify-between p-6 border border-border/40 hover:border-foreground/50 transition-all duration-300 min-h-[140px] bg-secondary/5 rounded-lg hover-lift"
            >
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-mono tracking-widest text-muted-foreground">DIR_02 // DEALS</span>
                <Plus className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight group-hover:text-brand-strong transition-colors">
                  Create Coupon
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  Issue discount campaigns, fixed credits, or restricted coupons.
                </p>
              </div>
            </Link>

            <Link 
              href="/admin/orders" 
              className="group flex flex-col justify-between p-6 border border-border/40 hover:border-foreground/50 transition-all duration-300 min-h-[140px] bg-secondary/5 rounded-lg hover-lift"
            >
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-mono tracking-widest text-muted-foreground">DIR_03 // ORDERS</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
              </div>
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight group-hover:text-brand-strong transition-colors">
                  Manage Orders
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  Inspect shipment status, execute cancellations, or review order metrics.
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Transactions Ledger */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <h2 className="text-[10px] uppercase font-mono tracking-[0.3em] text-muted-foreground">
                RECENT TRANSACTIONS
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Audit log of customer intake and checkout events.</p>
            </div>
            <Link 
              href="/admin/orders" 
              className="text-[9px] uppercase font-mono tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              View Full Ledger <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
            {stats.recentOrders && stats.recentOrders.length > 0 ? (
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground pb-4 font-bold">Order ID</th>
                    <th className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground pb-4 font-bold">Customer</th>
                    <th className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground pb-4 font-bold">Date</th>
                    <th className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground pb-4 font-bold">Status</th>
                    <th className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground pb-4 font-bold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {stats.recentOrders.map((order) => (
                    <tr key={order.id} className="group hover:bg-secondary/5 transition-colors">
                      <td className="py-4 font-mono text-xs text-muted-foreground">
                        <Link href={`/admin/orders/${order.id}`} className="hover:text-foreground hover:underline transition-colors">
                          {orderNumber(order.id)}
                        </Link>
                      </td>
                      <td className="py-4 text-sm font-medium text-foreground">
                        {order.customerName}
                      </td>
                      <td className="py-4 text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="py-4">
                        <span className={cn(
                          "text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 rounded font-bold inline-block border",
                          order.status === "delivered" && "bg-green-500/10 text-green-500 border-green-500/25",
                          order.status === "pending" && "bg-yellow-500/10 text-yellow-500 border-yellow-500/25",
                          order.status === "cancelled" && "bg-destructive/10 text-destructive border-destructive/25",
                          !["delivered", "pending", "cancelled"].includes(order.status) && "bg-blue-500/10 text-blue-500 border-blue-500/25"
                        )}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 text-right font-serif text-sm tabular-nums text-foreground">
                        {formatPrice(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-16 text-center border border-dashed border-border/40 rounded-lg text-sm text-muted-foreground bg-secondary/5">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                No transactions recorded in database.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
