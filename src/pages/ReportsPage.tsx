import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, TrendingUp, Users, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

type Tab = "daily" | "products" | "cashiers";

export default function ReportsPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>("daily");
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<{ date: string; revenue: number; transactions: number }[]>([]);
  const [productData, setProductData] = useState<{ name: string; sold: number; revenue: number }[]>([]);
  const [cashierData, setCashierData] = useState<{ name: string; sales: number; transactions: number }[]>([]);

  const businessId = profile?.business_id;

  useEffect(() => {
    if (!businessId) return;
    loadReport(tab);
  }, [businessId, tab]);

  async function loadReport(t: Tab) {
    setLoading(true);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    if (t === "daily") {
      const { data: sales } = await supabase
        .from("sales")
        .select("total, created_at")
        .eq("business_id", businessId!)
        .eq("status", "completed")
        .gte("created_at", thirtyDaysAgo);

      const dayMap: Record<string, { revenue: number; transactions: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dayMap[key] = { revenue: 0, transactions: 0 };
      }
      (sales ?? []).forEach(s => {
        const key = new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (dayMap[key]) {
          dayMap[key].revenue += Number(s.total);
          dayMap[key].transactions += 1;
        }
      });
      setDailyData(Object.entries(dayMap).map(([date, v]) => ({ date, ...v })));
    }

    if (t === "products") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: saleIds } = await supabase
        .from("sales").select("id").eq("business_id", businessId!).eq("status", "completed").gte("created_at", monthStart);
      const ids = (saleIds ?? []).map(s => s.id);

      if (ids.length) {
        const { data: items } = await supabase
          .from("sale_items").select("product_name, quantity, total").in("sale_id", ids);

        const agg: Record<string, { sold: number; revenue: number }> = {};
        (items ?? []).forEach(i => {
          if (!agg[i.product_name]) agg[i.product_name] = { sold: 0, revenue: 0 };
          agg[i.product_name].sold += i.quantity;
          agg[i.product_name].revenue += Number(i.total);
        });
        setProductData(
          Object.entries(agg).map(([name, v]) => ({ name, ...v }))
            .sort((a, b) => b.revenue - a.revenue).slice(0, 10)
        );
      } else {
        setProductData([]);
      }
    }

    if (t === "cashiers") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: sales } = await supabase
        .from("sales").select("cashier_id, total").eq("business_id", businessId!).eq("status", "completed").gte("created_at", monthStart);

      const cashierAgg: Record<string, { sales: number; transactions: number }> = {};
      (sales ?? []).forEach(s => {
        if (!cashierAgg[s.cashier_id]) cashierAgg[s.cashier_id] = { sales: 0, transactions: 0 };
        cashierAgg[s.cashier_id].sales += Number(s.total);
        cashierAgg[s.cashier_id].transactions += 1;
      });

      const cashierIds = Object.keys(cashierAgg);
      if (cashierIds.length) {
        const { data: profiles } = await supabase
          .from("profiles").select("id, full_name").in("id", cashierIds);
        const nameMap: Record<string, string> = {};
        (profiles ?? []).forEach(p => { nameMap[p.id] = p.full_name || "Unknown"; });

        setCashierData(
          cashierIds.map(id => ({
            name: nameMap[id] || id.slice(0, 8),
            ...cashierAgg[id],
          })).sort((a, b) => b.sales - a.sales)
        );
      } else {
        setCashierData([]);
      }
    }
    setLoading(false);
  }

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const tabs: { key: Tab; label: string; icon: typeof Calendar }[] = [
    { key: "daily", label: "Daily Sales", icon: Calendar },
    { key: "products", label: "Product Performance", icon: Package },
    { key: "cashiers", label: "Cashier Performance", icon: Users },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Sales analytics and performance insights</p>
        </div>

        {/* Tab selector */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <Button key={t.key} variant={tab === t.key ? "default" : "outline"} size="sm"
              onClick={() => setTab(t.key)}>
              <t.icon className="h-4 w-4 mr-2" /> {t.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Daily Sales */}
            {tab === "daily" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-border bg-card p-5">
                    <p className="text-sm text-muted-foreground">Total Revenue (30d)</p>
                    <p className="font-display text-2xl font-bold mt-1">{fmt(dailyData.reduce((s, d) => s + d.revenue, 0))}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5">
                    <p className="text-sm text-muted-foreground">Total Transactions (30d)</p>
                    <p className="font-display text-2xl font-bold mt-1">{dailyData.reduce((s, d) => s + d.transactions, 0)}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5">
                    <p className="text-sm text-muted-foreground">Avg Daily Revenue</p>
                    <p className="font-display text-2xl font-bold mt-1">{fmt(dailyData.reduce((s, d) => s + d.revenue, 0) / 30)}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-display font-semibold mb-4">Daily Revenue (Last 30 Days)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }} interval={4} />
                      <YAxis className="text-xs fill-muted-foreground" />
                      <Tooltip formatter={(v: number) => [fmt(v), "Revenue"]}
                        contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-display font-semibold mb-4">Transaction Volume</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }} interval={4} />
                      <YAxis className="text-xs fill-muted-foreground" />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      <Line type="monotone" dataKey="transactions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Product Performance */}
            {tab === "products" && (
              <div className="space-y-6">
                {productData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Package className="h-12 w-12 mb-3 opacity-40" />
                    <p className="text-sm font-medium">No sales data this month</p>
                  </div>
                ) : (
                  <>
                    <div className="grid lg:grid-cols-2 gap-6">
                      <div className="rounded-xl border border-border bg-card p-5">
                        <h3 className="font-display font-semibold mb-4">Top Products by Revenue</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={productData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis type="number" className="text-xs fill-muted-foreground" />
                            <YAxis dataKey="name" type="category" width={120} className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: number) => [fmt(v), "Revenue"]}
                              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-5">
                        <h3 className="font-display font-semibold mb-4">Units Sold Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={productData} dataKey="sold" nameKey="name" cx="50%" cy="50%"
                              outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false} fontSize={10}>
                              {productData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="text-left font-medium p-4">#</th>
                            <th className="text-left font-medium p-4">Product</th>
                            <th className="text-right font-medium p-4">Sold</th>
                            <th className="text-right font-medium p-4">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productData.map((p, i) => (
                            <tr key={p.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="p-4 text-muted-foreground">{i + 1}</td>
                              <td className="p-4 font-medium">{p.name}</td>
                              <td className="p-4 text-right">{p.sold}</td>
                              <td className="p-4 text-right font-semibold">{fmt(p.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Cashier Performance */}
            {tab === "cashiers" && (
              <div className="space-y-6">
                {cashierData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Users className="h-12 w-12 mb-3 opacity-40" />
                    <p className="text-sm font-medium">No cashier data this month</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-border bg-card p-5">
                      <h3 className="font-display font-semibold mb-4">Cashier Sales (This Month)</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={cashierData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                          <YAxis className="text-xs fill-muted-foreground" />
                          <Tooltip formatter={(v: number) => [fmt(v), "Sales"]}
                            contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                          <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="text-left font-medium p-4">Cashier</th>
                            <th className="text-right font-medium p-4">Sales</th>
                            <th className="text-right font-medium p-4">Transactions</th>
                            <th className="text-right font-medium p-4">Avg per Tx</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cashierData.map(c => (
                            <tr key={c.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="p-4 font-medium">{c.name}</td>
                              <td className="p-4 text-right font-semibold">{fmt(c.sales)}</td>
                              <td className="p-4 text-right">{c.transactions}</td>
                              <td className="p-4 text-right text-muted-foreground">{fmt(c.transactions > 0 ? c.sales / c.transactions : 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
