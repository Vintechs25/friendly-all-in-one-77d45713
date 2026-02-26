import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Receipt, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ReceiptPreviewDialog from "@/components/ReceiptPreviewDialog";
import type { ReceiptData } from "@/components/ThermalReceipt";

interface SaleRow {
  id: string;
  receipt_number: string;
  total: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  customer_id: string | null;
}

export default function SalesPage() {
  const { profile } = useAuth();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const businessId = profile?.business_id;

  const loadSales = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const { data } = await supabase
      .from("sales")
      .select("id, receipt_number, total, subtotal, tax_amount, discount_amount, payment_method, status, created_at, customer_id")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(100);
    setSales((data ?? []).map(s => ({ ...s, total: Number(s.total), subtotal: Number(s.subtotal), tax_amount: Number(s.tax_amount), discount_amount: Number(s.discount_amount) })));
    setLoading(false);
  }, [businessId]);

  useEffect(() => { loadSales(); }, [loadSales]);

  const handleReprint = async (sale: SaleRow) => {
    const [itemsRes, bizRes, branchRes] = await Promise.all([
      supabase.from("sale_items").select("product_name, quantity, unit_price, tax_amount, total").eq("sale_id", sale.id),
      supabase.from("businesses").select("name, address, phone").eq("id", businessId!).single(),
      supabase.from("branches").select("name").eq("business_id", businessId!).eq("is_active", true).limit(1),
    ]);

    setReceiptData({
      receiptNumber: sale.receipt_number,
      businessName: bizRes.data?.name || "Business",
      branchName: branchRes.data?.[0]?.name,
      address: bizRes.data?.address || undefined,
      phone: bizRes.data?.phone || undefined,
      cashierName: profile?.full_name || undefined,
      items: (itemsRes.data ?? []).map(i => ({
        name: i.product_name,
        qty: i.quantity,
        unitPrice: Number(i.unit_price),
        taxAmount: Number(i.tax_amount),
        total: Number(i.total),
      })),
      subtotal: sale.subtotal,
      taxAmount: sale.tax_amount,
      discountAmount: sale.discount_amount,
      total: sale.total,
      paymentMethod: sale.payment_method,
      date: new Date(sale.created_at),
    });
    setShowReceipt(true);
  };

  const exportCSV = () => {
    const header = "Receipt,Date,Total,Payment,Status\n";
    const rows = filtered.map(s =>
      `${s.receipt_number},${new Date(s.created_at).toISOString()},${s.total},${s.payment_method},${s.status}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sales-export-${Date.now()}.csv`;
    a.click();
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const fmtDate = (iso: string) => new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const filtered = sales.filter(s =>
    s.receipt_number.toLowerCase().includes(search.toLowerCase())
  );

  const statusStyles: Record<string, string> = {
    completed: "bg-primary/10 text-primary",
    refunded: "bg-destructive/10 text-destructive",
    partially_refunded: "bg-warning/10 text-warning",
    voided: "bg-muted text-muted-foreground",
  };

  return (
    <DashboardLayout>
      <ReceiptPreviewDialog open={showReceipt} onOpenChange={setShowReceipt} data={receiptData} />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Sales History</h1>
            <p className="text-muted-foreground text-sm mt-1">View all transactions and reprint receipts</p>
          </div>
          <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by receipt number..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Receipt className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">No sales found</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-medium p-4">Receipt</th>
                    <th className="text-left font-medium p-4 hidden sm:table-cell">Date</th>
                    <th className="text-left font-medium p-4 hidden md:table-cell">Payment</th>
                    <th className="text-right font-medium p-4">Total</th>
                    <th className="text-center font-medium p-4">Status</th>
                    <th className="text-center font-medium p-4 w-20">Reprint</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium font-mono text-xs">{s.receipt_number}</td>
                      <td className="p-4 text-muted-foreground hidden sm:table-cell">{fmtDate(s.created_at)}</td>
                      <td className="p-4 hidden md:table-cell capitalize">{s.payment_method.replace("_", " ")}</td>
                      <td className="p-4 text-right font-semibold">{fmt(s.total)}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[s.status] ?? "bg-muted text-muted-foreground"}`}>
                          {s.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => handleReprint(s)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Receipt className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
