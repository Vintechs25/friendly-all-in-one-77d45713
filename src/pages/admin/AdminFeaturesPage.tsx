import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, ToggleLeft, Building2 } from "lucide-react";
import { toast } from "sonner";

const AVAILABLE_FEATURES = [
  { key: "pos", label: "Point of Sale", description: "Core POS terminal for sales" },
  { key: "inventory", label: "Inventory Management", description: "Stock tracking and procurement" },
  { key: "restaurant_mode", label: "Restaurant Mode", description: "Table management, kitchen orders" },
  { key: "hotel_mode", label: "Hotel Mode", description: "Room management, bookings" },
  { key: "pharmacy_mode", label: "Pharmacy Mode", description: "Batch/expiry tracking, prescriptions" },
  { key: "hardware_mode", label: "Hardware Mode", description: "Unit conversions, bulk pricing" },
  { key: "customer_loyalty", label: "Customer Loyalty", description: "Points system and credit tracking" },
  { key: "multi_branch", label: "Multi-Branch", description: "Manage multiple locations" },
  { key: "advanced_reports", label: "Advanced Reports", description: "Profit analytics and exports" },
  { key: "audit_logs", label: "Audit Logs", description: "Activity and change tracking" },
];

interface Business { id: string; name: string; industry: string; }
interface Toggle { id: string; feature_name: string; is_enabled: boolean; business_id: string; }

export default function AdminFeaturesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBiz, setSelectedBiz] = useState<string>("");
  const [toggles, setToggles] = useState<Toggle[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("businesses").select("id, name, industry").order("name");
      setBusinesses(data ?? []);
      if (data?.length) setSelectedBiz(data[0].id);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedBiz) return;
    const loadToggles = async () => {
      const { data } = await supabase
        .from("feature_toggles")
        .select("*")
        .eq("business_id", selectedBiz);
      setToggles(data ?? []);
    };
    loadToggles();
  }, [selectedBiz]);

  const handleToggle = async (featureKey: string, enabled: boolean) => {
    setToggling(featureKey);
    const existing = toggles.find(t => t.feature_name === featureKey);

    if (existing) {
      const { error } = await supabase
        .from("feature_toggles")
        .update({ is_enabled: enabled })
        .eq("id", existing.id);
      if (error) { toast.error(error.message); setToggling(null); return; }
    } else {
      const { error } = await supabase
        .from("feature_toggles")
        .insert({ business_id: selectedBiz, feature_name: featureKey, is_enabled: enabled });
      if (error) { toast.error(error.message); setToggling(null); return; }
    }

    // Refresh toggles
    const { data } = await supabase.from("feature_toggles").select("*").eq("business_id", selectedBiz);
    setToggles(data ?? []);
    toast.success(`${featureKey} ${enabled ? "enabled" : "disabled"}`);
    setToggling(null);
  };

  const isEnabled = (key: string) => toggles.find(t => t.feature_name === key)?.is_enabled ?? false;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Feature Toggles</h1>
          <p className="text-muted-foreground text-sm mt-1">Enable or disable modules per business</p>
        </div>

        {businesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Building2 className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">No businesses to manage</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Business:</span>
              <Select value={selectedBiz} onValueChange={setSelectedBiz}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} <span className="text-muted-foreground ml-1 capitalize">({b.industry})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVAILABLE_FEATURES.map((feature) => (
                <div
                  key={feature.key}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ToggleLeft className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{feature.label}</p>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled(feature.key)}
                    onCheckedChange={(v) => handleToggle(feature.key, v)}
                    disabled={toggling === feature.key}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
