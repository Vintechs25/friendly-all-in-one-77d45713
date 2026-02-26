import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Search, Plus, Loader2, ClipboardList, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type PO = Tables<"purchase_orders">;
type Supplier = Tables<"suppliers">;
type Product = Tables<"products">;

interface POItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ordered: "bg-primary/10 text-primary",
  partially_received: "bg-warning/10 text-warning",
  received: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function PurchaseOrdersPage() {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<(PO & { supplier_name?: string })[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [branchId, setBranchId] = useState<string | null>(null);

  // Form
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItem[]>([]);

  // Receive
  const [receivePO, setReceivePO] = useState<PO | null>(null);
  const [receiveItems, setReceiveItems] = useState<{ id: string; product_name: string; quantity: number; received_quantity: number; receiving: number }[]>([]);

  const businessId = profile?.business_id;

  const load = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    const [poRes, supRes, prodRes, brRes] = await Promise.all([
      supabase.from("purchase_orders").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("suppliers").select("*").eq("business_id", businessId).eq("is_active", true).order("name"),
      supabase.from("products").select("*").eq("business_id", businessId).eq("is_active", true).order("name"),
      supabase.from("branches").select("id").eq("business_id", businessId).eq("is_active", true).limit(1),
    ]);
    const sups = supRes.data ?? [];
    setSuppliers(sups);
    setProducts(prodRes.data ?? []);
    setBranchId(brRes.data?.[0]?.id ?? null);
    const supMap = new Map(sups.map(s => [s.id, s.name]));
    setOrders((poRes.data ?? []).map(po => ({ ...po, supplier_name: supMap.get(po.supplier_id) ?? "Unknown" })));
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter(o =>
    o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.supplier_name ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreate = () => {
    setSupplierId("");
    setExpectedDate("");
    setNotes("");
    setItems([{ product_id: "", product_name: "", quantity: 1, unit_cost: 0 }]);
    setDialogOpen(true);
  };

  const addItem = () => setItems(prev => [...prev, { product_id: "", product_name: "", quantity: 1, unit_cost: 0 }]);

  const updateItem = (idx: number, field: string, value: string | number) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      if (field === "product_id") {
        const p = products.find(pr => pr.id === value);
        return { ...it, product_id: value as string, product_name: p?.name ?? "", unit_cost: p?.cost ?? 0 };
      }
      return { ...it, [field]: value };
    }));
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleCreate = async () => {
    if (!businessId || !branchId || !user) return;
    if (!supplierId) { toast.error("Select a supplier"); return; }
    const validItems = items.filter(it => it.product_id && it.quantity > 0);
    if (validItems.length === 0) { toast.error("Add at least one item"); return; }

    setSaving(true);
    try {
      const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
      const total = validItems.reduce((s, it) => s + it.quantity * it.unit_cost, 0);

      const { data: po, error } = await supabase.from("purchase_orders").insert({
        business_id: businessId, branch_id: branchId, supplier_id: supplierId,
        order_number: orderNumber, total, expected_date: expectedDate || null, notes: notes || null,
        status: "ordered",
      }).select().single();

      if (error || !po) { toast.error(error?.message ?? "Failed"); return; }

      await supabase.from("purchase_order_items").insert(
        validItems.map(it => ({ purchase_order_id: po.id, product_id: it.product_id, quantity: it.quantity, unit_cost: it.unit_cost }))
      );

      toast.success(`Purchase order ${orderNumber} created`);
      setDialogOpen(false);
      load();
    } finally { setSaving(false); }
  };

  const openReceive = async (po: PO) => {
    const { data: poItems } = await supabase.from("purchase_order_items").select("*").eq("purchase_order_id", po.id);
    if (!poItems) return;
    setReceivePO(po);
    setReceiveItems(poItems.map(it => ({
      id: it.id,
      product_name: products.find(p => p.id === it.product_id)?.name ?? "Unknown",
      quantity: it.quantity,
      received_quantity: it.received_quantity,
      receiving: it.quantity - it.received_quantity,
    })));
    setReceiveDialogOpen(true);
  };

  const handleReceive = async () => {
    if (!receivePO || !branchId) return;
    setSaving(true);
    try {
      for (const item of receiveItems) {
        if (item.receiving <= 0) continue;
        const newReceived = item.received_quantity + item.receiving;
        await supabase.from("purchase_order_items").update({ received_quantity: newReceived }).eq("id", item.id);

        // Find product_id from PO item
        const { data: poItem } = await supabase.from("purchase_order_items").select("product_id").eq("id", item.id).single();
        if (poItem) {
          const { data: inv } = await supabase.from("inventory").select("id, quantity").eq("product_id", poItem.product_id).eq("branch_id", branchId).maybeSingle();
          if (inv) {
            await supabase.from("inventory").update({ quantity: inv.quantity + item.receiving }).eq("id", inv.id);
          } else {
            await supabase.from("inventory").insert({ product_id: poItem.product_id, branch_id: branchId, quantity: item.receiving });
          }
        }
      }

      // Update PO status
      const allReceived = receiveItems.every(it => it.received_quantity + it.receiving >= it.quantity);
      const anyReceived = receiveItems.some(it => it.receiving > 0 || it.received_quantity > 0);
      const newStatus = allReceived ? "received" : anyReceived ? "partially_received" : receivePO.status;
      await supabase.from("purchase_orders").update({ status: newStatus }).eq("id", receivePO.id);

      toast.success("Stock received and inventory updated");
      setReceiveDialogOpen(false);
      load();
    } finally { setSaving(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Purchase Orders</h1>
            <p className="text-muted-foreground text-sm mt-1">Order stock from suppliers and receive deliveries</p>
          </div>
          <Button onClick={openCreate} disabled={suppliers.length === 0}>
            <Plus className="h-4 w-4 mr-2" /> New Purchase Order
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">{orders.length === 0 ? "No purchase orders yet" : "No matching orders"}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-medium p-4">Order #</th>
                    <th className="text-left font-medium p-4">Supplier</th>
                    <th className="text-right font-medium p-4">Total</th>
                    <th className="text-center font-medium p-4">Status</th>
                    <th className="text-left font-medium p-4 hidden md:table-cell">Expected</th>
                    <th className="text-center font-medium p-4 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(po => (
                    <tr key={po.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">{po.order_number}</td>
                      <td className="p-4">{po.supplier_name}</td>
                      <td className="p-4 text-right">KSh {po.total.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[po.status] ?? ""}`}>
                          {po.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground">{po.expected_date ?? "—"}</td>
                      <td className="p-4 text-center">
                        {(po.status === "ordered" || po.status === "partially_received") && (
                          <Button variant="outline" size="sm" onClick={() => openReceive(po)}>
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

      {/* Create PO Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expected Date</Label>
                <Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" /> Add Item</Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select value={item.product_id} onValueChange={v => updateItem(idx, "product_id", v)}>
                        <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input type="number" min="1" className="w-20" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} />
                    <Input type="number" step="0.01" className="w-24" placeholder="Cost" value={item.unit_cost} onChange={e => updateItem(idx, "unit_cost", parseFloat(e.target.value) || 0)} />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
            </div>

            <div className="text-right font-semibold">
              Total: KSh {items.reduce((s, it) => s + it.quantity * it.unit_cost, 0).toFixed(2)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Receive Stock — {receivePO?.order_number}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {receiveItems.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">Ordered: {item.quantity} | Already received: {item.received_quantity}</p>
                </div>
                <Input
                  type="number" min="0" max={item.quantity - item.received_quantity}
                  className="w-20" value={item.receiving}
                  onChange={e => setReceiveItems(prev => prev.map((it, i) => i === idx ? { ...it, receiving: Math.min(parseInt(e.target.value) || 0, it.quantity - it.received_quantity) } : it))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReceive} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Receiving...</> : "Receive Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
