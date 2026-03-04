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
import { toast } from "sonner";
import { User, Lock, Building2, AlertTriangle, Shield, KeyRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import PaymentConfigCard from "@/components/settings/PaymentConfigCard";

export default function SettingsPage() {
  const { user, profile, session, hasRole, refreshProfile } = useAuth();
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

        {/* Payment Configuration - visible to business owners */}
        {isBusinessOwner && profile?.business_id && (
          <PaymentConfigCard businessId={profile.business_id} />
        )}
      </div>
    </DashboardLayout>
  );
}
