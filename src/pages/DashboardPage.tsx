import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardData {
  todaySales: number;
  todayTransactions: number;
  monthRevenue: number;
  lowStockCount: number;
  recentSales: {
    id: string;
    receipt_number: string;
    total: number;
    payment_method: string;
    created_at: string;
    customer_name: string | null;
  }[];
  topProducts: { name: string; sold: number; revenue: number }[];
  weeklyRevenue: { day: string; revenue: number }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadDashboard();

    // Realtime: refresh dashboard on new sales
    const channel = supabase
      .channel('dashboard-sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        loadDashboard();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function loadDashboard() {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("user_id", user!.id)
        .single();

      if (!profile?.business_id) { setLoading(false); return; }
      const bizId = profile.business_id;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

      // Parallel queries
      const [todaySalesRes, monthSalesRes, lowStockRes, recentRes, weekSalesRes, saleItemsRes] =
        await Promise.all([
          supabase
            .from("sales")
            .select("id, total")
            .eq("business_id", bizId)
            .eq("status", "completed")
            .gte("created_at", todayStart),
          supabase
            .from("sales")
            .select("total")
            .eq("business_id", bizId)
            .eq("status", "completed")
            .gte("created_at", monthStart),
          supabase
            .from("inventory")
            .select("id, quantity, reorder_level, branch_id, product_id")
            .in(
              "branch_id",
              (await supabase.from("branches").select("id").eq("business_id", bizId)).data?.map(
                (b) => b.id
              ) || []
            ),
          supabase
            .from("sales")
            .select("id, receipt_number, total, payment_method, created_at, customer_id")
            .eq("business_id", bizId)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("sales")
            .select("total, created_at")
            .eq("business_id", bizId)
            .eq("status", "completed")
            .gte("created_at", weekAgo),
          supabase
            .from("sale_items")
            .select("product_name, quantity, total, sale_id")
            .in(
              "sale_id",
              (
                await supabase
                  .from("sales")
                  .select("id")
                  .eq("business_id", bizId)
                  .eq("status", "completed")
                  .gte("created_at", monthStart)
              ).data?.map((s) => s.id) || []
            ),
        ]);

      // Today stats
      const todaySales = (todaySalesRes.data || []).reduce((s, r) => s + Number(r.total), 0);
      const todayTransactions = (todaySalesRes.data || []).length;

      // Month revenue
      const monthRevenue = (monthSalesRes.data || []).reduce((s, r) => s + Number(r.total), 0);

      // Low stock
      const lowStockCount = (lowStockRes.data || []).filter(
        (i) => i.quantity <= (i.reorder_level || 10)
      ).length;

      // Recent sales with customer names
      let recentSales: DashboardData["recentSales"] = [];
      if (recentRes.data?.length) {
        const customerIds = recentRes.data
          .map((s) => s.customer_id)
          .filter(Boolean) as string[];
        const customerMap: Record<string, string> = {};
        if (customerIds.length) {
          const { data: customers } = await supabase
            .from("customers")
            .select("id, name")
            .in("id", customerIds);
          customers?.forEach((c) => (customerMap[c.id] = c.name));
        }
        recentSales = recentRes.data.map((s) => ({
          id: s.id,
          receipt_number: s.receipt_number,
          total: Number(s.total),
          payment_method: s.payment_method,
          created_at: s.created_at,
          customer_name: s.customer_id ? customerMap[s.customer_id] || "Customer" : "Walk-in",
        }));
      }

      // Top products
      const productAgg: Record<string, { sold: number; revenue: number }> = {};
      (saleItemsRes.data || []).forEach((item) => {
        if (!productAgg[item.product_name])
          productAgg[item.product_name] = { sold: 0, revenue: 0 };
        productAgg[item.product_name].sold += item.quantity;
        productAgg[item.product_name].revenue += Number(item.total);
      });
      const topProducts = Object.entries(productAgg)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Weekly revenue chart
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weeklyMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const key = dayNames[d.getDay()];
        weeklyMap[key] = 0;
      }
      (weekSalesRes.data || []).forEach((s) => {
        const d = new Date(s.created_at);
        const key = dayNames[d.getDay()];
        weeklyMap[key] = (weeklyMap[key] || 0) + Number(s.total);
      });
      const weeklyRevenue = Object.entries(weeklyMap).map(([day, revenue]) => ({
        day,
        revenue,
      }));

      setData({
        todaySales,
        todayTransactions,
        monthRevenue,
        lowStockCount,
        recentSales,
        topProducts,
        weeklyRevenue,
      });
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }

  const fmt = (n: number) =>
    `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const stats = data
    ? [
        { label: "Today's Sales", value: fmt(data.todaySales), icon: DollarSign },
        { label: "Transactions", value: String(data.todayTransactions), icon: ShoppingCart },
        { label: "Revenue (MTD)", value: fmt(data.monthRevenue), icon: TrendingUp },
        { label: "Low Stock Items", value: String(data.lowStockCount), icon: Package, warning: data.lowStockCount > 0 },
      ]
    : [];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Your real-time business overview.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                  (stat as any).warning ? "bg-destructive/10" : "bg-primary/10"
                }`}>
                  <stat.icon className={`h-4 w-4 ${(stat as any).warning ? "text-destructive" : "text-primary"}`} />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-display text-2xl font-bold">{stat.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue Chart */}
        {data && data.weeklyRevenue.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display font-semibold mb-4">Revenue (Last 7 Days)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.weeklyRevenue}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip
                  formatter={(value: number) => [fmt(value), "Revenue"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Sales */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display font-semibold">Recent Sales</h2>
            </div>
            {data && data.recentSales.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left font-medium p-4">Receipt</th>
                      <th className="text-left font-medium p-4 hidden sm:table-cell">Customer</th>
                      <th className="text-left font-medium p-4 hidden md:table-cell">Payment</th>
                      <th className="text-right font-medium p-4">Total</th>
                      <th className="text-right font-medium p-4 hidden sm:table-cell">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSales.map((sale) => (
                      <tr key={sale.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-4 font-medium">{sale.receipt_number}</td>
                        <td className="p-4 hidden sm:table-cell">{sale.customer_name}</td>
                        <td className="p-4 hidden md:table-cell">
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">
                            {sale.payment_method.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-4 text-right font-semibold">{fmt(sale.total)}</td>
                        <td className="p-4 text-right text-muted-foreground hidden sm:table-cell">
                          {timeAgo(sale.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">No sales yet. Complete a sale in POS to see data here.</div>
            )}
          </div>

          {/* Top Products */}
          <div className="rounded-xl border border-border bg-card">
            <div className="p-5 border-b border-border">
              <h2 className="font-display font-semibold">Top Products</h2>
              <p className="text-xs text-muted-foreground mt-1">This month's best sellers</p>
            </div>
            {data && data.topProducts.length > 0 ? (
              <div className="p-4 space-y-4">
                {data.topProducts.map((product, i) => (
                  <div key={product.name} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sold} sold</p>
                    </div>
                    <span className="text-sm font-semibold">{fmt(product.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">No product sales this month.</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
