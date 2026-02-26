import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Loader2, Building2, ToggleLeft, ToggleRight, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Tables, Database } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;
type IndustryType = Database["public"]["Enums"]["industry_type"];

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");

  // Provision dialog state
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [bizName, setBizName] = useState("");
  const [bizIndustry, setBizIndustry] = useState<IndustryType>("supermarket");
  const [bizEmail, setBizEmail] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

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
      toast.success(`${biz.name} ${biz.is_active ? "suspended" : "activated"}`);
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

  /** Provision a new business + owner account */
  const handleProvision = async () => {
    if (!bizName || !ownerEmail || !ownerPassword || !ownerName) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (ownerPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setProvisionLoading(true);
    try {
      // 1. Create the business
      const { data: business, error: bizError } = await supabase
        .from("businesses")
        .insert({
          name: bizName,
          industry: bizIndustry,
          email: bizEmail || null,
          phone: bizPhone || null,
          address: bizAddress || null,
        })
        .select()
        .single();

      if (bizError) throw new Error("Failed to create business: " + bizError.message);

      // 2. Create default "Main Branch"
      const { data: branch, error: branchError } = await supabase
        .from("branches")
        .insert({ business_id: business.id, name: "Main Branch" })
        .select()
        .single();

      if (branchError) throw new Error("Failed to create branch: " + branchError.message);

      // 3. Create the Business Owner auth account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: ownerEmail,
        password: ownerPassword,
        options: { data: { full_name: ownerName } },
      });

      if (signUpError) throw new Error("Failed to create owner account: " + signUpError.message);
      const ownerId = signUpData.user?.id;
      if (!ownerId) throw new Error("User creation returned no ID");

      // Wait for trigger to create profile
      await new Promise((r) => setTimeout(r, 800));

      // 4. Link owner profile to business
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ business_id: business.id, full_name: ownerName })
        .eq("id", ownerId);

      if (profileError) throw new Error("Failed to link profile: " + profileError.message);

      // 5. Assign business_owner role with hierarchy level 2
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: ownerId,
          role: "business_owner" as any,
          business_id: business.id,
          hierarchy_level: 2,
        });

      if (roleError) throw new Error("Failed to assign role: " + roleError.message);

      // 6. Log audit entry
      await supabase.from("audit_logs").insert({
        action: "business_provisioned",
        table_name: "businesses",
        record_id: business.id,
        new_data: { business_name: bizName, owner_email: ownerEmail } as any,
        business_id: business.id,
      });

      toast.success(`Business "${bizName}" provisioned successfully!`, {
        description: `Owner: ${ownerEmail}`,
      });

      // Reset form
      setProvisionOpen(false);
      setBizName("");
      setBizIndustry("supermarket");
      setBizEmail("");
      setBizPhone("");
      setBizAddress("");
      setOwnerName("");
      setOwnerEmail("");
      setOwnerPassword("");
      loadBusinesses();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProvisionLoading(false);
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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Businesses</h1>
            <p className="text-muted-foreground text-sm mt-1">Provision and manage tenant businesses</p>
          </div>
          <Dialog open={provisionOpen} onOpenChange={setProvisionOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Provision Business</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Provision New Business</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  This will create a new tenant business and its owner account.
                </p>

                {/* Business details */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Business Details</h3>
                  <div className="space-y-2">
                    <Label>Business Name *</Label>
                    <Input value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="Naivas Supermarket" />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select value={bizIndustry} onValueChange={(v) => setBizIndustry(v as IndustryType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">Retail Store</SelectItem>
                        <SelectItem value="supermarket">Supermarket</SelectItem>
                        <SelectItem value="hardware">Hardware Shop</SelectItem>
                        <SelectItem value="hotel">Hotel</SelectItem>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="pharmacy">Pharmacy</SelectItem>
                        <SelectItem value="wholesale">Wholesale</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={bizEmail} onChange={(e) => setBizEmail(e.target.value)} placeholder="info@business.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} placeholder="+254..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} placeholder="Nairobi, Kenya" />
                  </div>
                </div>

                {/* Owner details */}
                <div className="space-y-3 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground">Business Owner Account</h3>
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="John Kamau" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="owner@business.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="Min 6 characters" />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleProvision}
                  disabled={provisionLoading || !bizName || !ownerEmail || !ownerPassword || !ownerName}
                >
                  {provisionLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Provisioning...</> : "Provision Business"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                          {biz.is_active ? "Active" : "Suspended"}
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
                            <><ToggleRight className="h-4 w-4 mr-1 text-success" /> Suspend</>
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
