import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, TrendingUp, Users, Package, Download, CreditCard, BarChart2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { toast } from "sonner";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

type Tab = "daily" | "products" | "cashiers" | "payments" | "profit";

function downloadCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) { toast.error("No data to export"); return; }
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => {
      const val = row[h];
      if (typeof val === "string" && (val.includes(",") || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val ?? "";
    }).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV exported");
}

export default function ReportsPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>("daily");
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<{ date: string; revenue: number; transactions: number }[]>([]);
  const [productData, setProductData] = useState<{ name: string; sold: number; revenue: number }[]>([]);
  const [cashierData, setCashierData] = useState<{ name: string; sales: number; transactions: number }[]>([]);
  const [paymentData, setPaymentData] = useState<{ method: string; amount: number; count: number }[]>([]);
  const [profitData, setProfitData] = useState<{ name: string; revenue: number; cost: number; profit: number; margin: number }[]>([]);

  const businessId = profile?.business_id;

  useEffect(() => {
    if (!businessId) { setLoading(false); return; }
    loadReport(tab);
  }, [businessId, tab]);

  async function loadReport(t: Tab) {
    setLoading(true);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    if (t === "daily") {
      const { data: sales } = await supabase
        .from("sales").select("total, created_at")
        .eq("business_id", businessId!).eq("status", "completed").gte("created_at", thirtyDaysAgo);

      const dayMap: Record<string, { revenue: number; transactions: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dayMap[key] = { revenue: 0, transactions: 0 };
      }
      (sales ?? []).forEach(s => {
        const key = new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (dayMap[key]) { dayMap[key].revenue += Number(s.total); dayMap[key].transactions += 1; }
      });
      setDailyData(Object.entries(dayMap).map(([date, v]) => ({ date, ...v })));
    }

    if (t === "products") {
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
        setProductData(Object.entries(agg).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 10));
      } else { setProductData([]); }
    }

    if (t === "cashiers") {
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
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", cashierIds);
        const nameMap: Record<string, string> = {};
        (profiles ?? []).forEach(p => { nameMap[p.id] = p.full_name || "Unknown"; });
        setCashierData(cashierIds.map(id => ({ name: nameMap[id] || id.slice(0, 8), ...cashierAgg[id] })).sort((a, b) => b.sales - a.sales));
      } else { setCashierData([]); }
    }

    if (t === "payments") {
      const { data: payments } = await supabase
        .from("payments").select("method, amount").eq("business_id", businessId!).gte("created_at", monthStart);
      const agg: Record<string, { amount: number; count: number }> = {};
      (payments ?? []).forEach(p => {
        const m = p.method ?? "cash";
        if (!agg[m]) agg[m] = { amount: 0, count: 0 };
        agg[m].amount += Number(p.amount);
        agg[m].count += 1;
      });
      setPaymentData(Object.entries(agg).map(([method, v]) => ({ method: method.replace("_", " "), ...v })).sort((a, b) => b.amount - a.amount));
    }

    if (t === "profit") {
      const { data: saleIds } = await supabase
        .from("sales").select("id").eq("business_id", businessId!).eq("status", "completed").gte("created_at", monthStart);
      const ids = (saleIds ?? []).map(s => s.id);
      if (ids.length) {
        const { data: items } = await supabase
          .from("sale_items").select("product_id, product_name, quantity, total, unit_price").in("sale_id", ids);
        // Get cost for each product
        const productIds = [...new Set((items ?? []).map(i => i.product_id).filter(Boolean))];
        const { data: products } = await supabase.from("products").select("id, cost").in("id", productIds as string[]);
        const costMap = new Map((products ?? []).map(p => [p.id, Number(p.cost)]));

        const agg: Record<string, { revenue: number; cost: number }> = {};
        (items ?? []).forEach(i => {
          if (!agg[i.product_name]) agg[i.product_name] = { revenue: 0, cost: 0 };
          agg[i.product_name].revenue += Number(i.total);
          agg[i.product_name].cost += (costMap.get(i.product_id!) ?? 0) * i.quantity;
        });
        setProfitData(
          Object.entries(agg).map(([name, v]) => {
            const profit = v.revenue - v.cost;
            return { name, revenue: v.revenue, cost: v.cost, profit, margin: v.revenue > 0 ? (profit / v.revenue) * 100 : 0 };
          }).sort((a, b) => b.profit - a.profit).slice(0, 15)
        );
      } else { setProfitData([]); }
    }

    setLoading(false);
  }

  const fmt = (n: number) => `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const tabs: { key: Tab; label: string; icon: typeof Calendar }[] = [
    { key: "daily", label: "Daily Sales", icon: Calendar },
    { key: "products", label: "Products", icon: Package },
    { key: "cashiers", label: "Cashiers", icon: Users },
    { key: "payments", label: "Payments", icon: CreditCard },
    { key: "profit", label: "Profit", icon: BarChart2 },
  ];

  const getCSVData = () => {
    switch (tab) {
      case "daily": return dailyData;
      case "products": return productData;
      case "cashiers": return cashierData;
      case "payments": return paymentData;
      case "profit": return profitData.map(p => ({ ...p, margin: `${p.margin.toFixed(1)}%` }));
      default: return [];
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Reports</h1>
            <p className="text-muted-foreground text-sm mt-1">Sales analytics and performance insights</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(getCSVData(), `report-${tab}`)}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <Button key={t.key} variant={tab === t.key ? "default" : "outline"} size="sm" onClick={() => setTab(t.key)}>
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
                      <Tooltip formatter={(v: number) => [fmt(v), "Revenue"]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
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
                            <Tooltip formatter={(v: number) => [fmt(v), "Revenue"]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-5">
                        <h3 className="font-display font-semibold mb-4">Units Sold Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={productData} dataKey="sold" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false} fontSize={10}>
                              {productData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-border bg-muted/50">
                          <th className="text-left font-medium p-4">#</th>
                          <th className="text-left font-medium p-4">Product</th>
                          <th className="text-right font-medium p-4">Sold</th>
                          <th className="text-right font-medium p-4">Revenue</th>
                        </tr></thead>
                        <tbody>{productData.map((p, i) => (
                          <tr key={p.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="p-4 text-muted-foreground">{i + 1}</td>
                            <td className="p-4 font-medium">{p.name}</td>
                            <td className="p-4 text-right">{p.sold}</td>
                            <td className="p-4 text-right font-semibold">{fmt(p.revenue)}</td>
                          </tr>
                        ))}</tbody>
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
                    <Users className="h-12 w-12 mb-3 opacity-40" /><p className="text-sm font-medium">No cashier data this month</p>
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
                          <Tooltip formatter={(v: number) => [fmt(v), "Sales"]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                          <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-border bg-muted/50">
                          <th className="text-left font-medium p-4">Cashier</th>
                          <th className="text-right font-medium p-4">Sales</th>
                          <th className="text-right font-medium p-4">Transactions</th>
                          <th className="text-right font-medium p-4">Avg per Tx</th>
                        </tr></thead>
                        <tbody>{cashierData.map(c => (
                          <tr key={c.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="p-4 font-medium">{c.name}</td>
                            <td className="p-4 text-right font-semibold">{fmt(c.sales)}</td>
                            <td className="p-4 text-right">{c.transactions}</td>
                            <td className="p-4 text-right text-muted-foreground">{fmt(c.transactions > 0 ? c.sales / c.transactions : 0)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Payment Method Breakdown */}
            {tab === "payments" && (
              <div className="space-y-6">
                {paymentData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mb-3 opacity-40" /><p className="text-sm font-medium">No payment data this month</p>
                  </div>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {paymentData.map(p => (
                        <div key={p.method} className="rounded-xl border border-border bg-card p-5">
                          <p className="text-sm text-muted-foreground capitalize">{p.method}</p>
                          <p className="font-display text-xl font-bold mt-1">{fmt(p.amount)}</p>
                          <p className="text-xs text-muted-foreground mt-1">{p.count} transactions</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid lg:grid-cols-2 gap-6">
                      <div className="rounded-xl border border-border bg-card p-5">
                        <h3 className="font-display font-semibold mb-4">Revenue by Payment Method</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={paymentData} dataKey="amount" nameKey="method" cx="50%" cy="50%" outerRadius={100}
                              label={({ method, percent }) => `${method} (${(percent * 100).toFixed(0)}%)`} labelLine={false} fontSize={10}>
                              {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => [fmt(v), "Amount"]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-5">
                        <h3 className="font-display font-semibold mb-4">Transaction Count by Method</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={paymentData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="method" className="text-xs fill-muted-foreground capitalize" />
                            <YAxis className="text-xs fill-muted-foreground" />
                            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Profit Margin Analysis */}
            {tab === "profit" && (
              <div className="space-y-6">
                {profitData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <BarChart2 className="h-12 w-12 mb-3 opacity-40" /><p className="text-sm font-medium">No profit data this month</p>
                  </div>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="rounded-xl border border-border bg-card p-5">
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="font-display text-2xl font-bold mt-1">{fmt(profitData.reduce((s, p) => s + p.revenue, 0))}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-5">
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="font-display text-2xl font-bold mt-1">{fmt(profitData.reduce((s, p) => s + p.cost, 0))}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-5">
                        <p className="text-sm text-muted-foreground">Gross Profit</p>
                        <p className="font-display text-2xl font-bold mt-1 text-primary">{fmt(profitData.reduce((s, p) => s + p.profit, 0))}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-5">
                      <h3 className="font-display font-semibold mb-4">Profit by Product</h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={profitData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis type="number" className="text-xs fill-muted-foreground" />
                          <YAxis dataKey="name" type="category" width={120} className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => [fmt(v)]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} name="Revenue" />
                          <Bar dataKey="cost" fill="hsl(var(--destructive))" radius={[0, 3, 3, 0]} name="Cost" opacity={0.6} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-border bg-muted/50">
                          <th className="text-left font-medium p-4">Product</th>
                          <th className="text-right font-medium p-4">Revenue</th>
                          <th className="text-right font-medium p-4">Cost</th>
                          <th className="text-right font-medium p-4">Profit</th>
                          <th className="text-right font-medium p-4">Margin</th>
                        </tr></thead>
                        <tbody>{profitData.map(p => (
                          <tr key={p.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="p-4 font-medium">{p.name}</td>
                            <td className="p-4 text-right">{fmt(p.revenue)}</td>
                            <td className="p-4 text-right text-muted-foreground">{fmt(p.cost)}</td>
                            <td className="p-4 text-right font-semibold text-primary">{fmt(p.profit)}</td>
                            <td className={`p-4 text-right font-medium ${p.margin >= 30 ? "text-primary" : p.margin >= 15 ? "text-warning" : "text-destructive"}`}>
                              {p.margin.toFixed(1)}%
                            </td>
                          </tr>
                        ))}</tbody>
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
