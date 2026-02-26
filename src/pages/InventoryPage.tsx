import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter, ArrowUpDown, AlertTriangle } from "lucide-react";

const products = [
  { id: 1, name: "Coca-Cola 500ml", sku: "BEV-001", category: "Beverages", stock: 245, reorder: 50, price: 1.50, status: "in-stock" },
  { id: 2, name: "White Bread", sku: "BAK-001", category: "Bakery", stock: 32, reorder: 20, price: 1.50, status: "in-stock" },
  { id: 3, name: "Cooking Oil 1L", sku: "GRO-001", category: "Grocery", stock: 8, reorder: 15, price: 4.00, status: "low-stock" },
  { id: 4, name: "Sugar 1kg", sku: "GRO-002", category: "Grocery", stock: 3, reorder: 25, price: 1.40, status: "low-stock" },
  { id: 5, name: "Milk 500ml", sku: "DAI-001", category: "Dairy", stock: 156, reorder: 30, price: 1.20, status: "in-stock" },
  { id: 6, name: "Rice 2kg", sku: "GRO-003", category: "Grocery", stock: 0, reorder: 20, price: 3.50, status: "out-of-stock" },
  { id: 7, name: "Eggs (Tray)", sku: "DAI-002", category: "Dairy", stock: 67, reorder: 10, price: 4.50, status: "in-stock" },
  { id: 8, name: "Butter 250g", sku: "DAI-003", category: "Dairy", stock: 12, reorder: 15, price: 2.80, status: "low-stock" },
];

const statusStyles: Record<string, string> = {
  "in-stock": "bg-success/10 text-success",
  "low-stock": "bg-warning/10 text-warning",
  "out-of-stock": "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  "in-stock": "In Stock",
  "low-stock": "Low Stock",
  "out-of-stock": "Out of Stock",
};

export default function InventoryPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Inventory</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your products and stock levels</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>

        {/* Alerts */}
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium">3 products are running low on stock</p>
            <p className="text-xs text-muted-foreground">Review and reorder to avoid stockouts</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-9" />
          </div>
          <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
          <Button variant="outline" size="sm"><ArrowUpDown className="h-4 w-4 mr-2" /> Sort</Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left font-medium p-4">Product</th>
                  <th className="text-left font-medium p-4 hidden md:table-cell">SKU</th>
                  <th className="text-left font-medium p-4 hidden sm:table-cell">Category</th>
                  <th className="text-right font-medium p-4">Stock</th>
                  <th className="text-right font-medium p-4 hidden md:table-cell">Price</th>
                  <th className="text-center font-medium p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{product.name}</td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{product.sku}</td>
                    <td className="p-4 hidden sm:table-cell">{product.category}</td>
                    <td className="p-4 text-right font-semibold">{product.stock}</td>
                    <td className="p-4 text-right hidden md:table-cell">${product.price.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[product.status]}`}>
                        {statusLabels[product.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
