import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, DollarSign, ShoppingCart, Loader2, TrendingUp, Activity } from "lucide-react";

interface PlatformStats {
  totalBusinesses: number;
  activeBusinesses: number;
  totalUsers: number;
  totalSales: number;
  totalRevenue: number;
  trialBusinesses: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentBusinesses, setRecentBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [bizRes, profilesRes, salesRes, trialRes, recentRes] = await Promise.all([
        supabase.from("businesses").select("id, is_active"),
        supabase.from("profiles").select("id"),
        supabase.from("sales").select("id, total"),
        supabase.from("businesses").select("id").eq("subscription_plan", "trial"),
        supabase.from("businesses").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      const businesses = bizRes.data ?? [];
      const sales = salesRes.data ?? [];

      setStats({
        totalBusinesses: businesses.length,
        activeBusinesses: businesses.filter(b => b.is_active).length,
        totalUsers: profilesRes.data?.length ?? 0,
        totalSales: sales.length,
        totalRevenue: sales.reduce((s, sale) => s + (sale.total || 0), 0),
        trialBusinesses: trialRes.data?.length ?? 0,
      });

      setRecentBusinesses(recentRes.data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const cards = [
    { label: "Total Businesses", value: stats?.totalBusinesses ?? 0, icon: Building2, color: "text-primary" },
    { label: "Active Businesses", value: stats?.activeBusinesses ?? 0, icon: Activity, color: "text-success" },
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-accent" },
    { label: "Total Sales", value: stats?.totalSales ?? 0, icon: ShoppingCart, color: "text-warning" },
    { label: "Platform Revenue", value: `$${(stats?.totalRevenue ?? 0).toFixed(2)}`, icon: DollarSign, color: "text-primary" },
    { label: "Trial Accounts", value: stats?.trialBusinesses ?? 0, icon: TrendingUp, color: "text-info" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Platform Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Global analytics and system health</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`h-4 w-4 ${card.color}`} />
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <p className="font-display text-xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Recent Businesses */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-4 border-b border-border">
            <h2 className="font-display font-semibold">Recent Businesses</h2>
          </div>
          {recentBusinesses.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No businesses yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-medium p-4">Business</th>
                    <th className="text-left font-medium p-4 hidden sm:table-cell">Industry</th>
                    <th className="text-left font-medium p-4 hidden md:table-cell">Plan</th>
                    <th className="text-center font-medium p-4">Status</th>
                    <th className="text-left font-medium p-4 hidden lg:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBusinesses.map((biz) => (
                    <tr key={biz.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="p-4 font-medium">{biz.name}</td>
                      <td className="p-4 hidden sm:table-cell capitalize text-muted-foreground">{biz.industry}</td>
                      <td className="p-4 hidden md:table-cell capitalize">{biz.subscription_plan}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${biz.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                          {biz.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4 hidden lg:table-cell text-muted-foreground">{new Date(biz.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
