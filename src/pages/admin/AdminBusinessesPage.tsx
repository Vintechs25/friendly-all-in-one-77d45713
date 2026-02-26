import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Search, Loader2, Building2, ToggleLeft, ToggleRight, Plus, Upload, Palette } from "lucide-react";
import { toast } from "sonner";
import type { Tables, Database } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;
type IndustryType = Database["public"]["Enums"]["industry_type"];

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");

  // Provision state
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provisionLoading, setProvisionLoading] = useState(false);
  // Business
  const [bizName, setBizName] = useState("");
  const [bizIndustry, setBizIndustry] = useState<IndustryType>("supermarket");
  const [bizEmail, setBizEmail] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  // Branding
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("160 84% 39%");
  const [secondaryColor, setSecondaryColor] = useState("220 60% 50%");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [receiptFooter, setReceiptFooter] = useState("Thank you for shopping with us!");
  const [currencyCode, setCurrencyCode] = useState("KES");
  const [currencySymbol, setCurrencySymbol] = useState("KSh");
  const [taxLabel, setTaxLabel] = useState("VAT");
  const [taxRate, setTaxRate] = useState("16");
  const [branchName, setBranchName] = useState("Main Branch");
  const [platformWatermark, setPlatformWatermark] = useState(true);
  // Owner
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
    else { toast.success("Plan updated"); loadBusinesses(); }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleProvision = async () => {
    if (!bizName || !ownerEmail || !ownerPassword || !ownerName) {
      toast.error("Please fill all required fields");
      return;
    }
    if (ownerPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setProvisionLoading(true);
    try {
      // 1. Create business
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
      if (bizError) throw new Error("Business creation failed: " + bizError.message);

      // 2. Upload logo if provided
      let logoUrl: string | null = null;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${business.id}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("business-logos")
          .upload(path, logoFile, { upsert: true });
        if (uploadError) {
          console.error("Logo upload failed:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("business-logos")
            .getPublicUrl(path);
          logoUrl = urlData.publicUrl;
          // Update business logo_url
          await supabase.from("businesses").update({ logo_url: logoUrl }).eq("id", business.id);
        }
      }

      // 3. Create business settings (branding)
      await supabase.from("business_settings").insert({
        business_id: business.id,
        logo_url: logoUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        invoice_prefix: invoicePrefix,
        receipt_footer_text: receiptFooter,
        currency_code: currencyCode,
        currency_symbol: currencySymbol,
        default_tax_label: taxLabel,
        default_tax_rate: parseFloat(taxRate) || 16,
        platform_watermark: platformWatermark,
      });

      // 4. Create branch
      const { data: branch } = await supabase
        .from("branches")
        .insert({ business_id: business.id, name: branchName || "Main Branch" })
        .select()
        .single();

      // 5. Create owner account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: ownerEmail,
        password: ownerPassword,
        options: { data: { full_name: ownerName } },
      });
      if (signUpError) throw new Error("Owner account failed: " + signUpError.message);
      const ownerId = signUpData.user?.id;
      if (!ownerId) throw new Error("User creation returned no ID");

      await new Promise((r) => setTimeout(r, 800));

      // 6. Link profile
      await supabase
        .from("profiles")
        .update({ business_id: business.id, full_name: ownerName })
        .eq("id", ownerId);

      // 7. Assign role
      await supabase.from("user_roles").insert({
        user_id: ownerId,
        role: "business_owner" as any,
        business_id: business.id,
        hierarchy_level: 2,
      });

      // 8. Audit log
      await supabase.from("audit_logs").insert({
        action: "business_provisioned",
        table_name: "businesses",
        record_id: business.id,
        business_id: business.id,
        new_data: {
          business_name: bizName,
          owner_email: ownerEmail,
          industry: bizIndustry,
          branding: { primaryColor, secondaryColor, invoicePrefix, currencyCode, taxLabel },
        } as any,
      });

      toast.success(`"${bizName}" provisioned successfully!`, {
        description: `Owner: ${ownerEmail}`,
      });

      // Reset
      setProvisionOpen(false);
      resetForm();
      loadBusinesses();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProvisionLoading(false);
    }
  };

  const resetForm = () => {
    setBizName(""); setBizIndustry("supermarket"); setBizEmail(""); setBizPhone(""); setBizAddress("");
    setLogoFile(null); setLogoPreview(null);
    setPrimaryColor("160 84% 39%"); setSecondaryColor("220 60% 50%");
    setInvoicePrefix("INV"); setReceiptFooter("Thank you for shopping with us!");
    setCurrencyCode("KES"); setCurrencySymbol("KSh"); setTaxLabel("VAT"); setTaxRate("16");
    setBranchName("Main Branch"); setPlatformWatermark(true);
    setOwnerName(""); setOwnerEmail(""); setOwnerPassword("");
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Provision New Business</DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="details" className="pt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1">Business Details</TabsTrigger>
                  <TabsTrigger value="branding" className="flex-1">Branding & Config</TabsTrigger>
                  <TabsTrigger value="owner" className="flex-1">Owner Account</TabsTrigger>
                </TabsList>

                {/* ── Tab 1: Business Details ── */}
                <TabsContent value="details" className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Business Name *</Label>
                    <Input value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="Naivas Supermarket" />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select value={bizIndustry} onValueChange={(v) => setBizIndustry(v as IndustryType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["retail", "supermarket", "hardware", "hotel", "restaurant", "pharmacy", "wholesale", "other"].map((v) => (
                          <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                        ))}
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
                  <div className="space-y-2">
                    <Label>Default Branch Name</Label>
                    <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="Main Branch" />
                  </div>
                </TabsContent>

                {/* ── Tab 2: Branding ── */}
                <TabsContent value="branding" className="space-y-4 pt-2">
                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <Label>Business Logo</Label>
                    <div className="flex items-center gap-4">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-lg object-cover border border-border" />
                      ) : (
                        <div className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <input type="file" accept="image/*" className="hidden" id="logo-upload" onChange={handleLogoSelect} />
                        <Button variant="outline" size="sm" asChild>
                          <label htmlFor="logo-upload" className="cursor-pointer">
                            <Upload className="h-4 w-4 mr-1" /> Upload Logo
                          </label>
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">Max 2MB. PNG or JPG.</p>
                      </div>
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1"><Palette className="h-3 w-3" /> Primary Color (HSL)</Label>
                      <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="160 84% 39%" />
                      <div className="h-6 rounded border border-border" style={{ backgroundColor: `hsl(${primaryColor})` }} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1"><Palette className="h-3 w-3" /> Secondary Color (HSL)</Label>
                      <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} placeholder="220 60% 50%" />
                      <div className="h-6 rounded border border-border" style={{ backgroundColor: `hsl(${secondaryColor})` }} />
                    </div>
                  </div>

                  {/* Invoice & Receipt */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Invoice Prefix</Label>
                      <Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} placeholder="INV" />
                    </div>
                    <div className="space-y-2">
                      <Label>Receipt Footer</Label>
                      <Input value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} placeholder="Thank you!" />
                    </div>
                  </div>

                  {/* Currency & Tax */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Currency Code</Label>
                      <Input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} placeholder="KES" />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency Symbol</Label>
                      <Input value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} placeholder="KSh" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Rate (%)</Label>
                      <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="16" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Tax Label</Label>
                    <Input value={taxLabel} onChange={(e) => setTaxLabel(e.target.value)} placeholder="VAT" />
                  </div>

                  {/* Platform watermark toggle */}
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">Platform Watermark</p>
                      <p className="text-xs text-muted-foreground">Show "Powered by SwiftPOS" in sidebar</p>
                    </div>
                    <Switch checked={platformWatermark} onCheckedChange={setPlatformWatermark} />
                  </div>
                </TabsContent>

                {/* ── Tab 3: Owner Account ── */}
                <TabsContent value="owner" className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    This account will be the Business Owner with full control over the tenant.
                  </p>
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

                  <Button
                    className="w-full"
                    onClick={handleProvision}
                    disabled={provisionLoading || !bizName || !ownerEmail || !ownerPassword || !ownerName}
                  >
                    {provisionLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Provisioning...</> : "Provision Business"}
                  </Button>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search businesses..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
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
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {biz.logo_url ? (
                            <img src={biz.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {biz.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium">{biz.name}</span>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell capitalize text-muted-foreground">{biz.industry}</td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground">{biz.email ?? "—"}</td>
                      <td className="p-4 text-center">
                        <Select value={biz.subscription_plan} onValueChange={(v) => changePlan(biz.id, v)}>
                          <SelectTrigger className="h-8 w-[130px] mx-auto text-xs"><SelectValue /></SelectTrigger>
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
                        <Button variant="ghost" size="sm" onClick={() => toggleActive(biz)} className="text-xs">
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
