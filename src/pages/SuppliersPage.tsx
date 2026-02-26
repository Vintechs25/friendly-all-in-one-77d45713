import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Search, Plus, Loader2, Truck, Pencil, Trash2, Phone, Mail, MapPin, User } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Supplier = Tables<"suppliers">;

const emptyForm = {
  name: "", contact_person: "", email: "", phone: "", address: "",
};

export default function SuppliersPage() {
  const { profile } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const businessId = profile?.business_id;

  const load = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("suppliers").select("*").eq("business_id", businessId).eq("is_active", true).order("name");
    setSuppliers(data ?? []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contact_person ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name, contact_person: s.contact_person ?? "", email: s.email ?? "",
      phone: s.phone ?? "", address: s.address ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!businessId || !form.name.trim()) { toast.error("Supplier name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        business_id: businessId,
        name: form.name.trim(),
        contact_person: form.contact_person.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", editing.id);
        if (error) { toast.error(error.message); return; }
        toast.success("Supplier updated");
      } else {
        const { error } = await supabase.from("suppliers").insert(payload);
        if (error) { toast.error(error.message); return; }
        toast.success("Supplier added");
      }
      setDialogOpen(false);
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this supplier?")) return;
    await supabase.from("suppliers").update({ is_active: false }).eq("id", id);
    toast.success("Supplier deactivated");
    load();
  };

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Suppliers</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your product suppliers</p>
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add Supplier</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search suppliers..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Truck className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">{suppliers.length === 0 ? "No suppliers yet" : "No matching suppliers"}</p>
            {suppliers.length === 0 && <Button variant="outline" className="mt-4" onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add your first supplier</Button>}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(s => (
              <div key={s.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-base">{s.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {s.contact_person && <div className="flex items-center gap-2"><User className="h-3.5 w-3.5" />{s.contact_person}</div>}
                  {s.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{s.phone}</div>}
                  {s.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{s.email}</div>}
                  {s.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{s.address}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Supplier Name *</Label><Input value={form.name} onChange={e => updateField("name", e.target.value)} placeholder="e.g. Unilever Kenya" /></div>
            <div className="space-y-2"><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => updateField("contact_person", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => updateField("phone", e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={e => updateField("email", e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={e => updateField("address", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : editing ? "Update" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
