import DashboardLayout from "@/components/DashboardLayout";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const stats = [
  { label: "Today's Sales", value: "$4,285", change: "+12.5%", up: true, icon: DollarSign },
  { label: "Transactions", value: "156", change: "+8.2%", up: true, icon: ShoppingCart },
  { label: "Revenue (MTD)", value: "$52,430", change: "+22.1%", up: true, icon: TrendingUp },
  { label: "Low Stock Items", value: "8", change: "-3", up: false, icon: Package },
];

const recentSales = [
  { id: "INV-001", customer: "Walk-in Customer", items: 5, total: "$125.40", time: "2 min ago", method: "Cash" },
  { id: "INV-002", customer: "Jane Smith", items: 3, total: "$89.00", time: "15 min ago", method: "M-Pesa" },
  { id: "INV-003", customer: "Acme Corp", items: 12, total: "$540.00", time: "32 min ago", method: "Card" },
  { id: "INV-004", customer: "Walk-in Customer", items: 1, total: "$24.99", time: "45 min ago", method: "Cash" },
  { id: "INV-005", customer: "Bob's Hardware", items: 8, total: "$312.50", time: "1 hr ago", method: "Mobile Money" },
];

const topProducts = [
  { name: "Coca-Cola 500ml", sold: 245, revenue: "$367.50" },
  { name: "White Bread", sold: 189, revenue: "$283.50" },
  { name: "Cooking Oil 1L", sold: 134, revenue: "$536.00" },
  { name: "Sugar 1kg", sold: 122, revenue: "$170.80" },
  { name: "Milk 500ml", sold: 98, revenue: "$117.60" },
];

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back, John. Here's your business overview.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="mt-3 flex items-end gap-2">
                <span className="font-display text-2xl font-bold">{stat.value}</span>
                <span className={`flex items-center text-xs font-medium ${stat.up ? "text-success" : "text-destructive"}`}>
                  {stat.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Sales */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display font-semibold">Recent Sales</h2>
              <span className="text-xs text-muted-foreground">Last 24 hours</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left font-medium p-4">Invoice</th>
                    <th className="text-left font-medium p-4 hidden sm:table-cell">Customer</th>
                    <th className="text-left font-medium p-4 hidden md:table-cell">Payment</th>
                    <th className="text-right font-medium p-4">Total</th>
                    <th className="text-right font-medium p-4 hidden sm:table-cell">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-medium">{sale.id}</td>
                      <td className="p-4 hidden sm:table-cell">{sale.customer}</td>
                      <td className="p-4 hidden md:table-cell">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {sale.method}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold">{sale.total}</td>
                      <td className="p-4 text-right text-muted-foreground hidden sm:table-cell">{sale.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Products */}
          <div className="rounded-xl border border-border bg-card">
            <div className="p-5 border-b border-border">
              <h2 className="font-display font-semibold">Top Products</h2>
              <p className="text-xs text-muted-foreground mt-1">This month's best sellers</p>
            </div>
            <div className="p-4 space-y-4">
              {topProducts.map((product, i) => (
                <div key={product.name} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sold} sold</p>
                  </div>
                  <span className="text-sm font-semibold">{product.revenue}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
