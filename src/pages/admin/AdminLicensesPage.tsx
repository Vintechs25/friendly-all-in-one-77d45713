import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Shield,
  ShieldOff,
  Plus,
  Monitor,
  RefreshCw,
  Key,
  Copy,
  Loader2,
} from "lucide-react";

interface License {
  id: string;
  business_id: string;
  license_key: string;
  subscription_plan: string;
  status: string;
  expires_at: string;
  allowed_device_count: number;
  grace_period_hours: number;
  last_validated_at: string | null;
  created_at: string;
  businesses?: { name: string } | null;
}

interface Device {
  id: string;
  device_fingerprint: string;
  device_name: string | null;
  is_active: boolean;
  last_seen_at: string;
  registered_at: string;
}

export default function AdminLicensesPage() {
  const { session } = useAuth();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({
    business_id: "",
    subscription_plan: "starter",
    allowed_device_count: "2",
    grace_period_hours: "72",
    expires_days: "365",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [licRes, bizRes] = await Promise.all([
      supabase.from("licenses").select("*, businesses(name)").order("created_at", { ascending: false }),
      supabase.from("businesses").select("id, name").order("name"),
    ]);
    setLicenses((licRes.data as any) || []);
    setBusinesses(bizRes.data || []);
    setLoading(false);
  }

  async function loadDevices(licenseId: string) {
    const { data } = await supabase
      .from("device_registrations")
      .select("*")
      .eq("license_id", licenseId)
      .order("registered_at", { ascending: false });
    setDevices(data || []);
  }

  async function generateLicense() {
    if (!genForm.business_id) return;
    setGenerating(true);
    try {
      const expiresAt = new Date(Date.now() + parseInt(genForm.expires_days) * 86400000).toISOString();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "vzerzgmywwhvcgkezkhh";
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/license-server?action=generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            business_id: genForm.business_id,
            subscription_plan: genForm.subscription_plan,
            allowed_device_count: parseInt(genForm.allowed_device_count),
            grace_period_hours: parseInt(genForm.grace_period_hours),
            expires_at: expiresAt,
          }),
        }
      );
      const result = await res.json();
      if (result.success) {
        toast({ title: "License Generated", description: `Key: ${result.license.license_key}` });
        setShowGenerate(false);
        loadData();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to generate license", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  async function toggleSuspend(license: License) {
    const action = license.status === "suspended" ? "reactivate" : "suspend";
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "vzerzgmywwhvcgkezkhh";
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/license-server?action=${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ license_id: license.id }),
        }
      );
      const result = await res.json();
      if (result.success) {
        toast({ title: "Success", description: `License ${action}d successfully.` });
        loadData();
      }
    } catch {
      toast({ title: "Error", description: `Failed to ${action} license`, variant: "destructive" });
    }
  }

  async function deactivateDevice(deviceId: string) {
    await supabase.from("device_registrations").update({ is_active: false }).eq("id", deviceId);
    if (selectedLicense) loadDevices(selectedLicense.id);
    toast({ title: "Device deactivated" });
  }

  const statusColor: Record<string, string> = {
    active: "bg-green-500/10 text-green-700 border-green-500/30",
    expired: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
    suspended: "bg-destructive/10 text-destructive border-destructive/30",
    terminated: "bg-muted text-muted-foreground border-border",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">License Management</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Generate, monitor, and manage business licenses
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Generate License
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate New License</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Business</Label>
                    <Select value={genForm.business_id} onValueChange={(v) => setGenForm({ ...genForm, business_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                      <SelectContent>
                        {businesses.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subscription Plan</Label>
                    <Select value={genForm.subscription_plan} onValueChange={(v) => setGenForm({ ...genForm, subscription_plan: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Max Devices</Label>
                      <Input type="number" value={genForm.allowed_device_count} onChange={(e) => setGenForm({ ...genForm, allowed_device_count: e.target.value })} />
                    </div>
                    <div>
                      <Label>Grace Period (hrs)</Label>
                      <Input type="number" value={genForm.grace_period_hours} onChange={(e) => setGenForm({ ...genForm, grace_period_hours: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Validity (days)</Label>
                    <Input type="number" value={genForm.expires_days} onChange={(e) => setGenForm({ ...genForm, expires_days: e.target.value })} />
                  </div>
                  <Button className="w-full" onClick={generateLicense} disabled={generating || !genForm.business_id}>
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Key className="h-4 w-4 mr-1" />}
                    Generate License Key
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left font-medium p-4">Business</th>
                    <th className="text-left font-medium p-4">License Key</th>
                    <th className="text-left font-medium p-4">Plan</th>
                    <th className="text-left font-medium p-4">Status</th>
                    <th className="text-left font-medium p-4">Expires</th>
                    <th className="text-left font-medium p-4">Devices</th>
                    <th className="text-left font-medium p-4">Last Validated</th>
                    <th className="text-right font-medium p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((lic) => (
                    <tr key={lic.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="p-4 font-medium">{(lic as any).businesses?.name || "Unknown"}</td>
                      <td className="p-4">
                        <button
                          className="flex items-center gap-1 font-mono text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80"
                          onClick={() => { navigator.clipboard.writeText(lic.license_key); toast({ title: "Copied!" }); }}
                        >
                          {lic.license_key.slice(0, 16)}…
                          <Copy className="h-3 w-3" />
                        </button>
                      </td>
                      <td className="p-4 capitalize">{lic.subscription_plan}</td>
                      <td className="p-4">
                        <Badge variant="outline" className={statusColor[lic.status] || ""}>
                          {lic.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(lic.expires_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <button
                          className="flex items-center gap-1 text-primary hover:underline"
                          onClick={() => { setSelectedLicense(lic); loadDevices(lic.id); }}
                        >
                          <Monitor className="h-3 w-3" /> {lic.allowed_device_count} max
                        </button>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {lic.last_validated_at ? new Date(lic.last_validated_at).toLocaleString() : "Never"}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant={lic.status === "suspended" ? "default" : "destructive"}
                          size="sm"
                          onClick={() => toggleSuspend(lic)}
                        >
                          {lic.status === "suspended" ? (
                            <><Shield className="h-3 w-3 mr-1" /> Reactivate</>
                          ) : (
                            <><ShieldOff className="h-3 w-3 mr-1" /> Suspend</>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {licenses.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No licenses generated yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Devices Dialog */}
        <Dialog open={!!selectedLicense} onOpenChange={(o) => !o && setSelectedLicense(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registered Devices</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              {devices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No devices registered.</p>
              ) : (
                devices.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{d.device_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{d.device_fingerprint}</p>
                      <p className="text-xs text-muted-foreground">
                        Last seen: {new Date(d.last_seen_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={d.is_active ? "default" : "secondary"}>
                        {d.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {d.is_active && (
                        <Button variant="outline" size="sm" onClick={() => deactivateDevice(d.id)}>
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
