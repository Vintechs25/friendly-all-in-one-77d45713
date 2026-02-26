import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Search, Plus, Loader2, Users, Phone, Mail, MapPin, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Customer = Tables<"customers">;

interface CustomerWithStats extends Customer {
  total_spent: number;
  total_purchases: number;
}

export default function CustomersPage() {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<CustomerWithStats | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const businessId = profile?.business_id;

  const loadCustomers = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);

    const { data: custs } = await supabase
      .from("customers").select("*").eq("business_id", businessId).order("name");

    // Get sales stats per customer
    const { data: sales } = await supabase
      .from("sales").select("customer_id, total").eq("business_id", businessId).eq("status", "completed");

    const statsMap: Record<string, { spent: number; count: number }> = {};
    (sales ?? []).forEach(s => {
      if (!s.customer_id) return;
      if (!statsMap[s.customer_id]) statsMap[s.customer_id] = { spent: 0, count: 0 };
      statsMap[s.customer_id].spent += Number(s.total);
      statsMap[s.customer_id].count += 1;
    });

    setCustomers((custs ?? []).map(c => ({
      ...c,
      total_spent: statsMap[c.id]?.spent ?? 0,
      total_purchases: statsMap[c.id]?.count ?? 0,
    })));
    setLoading(false);
  }, [businessId]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", phone: "", email: "", address: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: CustomerWithStats) => {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", address: c.address ?? "", notes: c.notes ?? "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!businessId || !form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const data = {
        business_id: businessId,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editingId) {
        const { error } = await supabase.from("customers").update(data).eq("id", editingId);
        if (error) { toast.error(error.message); return; }
        toast.success("Customer updated");
      } else {
        const { error } = await supabase.from("customers").insert(data);
        if (error) { toast.error(error.message); return; }
        toast.success("Customer added");
      }
      setDialogOpen(false);
      loadCustomers();
    } finally { setSaving(false); }
  };

  const viewHistory = async (c: CustomerWithStats) => {
    setDetailCustomer(c);
    setLoadingHistory(true);
    const { data } = await supabase
      .from("sales")
      .select("id, receipt_number, total, payment_method, created_at")
      .eq("customer_id", c.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(20);
    setPurchaseHistory(data ?? []);
    setLoadingHistory(false);
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone ?? "").includes(searchTerm) ||
    (c.email ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Customers</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage customers and track purchase history</p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" /> Add Customer
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customers..." className="pl-9" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">{customers.length === 0 ? "No customers yet" : "No matching customers"}</p>
            {customers.length === 0 && (
              <Button variant="outline" className="mt-4" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" /> Add your first customer
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(c => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => viewHistory(c)}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{c.name}</h3>
                    {c.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Mail className="h-3 w-3" /> {c.email}
                      </div>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); openEdit(c); }}
                    className="text-xs text-primary hover:underline">Edit</button>
                </div>
                <div className="flex gap-4 mt-4 pt-3 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                    <p className="font-semibold text-sm">{fmt(c.total_spent)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Purchases</p>
                    <p className="font-semibold text-sm">{c.total_purchases}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Loyalty</p>
                    <p className="font-semibold text-sm">{c.loyalty_points} pts</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Customer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Customer name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+254..." />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Address" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "Update" : "Add"} Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase History Dialog */}
      <Dialog open={!!detailCustomer} onOpenChange={() => setDetailCustomer(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailCustomer?.name} — Purchase History</DialogTitle>
          </DialogHeader>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : purchaseHistory.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No purchase history</div>
          ) : (
            <div className="space-y-2">
              {purchaseHistory.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div>
                    <p className="text-sm font-medium font-mono">{s.receipt_number}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(s.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{fmt(Number(s.total))}</p>
                    <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary capitalize">
                      {s.payment_method.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
