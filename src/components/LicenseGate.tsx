import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLicense } from "@/contexts/LicenseContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Key, Loader2, AlertTriangle, LogOut } from "lucide-react";
import { toast } from "sonner";

/**
 * Full-screen gate shown when a business has no active license (trial ended).
 * The business owner enters the license key provided by the platform admin.
 */
export default function LicenseGate() {
  const { signOut, session } = useAuth();
  const { refreshLicense } = useLicense();
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      toast.error("Please enter a license key");
      return;
    }
    setActivating(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "vzerzgmywwhvcgkezkhh";
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/license-server?action=activate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ license_key: licenseKey.trim() }),
        }
      );
      const result = await res.json();
      if (result.success) {
        toast.success("License activated! Redirecting...");
        await refreshLicense();
      } else {
        toast.error(result.error || "Invalid license key");
      }
    } catch {
      toast.error("Failed to activate license. Check your connection.");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle className="text-xl">License Required</CardTitle>
          <CardDescription>
            Your trial has ended or no active license was found. Please enter the license key provided by your platform administrator to continue using the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="LIC-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                className="pl-9 font-mono text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleActivate()}
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={handleActivate}
            disabled={activating || !licenseKey.trim()}
          >
            {activating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Activate License
          </Button>
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Contact your platform administrator if you don't have a license key.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
