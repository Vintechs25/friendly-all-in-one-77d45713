import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Search, Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SaleForRefund {
  id: string;
  receipt_number: string;
  total: number;
  created_at: string;
  status: string;
  items: { product_id: string; product_name: string; quantity: number; unit_price: number; total: number }[];
}

interface Refund {
  id: string;
  refund_number: string;
  amount: number;
  reason: string;
  status: string;
  restock_items: boolean;
  created_at: string;
  sale_id: string;
}

export default function RefundsPage() {
  const { user, profile } = useAuth();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchReceipt, setSearchReceipt] = useState("");
  const [foundSale, setFoundSale] = useState<SaleForRefund | null>(null);
  const [searching, setSearching] = useState(false);
  const [reason, setReason] = useState("customer_request");
  const [restockItems, setRestockItems] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [processing, setProcessing] = useState(false);

  const businessId = profile?.business_id;

  const loadRefunds = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("refunds")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(50);
    setRefunds((data ?? []) as Refund[]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { loadRefunds(); }, [loadRefunds]);

  const searchSale = async () => {
    if (!searchReceipt.trim() || !businessId) return;
    setSearching(true);
    setFoundSale(null);

    const { data: sale } = await supabase
      .from("sales")
      .select("id, receipt_number, total, created_at, status")
      .eq("business_id", businessId)
      .eq("receipt_number", searchReceipt.trim())
      .single();

    if (!sale) {
      toast.error("Sale not found");
      setSearching(false);
      return;
    }
    if (sale.status === "refunded") {
      toast.error("This sale has already been refunded");
      setSearching(false);
      return;
    }

    const { data: items } = await supabase
      .from("sale_items")
      .select("product_id, product_name, quantity, unit_price, total")
      .eq("sale_id", sale.id);

    setFoundSale({
      ...sale,
      total: Number(sale.total),
      items: (items ?? []).map(i => ({ ...i, unit_price: Number(i.unit_price), total: Number(i.total) })),
    });

    // Select all items by default
    const sel: Record<string, number> = {};
    (items ?? []).forEach(i => { sel[i.product_id] = i.quantity; });
    setSelectedItems(sel);
    setSearching(false);
  };

  const refundAmount = foundSale
    ? foundSale.items.reduce((s, i) => {
        const qty = selectedItems[i.product_id] ?? 0;
        return s + (i.unit_price * qty);
      }, 0)
    : 0;

  const handleRefund = async () => {
    if (!foundSale || !user || !businessId) return;
    setProcessing(true);
    try {
      const refundNumber = `RFD-${Date.now().toString(36).toUpperCase()}`;

      const { data: refund, error } = await supabase.from("refunds").insert({
        business_id: businessId,
        sale_id: foundSale.id,
        refund_number: refundNumber,
        amount: refundAmount,
        reason,
        refunded_by: user.id,
        restock_items: restockItems,
        status: "completed",
      }).select().single();

      if (error) { toast.error(error.message); return; }

      // Insert refund items
      const refundItems = foundSale.items
        .filter(i => (selectedItems[i.product_id] ?? 0) > 0)
        .map(i => ({
          refund_id: refund.id,
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: selectedItems[i.product_id],
          unit_price: i.unit_price,
          total: i.unit_price * selectedItems[i.product_id],
        }));

      await supabase.from("refund_items").insert(refundItems);

      // Update sale status
      await supabase.from("sales").update({
        status: "refunded" as const,
      }).eq("id", foundSale.id);

      // Restock if needed
      if (restockItems) {
        const { data: branches } = await supabase
          .from("branches").select("id").eq("business_id", businessId).eq("is_active", true).limit(1);
        const branchId = branches?.[0]?.id;
        if (branchId) {
          for (const item of refundItems) {
            const { data: inv } = await supabase
              .from("inventory")
              .select("id, quantity")
              .eq("product_id", item.product_id)
              .eq("branch_id", branchId)
              .single();
            if (inv) {
              await supabase.from("inventory")
                .update({ quantity: inv.quantity + item.quantity })
                .eq("id", inv.id);
            }
          }
        }
      }

      // Audit log
      await supabase.from("audit_logs").insert({
        business_id: businessId,
        user_id: user.id,
        action: "refund_processed",
        record_id: refund.id,
        table_name: "refunds",
        new_data: { refund_number: refundNumber, amount: refundAmount, sale_receipt: foundSale.receipt_number },
      });

      toast.success(`Refund ${refundNumber} processed for ${fmt(refundAmount)}`);
      setDialogOpen(false);
      setFoundSale(null);
      setSearchReceipt("");
      setSelectedItems({});
      loadRefunds();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const fmt = (n: number) => `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-KE", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Refunds</h1>
            <p className="text-muted-foreground text-sm mt-1">Process returns and track refund history</p>
          </div>
          <Button onClick={() => { setDialogOpen(true); setFoundSale(null); setSearchReceipt(""); }}>
            <RotateCcw className="h-4 w-4 mr-2" /> Process Refund
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : refunds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <RotateCcw className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">No refunds processed yet</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-medium p-4">Refund #</th>
                    <th className="text-right font-medium p-4">Amount</th>
                    <th className="text-left font-medium p-4 hidden sm:table-cell">Reason</th>
                    <th className="text-center font-medium p-4 hidden md:table-cell">Restocked</th>
                    <th className="text-left font-medium p-4 hidden sm:table-cell">Date</th>
                    <th className="text-center font-medium p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map(r => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium font-mono text-xs">{r.refund_number}</td>
                      <td className="p-4 text-right font-semibold text-destructive">{fmt(r.amount)}</td>
                      <td className="p-4 hidden sm:table-cell capitalize">{r.reason.replace("_", " ")}</td>
                      <td className="p-4 text-center hidden md:table-cell">{r.restock_items ? "Yes" : "No"}</td>
                      <td className="p-4 hidden sm:table-cell text-muted-foreground">{fmtTime(r.created_at)}</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Process Refund Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Process Refund</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {/* Search sale */}
            <div className="space-y-2">
              <Label>Receipt Number</Label>
              <div className="flex gap-2">
                <Input value={searchReceipt} onChange={e => setSearchReceipt(e.target.value)}
                  placeholder="RCP-XXXXX" onKeyDown={e => e.key === "Enter" && searchSale()} />
                <Button variant="outline" onClick={searchSale} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {foundSale && (
              <>
                <div className="rounded-lg border border-border p-3 bg-muted/30">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{foundSale.receipt_number}</span>
                    <span className="font-semibold">{fmt(foundSale.total)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{fmtTime(foundSale.created_at)}</p>
                </div>

                {/* Items to refund */}
                <div className="space-y-2">
                  <Label>Items to Refund</Label>
                  {foundSale.items.map(item => (
                    <div key={item.product_id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{fmt(item.unit_price)} × max {item.quantity}</p>
                      </div>
                      <Input
                        type="number" min="0" max={item.quantity}
                        className="w-20 text-center"
                        value={selectedItems[item.product_id] ?? 0}
                        onChange={e => setSelectedItems(prev => ({
                          ...prev, [item.product_id]: Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0)),
                        }))}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer_request">Customer Request</SelectItem>
                      <SelectItem value="defective">Defective Product</SelectItem>
                      <SelectItem value="wrong_item">Wrong Item</SelectItem>
                      <SelectItem value="overcharge">Overcharge</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="restock" checked={restockItems}
                    onChange={e => setRestockItems(e.target.checked)}
                    className="rounded border-border" />
                  <Label htmlFor="restock" className="text-sm cursor-pointer">Restock returned items to inventory</Label>
                </div>

                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Refund Amount</span>
                    <span className="text-destructive">{fmt(refundAmount)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRefund} disabled={!foundSale || refundAmount <= 0 || processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
