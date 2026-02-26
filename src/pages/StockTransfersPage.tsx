import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Loader2, ArrowRightLeft, Search, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Transfer = Tables<"stock_transfers">;
type Branch = Tables<"branches">;
type Product = Tables<"products">;

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  in_transit: "bg-primary/10 text-primary",
  received: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function StockTransfersPage() {
  const { user, profile } = useAuth();
  const [transfers, setTransfers] = useState<(Transfer & { from_name?: string; to_name?: string; product_name?: string })[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [fromBranch, setFromBranch] = useState("");
  const [toBranch, setToBranch] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const businessId = profile?.business_id;

  const load = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    const [tRes, brRes, pRes] = await Promise.all([
      supabase.from("stock_transfers").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("branches").select("*").eq("business_id", businessId).eq("is_active", true),
      supabase.from("products").select("*").eq("business_id", businessId).eq("is_active", true).order("name"),
    ]);
    const brs = brRes.data ?? [];
    setBranches(brs);
    setProducts(pRes.data ?? []);
    const brMap = new Map(brs.map(b => [b.id, b.name]));
    const pMap = new Map((pRes.data ?? []).map(p => [p.id, p.name]));
    setTransfers((tRes.data ?? []).map(t => ({
      ...t, from_name: brMap.get(t.from_branch_id), to_name: brMap.get(t.to_branch_id), product_name: pMap.get(t.product_id),
    })));
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const filtered = transfers.filter(t =>
    (t.product_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.from_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.to_name ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async () => {
    if (!businessId || !user) return;
    if (!fromBranch || !toBranch || !productId) { toast.error("All fields are required"); return; }
    if (fromBranch === toBranch) { toast.error("Source and destination must differ"); return; }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { toast.error("Quantity must be positive"); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from("stock_transfers").insert({
        business_id: businessId, from_branch_id: fromBranch, to_branch_id: toBranch,
        product_id: productId, quantity: qty, initiated_by: user.id, notes: notes || null,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Transfer created");
      setDialogOpen(false);
      setFromBranch(""); setToBranch(""); setProductId(""); setQuantity(""); setNotes("");
      load();
    } finally { setSaving(false); }
  };

  const receiveTransfer = async (t: Transfer) => {
    // Deduct from source, add to destination
    const { data: srcInv } = await supabase.from("inventory").select("id, quantity").eq("product_id", t.product_id).eq("branch_id", t.from_branch_id).maybeSingle();
    if (srcInv) {
      await supabase.from("inventory").update({ quantity: Math.max(0, srcInv.quantity - t.quantity) }).eq("id", srcInv.id);
    }
    const { data: dstInv } = await supabase.from("inventory").select("id, quantity").eq("product_id", t.product_id).eq("branch_id", t.to_branch_id).maybeSingle();
    if (dstInv) {
      await supabase.from("inventory").update({ quantity: dstInv.quantity + t.quantity }).eq("id", dstInv.id);
    } else {
      await supabase.from("inventory").insert({ product_id: t.product_id, branch_id: t.to_branch_id, quantity: t.quantity });
    }
    await supabase.from("stock_transfers").update({ status: "received" }).eq("id", t.id);
    toast.success("Transfer received — inventory updated");
    load();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Stock Transfers</h1>
            <p className="text-muted-foreground text-sm mt-1">Transfer stock between branches</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} disabled={branches.length < 2}>
            <Plus className="h-4 w-4 mr-2" /> New Transfer
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search transfers..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ArrowRightLeft className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">No stock transfers</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-medium p-4">Date</th>
                    <th className="text-left font-medium p-4">Product</th>
                    <th className="text-left font-medium p-4">From → To</th>
                    <th className="text-right font-medium p-4">Qty</th>
                    <th className="text-center font-medium p-4">Status</th>
                    <th className="text-center font-medium p-4 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="p-4 font-medium">{t.product_name}</td>
                      <td className="p-4">{t.from_name} → {t.to_name}</td>
                      <td className="p-4 text-right font-semibold">{t.quantity}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[t.status] ?? ""}`}>
                          {t.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {(t.status === "pending" || t.status === "in_transit") && (
                          <Button variant="outline" size="sm" onClick={() => receiveTransfer(t)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Receive
                          </Button>
                        )}
                      </td>
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
          <DialogHeader><DialogTitle>New Stock Transfer</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From Branch *</Label>
                <Select value={fromBranch} onValueChange={setFromBranch}>
                  <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To Branch *</Label>
                <Select value={toBranch} onValueChange={setToBranch}>
                  <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>{branches.filter(b => b.id !== fromBranch).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : "Create Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
