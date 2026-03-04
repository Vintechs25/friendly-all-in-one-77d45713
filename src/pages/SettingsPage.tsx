import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLicense } from "@/contexts/LicenseContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { User, Lock, Building2, AlertTriangle, Shield, KeyRound, Clock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PaymentConfigCard from "@/components/settings/PaymentConfigCard";

export default function SettingsPage() {
  const { user, profile, session, hasRole, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const { refreshLicense, licenseState } = useLicense();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [endingTrial, setEndingTrial] = useState(false);
  const [showEndTrialDialog, setShowEndTrialDialog] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [hasExistingPin, setHasExistingPin] = useState(false);

  const isBusinessOwner = hasRole("business_owner" as any);
  const isManager = hasRole("manager" as any) || hasRole("branch_manager" as any);
  const canSetPin = isBusinessOwner || isManager;

  // Check if user already has a PIN
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("pin_code")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setHasExistingPin(!!data?.pin_code);
      });
  }, [user]);

  const handleSetPin = async () => {
    if (newPin.length < 4 || newPin.length > 8) {
      toast.error("PIN must be 4–8 digits");
      return;
    }
    if (!/^\d+$/.test(newPin)) {
      toast.error("PIN must contain only numbers");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }
    setSavingPin(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ pin_code: newPin })
        .eq("user_id", user!.id);
      if (error) throw error;
      toast.success(hasExistingPin ? "PIN updated successfully" : "PIN set successfully");
      setHasExistingPin(true);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch {
      toast.error("Failed to save PIN");
    } finally {
      setSavingPin(false);
    }
  };

  const { data: business } = useQuery({
    queryKey: ["my-business", profile?.business_id],
    enabled: !!profile?.business_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses")
        .select("name, subscription_plan, trial_ends_at")
        .eq("id", profile!.business_id!)
        .single();
      return data;
    },
  });

  const { data: shiftSettings } = useQuery({
    queryKey: ["shift-settings", profile?.business_id],
    enabled: !!profile?.business_id && isBusinessOwner,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("require_shift, require_cash_counting")
        .eq("business_id", profile!.business_id!)
        .single();
      return {
        requireShift: (data as any)?.require_shift ?? false,
        requireCashCounting: (data as any)?.require_cash_counting ?? true,
      };
    },
  });

  const toggleShiftSetting = async (field: "require_shift" | "require_cash_counting", value: boolean) => {
    const { error } = await supabase
      .from("business_settings")
      .update({ [field]: value } as any)
      .eq("business_id", profile!.business_id!);
    if (error) {
      toast.error("Failed to update setting");
    } else {
      toast.success("Setting updated");
      queryClient.invalidateQueries({ queryKey: ["shift-settings"] });
    }
  };

  const trialActive = business?.subscription_plan === "trial" &&
    business?.trial_ends_at && new Date(business.trial_ends_at) > new Date();

  const handleUpdateProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", user.id);
    if (error) toast.error("Failed to update profile");
    else toast.success("Profile updated");
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      setNewPassword("");
    }
    setChangingPassword(false);
  };

  const handleEndTrial = async () => {
    setEndingTrial(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "vzerzgmywwhvcgkezkhh";
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/license-server?action=end_trial`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );
      const result = await res.json();
      if (result.success) {
        toast.success("Trial ended. You'll need a license key to continue.");
        setShowEndTrialDialog(false);
        await refreshLicense();
      } else {
        toast.error(result.error || "Failed to end trial");
      }
    } catch {
      toast.error("Failed to end trial");
    } finally {
      setEndingTrial(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Profile</CardTitle>
              <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
              </div>
              <Button onClick={handleUpdateProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Change Password</CardTitle>
              <CardDescription>Update your account password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" />
              </div>
              <Button onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? "Updating..." : "Update Password"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Business</CardTitle>
              <CardDescription>Your business details and subscription.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {business ? (
                <>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{business.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      Plan: {business.subscription_plan}
                    </p>
                    {trialActive && (
                      <p className="text-xs text-muted-foreground">
                        Trial ends: {new Date(business.trial_ends_at!).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* License status */}
                  <div className="flex items-center gap-2 text-xs">
                    <Shield className="h-3.5 w-3.5" />
                    <span className="capitalize">{licenseState === "active" ? "Licensed" : licenseState}</span>
                  </div>

                  {/* End Trial button — only for business owners on active trial */}
                  {isBusinessOwner && trialActive && (
                    <Dialog open={showEndTrialDialog} onOpenChange={setShowEndTrialDialog}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="w-full">
                          <AlertTriangle className="h-4 w-4 mr-1" /> End Trial Now
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>End Trial Period?</DialogTitle>
                          <DialogDescription>
                            This will immediately end your trial. All users will be required to enter a license key 
                            (provided by the platform administrator) to continue accessing the system. This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowEndTrialDialog(false)}>Cancel</Button>
                          <Button variant="destructive" onClick={handleEndTrial} disabled={endingTrial}>
                            {endingTrial ? "Ending..." : "End Trial"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No business linked to your account yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Manager PIN - visible to owners & managers */}
        {canSetPin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" /> Manager PIN
              </CardTitle>
              <CardDescription>
                {hasExistingPin
                  ? "Update your PIN used for authorizing sensitive actions (refunds, price overrides, hardware changes)."
                  : "Set a PIN to authorize sensitive actions like refunds, price overrides, and hardware changes."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>New PIN (4–8 digits)</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter new PIN"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Re-enter PIN"
                />
              </div>
              <Button onClick={handleSetPin} disabled={savingPin || !newPin || !confirmPin}>
                {savingPin ? "Saving..." : hasExistingPin ? "Update PIN" : "Set PIN"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Shift Management Settings - visible to business owners */}
        {isBusinessOwner && profile?.business_id && shiftSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" /> Shift Management
              </CardTitle>
              <CardDescription>
                Control whether cashiers must open/close shifts and count cash at the drawer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Require Shifts</Label>
                  <p className="text-xs text-muted-foreground">
                    Cashiers must open a shift before accessing the POS and close it on logout.
                  </p>
                </div>
                <Switch
                  checked={shiftSettings.requireShift}
                  onCheckedChange={(checked) => toggleShiftSetting("require_shift", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Cash Counting at Drawer</Label>
                  <p className="text-xs text-muted-foreground">
                    Require cashiers to count and enter cash amounts when opening and closing shifts.
                  </p>
                </div>
                <Switch
                  checked={shiftSettings.requireCashCounting}
                  onCheckedChange={(checked) => toggleShiftSetting("require_cash_counting", checked)}
                  disabled={!shiftSettings.requireShift}
                />
              </div>
              {!shiftSettings.requireShift && (
                <p className="text-xs text-muted-foreground italic">
                  Enable "Require Shifts" to configure cash counting.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Configuration - visible to business owners */}
        {isBusinessOwner && profile?.business_id && (
          <PaymentConfigCard businessId={profile.business_id} />
        )}
      </div>
    </DashboardLayout>
  );
}
