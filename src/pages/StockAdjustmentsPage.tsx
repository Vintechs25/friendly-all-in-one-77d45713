import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Loader2, ClipboardMinus, Search } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

interface StockAdjustment {
  id: string;
  product_id: string;
  quantity: number;
  reason: string;
  notes: string | null;
  created_at: string;
  product_name?: string;
}

const reasons = [
  { value: "damage", label: "Damaged Goods" },
  { value: "theft", label: "Theft / Shrinkage" },
  { value: "count_correction", label: "Stock Count Correction" },
  { value: "expired", label: "Expired Products" },
  { value: "return_to_supplier", label: "Returned to Supplier" },
  { value: "other", label: "Other" },
];

export default function StockAdjustmentsPage() {
  const { user, profile } = useAuth();
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [branchId, setBranchId] = useState<string | null>(null);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const businessId = profile?.business_id;

  const load = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    const [adjRes, prodRes, brRes] = await Promise.all([
      supabase.from("stock_adjustments").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100),
      supabase.from("products").select("*").eq("business_id", businessId).eq("is_active", true).order("name"),
      supabase.from("branches").select("id").eq("business_id", businessId).eq("is_active", true).limit(1),
    ]);
    const prods = prodRes.data ?? [];
    setProducts(prods);
    setBranchId(brRes.data?.[0]?.id ?? null);
    const prodMap = new Map(prods.map(p => [p.id, p.name]));
    setAdjustments((adjRes.data ?? []).map(a => ({ ...a, product_name: prodMap.get(a.product_id) ?? "Unknown" })));
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const filtered = adjustments.filter(a =>
    (a.product_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async () => {
    if (!businessId || !branchId || !user || !productId || !reason) {
      toast.error("Product and reason are required");
      return;
    }
    const qty = parseInt(quantity);
    if (!qty) { toast.error("Quantity must be non-zero"); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from("stock_adjustments").insert({
        business_id: businessId, branch_id: branchId, product_id: productId,
        quantity: qty, reason, notes: notes || null, adjusted_by: user.id,
      });
      if (error) { toast.error(error.message); return; }

      // Update inventory
      const { data: inv } = await supabase.from("inventory").select("id, quantity").eq("product_id", productId).eq("branch_id", branchId).maybeSingle();
      if (inv) {
        await supabase.from("inventory").update({ quantity: Math.max(0, inv.quantity + qty) }).eq("id", inv.id);
      } else if (qty > 0) {
        await supabase.from("inventory").insert({ product_id: productId, branch_id: branchId, quantity: qty });
      }

      // Audit log
      await supabase.from("audit_logs").insert({
        business_id: businessId, user_id: user.id,
        action: "stock_adjustment", table_name: "inventory",
        record_id: productId,
        new_data: { quantity: qty, reason, notes },
      });

      toast.success("Stock adjusted");
      setDialogOpen(false);
      setProductId(""); setQuantity(""); setReason(""); setNotes("");
      load();
    } finally { setSaving(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Stock Adjustments</h1>
            <p className="text-muted-foreground text-sm mt-1">Record damages, theft, corrections and other inventory changes</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Adjustment</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search adjustments..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ClipboardMinus className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">No stock adjustments recorded</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-medium p-4">Date</th>
                    <th className="text-left font-medium p-4">Product</th>
                    <th className="text-right font-medium p-4">Qty</th>
                    <th className="text-left font-medium p-4">Reason</th>
                    <th className="text-left font-medium p-4 hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="p-4 font-medium">{a.product_name}</td>
                      <td className={`p-4 text-right font-semibold ${a.quantity < 0 ? "text-destructive" : "text-success"}`}>
                        {a.quantity > 0 ? "+" : ""}{a.quantity}
                      </td>
                      <td className="p-4 capitalize">{a.reason.replace("_", " ")}</td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground">{a.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Stock Adjustment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity (negative to reduce) *</Label>
              <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. -5 for removal" />
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  {reasons.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional details" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Record Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
