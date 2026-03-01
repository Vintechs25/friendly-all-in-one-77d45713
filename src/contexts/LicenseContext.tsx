import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  LicenseValidation,
  LicenseState,
  clearLicenseState,
} from "@/lib/license-manager";
import { Shield, ShieldAlert, ShieldOff, WifiOff, Lock } from "lucide-react";

interface LicenseContextType {
  licenseState: LicenseState;
  validation: LicenseValidation | null;
  isLoading: boolean;
  canUsePOS: boolean;
  canLogin: boolean;
  /** True when business needs a license key (trial ended + no active license) */
  needsLicense: boolean;
  refreshLicense: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);



export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, roles, refreshProfile, signOut } = useAuth();
  const [licenseState, setLicenseState] = useState<LicenseState>("unregistered");
  const [validation, setValidation] = useState<LicenseValidation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsLicense, setNeedsLicense] = useState(false);

  const isSuperAdmin = roles.includes("super_admin" as any);

  const handleStateChange = useCallback((v: LicenseValidation) => {
    setValidation(v);
    setLicenseState(v.state);
    setIsLoading(false);
  }, []);

  const refreshLicense = useCallback(async () => {
    // Re-fetch profile first (edge function may have linked business_id)
    await refreshProfile();

    // Re-read the latest profile from auth context after refresh
    // We need to fetch it directly since state update is async
    const { data: freshProfile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("user_id", user!.id)
      .single();

    const businessId = freshProfile?.business_id;
    if (!businessId) return;

    // Super admins bypass license checks
    if (isSuperAdmin) {
      setLicenseState("active");
      setValidation({ state: "active", message: "Platform administrator." });
      setNeedsLicense(false);
      setIsLoading(false);
      return;
    }

    // Check if business trial has ended
    const { data: business } = await supabase
      .from("businesses")
      .select("trial_ends_at, subscription_plan")
      .eq("id", businessId)
      .single();

    const trialEnded = business?.trial_ends_at && new Date(business.trial_ends_at) <= new Date();
    const isTrialPlan = business?.subscription_plan === "trial";

    // Look for an active license first
    const { data: activeLicense } = await supabase
      .from("licenses")
      .select("license_key, status")
      .eq("business_id", businessId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Also check latest non-active status to catch suspended/terminated immediately
    const { data: latestLicense } = await supabase
      .from("licenses")
      .select("status")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeLicense) {
      if (latestLicense?.status === "suspended") {
        setNeedsLicense(false);
        setLicenseState("suspended");
        setValidation({
          state: "suspended",
          message: "Your license is suspended. Contact support.",
          salesBlocked: true,
          loginBlocked: true,
        });
        setIsLoading(false);
        return;
      }

      if (latestLicense?.status === "terminated") {
        setNeedsLicense(false);
        setLicenseState("terminated");
        setValidation({
          state: "terminated",
          message: "Your license is terminated. Contact support.",
          salesBlocked: true,
          loginBlocked: true,
        });
        setIsLoading(false);
        return;
      }

      if (trialEnded || (isTrialPlan && trialEnded)) {
        // Trial ended and no active license → block access
        setNeedsLicense(true);
        setLicenseState("expired");
        setValidation({
          state: "expired",
          message: "Your trial has ended. Please enter a license key to continue.",
          salesBlocked: true,
          loginBlocked: false,
        });
        setIsLoading(false);
        return;
      }
      // Still on active trial or no trial_ends_at set → allow
      setNeedsLicense(false);
      setLicenseState("active");
      setValidation({ state: "active", message: "Trial active." });
      setIsLoading(false);
      return;
    }

    // Has active license in DB → trust it (DB is authoritative)
    setNeedsLicense(false);
    setLicenseState("active");
    setValidation({
      state: "active",
      message: "License validated.",
      salesBlocked: false,
      loginBlocked: false,
    });
    setIsLoading(false);
  }, [user, profile?.business_id, handleStateChange, isSuperAdmin, refreshProfile]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setLicenseState("active");
      setNeedsLicense(false);
      return;
    }

    if (!profile?.business_id) {
      // Non-admin users with no business must get a license / be provisioned
      if (isSuperAdmin) {
        setLicenseState("active");
        setValidation({ state: "active", message: "Platform administrator." });
        setNeedsLicense(false);
      } else {
        setLicenseState("expired");
        setValidation({ state: "expired", message: "No business linked. Contact your platform administrator.", salesBlocked: true, loginBlocked: false });
        setNeedsLicense(true);
      }
      setIsLoading(false);
      return;
    }

    // Super admins bypass
    if (isSuperAdmin) {
      setLicenseState("active");
      setValidation({ state: "active", message: "Platform administrator." });
      setNeedsLicense(false);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    async function init() {
      // Check trial status
      const { data: business } = await supabase
        .from("businesses")
        .select("trial_ends_at, subscription_plan")
        .eq("id", profile!.business_id!)
        .single();

      if (!mounted) return;

      const trialEnded = business?.trial_ends_at && new Date(business.trial_ends_at) <= new Date();
      const isTrialPlan = business?.subscription_plan === "trial";

      const { data: activeLicense } = await supabase
        .from("licenses")
        .select("license_key, status")
        .eq("business_id", profile!.business_id!)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: latestLicense } = await supabase
        .from("licenses")
        .select("status")
        .eq("business_id", profile!.business_id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!mounted) return;

      if (!activeLicense) {
        if (latestLicense?.status === "suspended") {
          setNeedsLicense(false);
          setLicenseState("suspended");
          setValidation({
            state: "suspended",
            message: "Your license is suspended. Contact support.",
            salesBlocked: true,
            loginBlocked: true,
          });
          setIsLoading(false);
          return;
        }

        if (latestLicense?.status === "terminated") {
          setNeedsLicense(false);
          setLicenseState("terminated");
          setValidation({
            state: "terminated",
            message: "Your license is terminated. Contact support.",
            salesBlocked: true,
            loginBlocked: true,
          });
          setIsLoading(false);
          return;
        }

        if (trialEnded || (isTrialPlan && trialEnded)) {
          setNeedsLicense(true);
          setLicenseState("expired");
          setValidation({
            state: "expired",
            message: "Trial ended. License key required.",
            salesBlocked: true,
            loginBlocked: false,
          });
          setIsLoading(false);
          return;
        }

        // Active trial
        setNeedsLicense(false);
        setLicenseState("active");
        setValidation({ state: "active", message: "Trial active." });
        setIsLoading(false);
        return;
      }

      // Has active license in DB → trust it
      setNeedsLicense(false);
      setLicenseState("active");
      setValidation({ state: "active", message: "License validated." });
      setIsLoading(false);
    }

    init();

    return () => {
      mounted = false;
    };
  }, [user, profile?.business_id, handleStateChange, isSuperAdmin]);

  // Fast re-check so admin suspension takes effect quickly
  useEffect(() => {
    if (!user || !profile?.business_id || isSuperAdmin) return;

    const interval = setInterval(() => {
      void refreshLicense();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, profile?.business_id, isSuperAdmin, refreshLicense]);

  // Force logout when license is suspended or terminated
  useEffect(() => {
    if (!user || isSuperAdmin) return;
    if (licenseState === "suspended" || licenseState === "terminated") {
      clearLicenseState();
      void signOut();
    }
  }, [licenseState, user, isSuperAdmin, signOut]);

  const canUsePOS = licenseState === "active" || licenseState === "grace";
  const canLogin = licenseState !== "suspended" && licenseState !== "terminated";

  return (
    <LicenseContext.Provider
      value={{ licenseState, validation, isLoading, canUsePOS, canLogin, needsLicense, refreshLicense }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const ctx = useContext(LicenseContext);
  if (!ctx) throw new Error("useLicense must be used within LicenseProvider");
  return ctx;
}

export function LicenseBanner() {
  const { licenseState, validation } = useLicense();

  if (licenseState === "active" || !validation) return null;

  const configs: Record<string, { bg: string; icon: typeof Shield; label: string }> = {
    grace: { bg: "bg-yellow-500/10 border-yellow-500/30 text-yellow-700", icon: WifiOff, label: "Offline Mode" },
    expired: { bg: "bg-destructive/10 border-destructive/30 text-destructive", icon: ShieldAlert, label: "License Expired" },
    suspended: { bg: "bg-destructive/10 border-destructive/30 text-destructive", icon: ShieldOff, label: "License Suspended" },
    terminated: { bg: "bg-destructive/10 border-destructive/30 text-destructive", icon: ShieldOff, label: "License Terminated" },
    locked: { bg: "bg-destructive/10 border-destructive/30 text-destructive", icon: Lock, label: "System Locked" },
  };

  const config = configs[licenseState] || configs.locked;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${config.bg}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <div>
        <span className="font-semibold">{config.label}: </span>
        {validation.message}
      </div>
    </div>
  );
}
