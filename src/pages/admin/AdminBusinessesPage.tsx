import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Building2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");

  const loadBusinesses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) toast.error(error.message);
    else setBusinesses(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadBusinesses(); }, []);

  const toggleActive = async (biz: Business) => {
    const { error } = await supabase
      .from("businesses")
      .update({ is_active: !biz.is_active })
      .eq("id", biz.id);

    if (error) toast.error(error.message);
    else {
      toast.success(`${biz.name} ${biz.is_active ? "deactivated" : "activated"}`);
      loadBusinesses();
    }
  };

  const changePlan = async (bizId: string, plan: string) => {
    const { error } = await supabase
      .from("businesses")
      .update({ subscription_plan: plan as any })
      .eq("id", bizId);

    if (error) toast.error(error.message);
    else {
      toast.success("Plan updated");
      loadBusinesses();
    }
  };

  const filtered = businesses.filter(b => {
    const matchSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.email ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchPlan = filterPlan === "all" || b.subscription_plan === filterPlan;
    return matchSearch && matchPlan;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Businesses</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all businesses on the platform</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search businesses..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Building2 className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">No businesses found</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-medium p-4">Business</th>
                    <th className="text-left font-medium p-4 hidden sm:table-cell">Industry</th>
                    <th className="text-left font-medium p-4 hidden md:table-cell">Email</th>
                    <th className="text-center font-medium p-4">Plan</th>
                    <th className="text-center font-medium p-4">Status</th>
                    <th className="text-left font-medium p-4 hidden lg:table-cell">Trial Ends</th>
                    <th className="text-center font-medium p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((biz) => (
                    <tr key={biz.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="p-4 font-medium">{biz.name}</td>
                      <td className="p-4 hidden sm:table-cell capitalize text-muted-foreground">{biz.industry}</td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground">{biz.email ?? "—"}</td>
                      <td className="p-4 text-center">
                        <Select value={biz.subscription_plan} onValueChange={(v) => changePlan(biz.id, v)}>
                          <SelectTrigger className="h-8 w-[130px] mx-auto text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="starter">Starter</SelectItem>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${biz.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                          {biz.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4 hidden lg:table-cell text-muted-foreground text-xs">
                        {biz.trial_ends_at ? new Date(biz.trial_ends_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(biz)}
                          className="text-xs"
                        >
                          {biz.is_active ? (
                            <><ToggleRight className="h-4 w-4 mr-1 text-success" /> Deactivate</>
                          ) : (
                            <><ToggleLeft className="h-4 w-4 mr-1 text-destructive" /> Activate</>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
