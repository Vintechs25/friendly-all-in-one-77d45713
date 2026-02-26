import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, CreditCard } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Plan = Tables<"subscription_plans">;

const emptyForm = {
  name: "", plan_type: "starter" as const,
  price_monthly: "0", price_yearly: "0",
  max_branches: "1", max_users: "5", max_products: "100",
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadPlans = async () => {
    setLoading(true);
    const { data } = await supabase.from("subscription_plans").select("*").order("price_monthly");
    setPlans(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadPlans(); }, []);

  const openAdd = () => { setEditingPlan(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: Plan) => {
    setEditingPlan(p);
    setForm({
      name: p.name, plan_type: p.plan_type as any,
      price_monthly: String(p.price_monthly), price_yearly: String(p.price_yearly),
      max_branches: String(p.max_branches), max_users: String(p.max_users), max_products: String(p.max_products),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Plan name required"); return; }
    setSaving(true);
    const data = {
      name: form.name, plan_type: form.plan_type as any,
      price_monthly: parseFloat(form.price_monthly) || 0,
      price_yearly: parseFloat(form.price_yearly) || 0,
      max_branches: parseInt(form.max_branches) || 1,
      max_users: parseInt(form.max_users) || 5,
      max_products: parseInt(form.max_products) || 100,
    };

    if (editingPlan) {
      const { error } = await supabase.from("subscription_plans").update(data).eq("id", editingPlan.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Plan updated");
    } else {
      const { error } = await supabase.from("subscription_plans").insert(data);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Plan created");
    }
    setSaving(false);
    setDialogOpen(false);
    loadPlans();
  };

  const update = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Subscription Plans</h1>
            <p className="text-muted-foreground text-sm mt-1">Define pricing tiers and limits</p>
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add Plan</Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <CreditCard className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">No plans defined yet</p>
            <Button variant="outline" className="mt-4" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" /> Create first plan
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-border bg-card p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{plan.plan_type}</span>
                  <button onClick={() => openEdit(plan)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                <h3 className="font-display text-lg font-bold mb-1">{plan.name}</h3>
                <div className="mb-4">
                  <span className="font-display text-3xl font-bold">${plan.price_monthly}</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground flex-1">
                  <p>Up to <span className="text-foreground font-medium">{plan.max_branches}</span> branches</p>
                  <p>Up to <span className="text-foreground font-medium">{plan.max_users}</span> users</p>
                  <p>Up to <span className="text-foreground font-medium">{plan.max_products}</span> products</p>
                </div>
                {plan.price_yearly > 0 && (
                  <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
                    ${plan.price_yearly}/yr (save {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%)
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Plan Name *</Label>
              <Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="e.g. Professional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Monthly Price ($)</Label>
                <Input type="number" min="0" step="0.01" value={form.price_monthly} onChange={e => update("price_monthly", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Yearly Price ($)</Label>
                <Input type="number" min="0" step="0.01" value={form.price_yearly} onChange={e => update("price_yearly", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Max Branches</Label>
                <Input type="number" min="1" value={form.max_branches} onChange={e => update("max_branches", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max Users</Label>
                <Input type="number" min="1" value={form.max_users} onChange={e => update("max_users", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max Products</Label>
                <Input type="number" min="1" value={form.max_products} onChange={e => update("max_products", e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingPlan ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
