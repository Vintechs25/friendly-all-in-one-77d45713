import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  LicenseValidation,
  LicenseState,
  validateLicense,
  startPeriodicValidation,
  stopPeriodicValidation,
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

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || "vzerzgmywwhvcgkezkhh";

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, roles, refreshProfile } = useAuth();
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
      .eq("id", user!.id)
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

    // Look for an active license
    const { data: license } = await supabase
      .from("licenses")
      .select("license_key, status")
      .eq("business_id", businessId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!license) {
      if (trialEnded || (isTrialPlan && trialEnded)) {
        // Trial ended and no license → block access
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

    // Has a license → validate it
    setNeedsLicense(false);
    const result = await validateLicense(license.license_key, PROJECT_ID);
    handleStateChange(result);
  }, [profile?.business_id, handleStateChange, isSuperAdmin]);

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

      const { data: license } = await supabase
        .from("licenses")
        .select("license_key, status")
        .eq("business_id", profile!.business_id!)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!mounted) return;

      if (!license) {
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

      // Has license → start periodic validation
      setNeedsLicense(false);
      startPeriodicValidation(license.license_key, PROJECT_ID, (v) => {
        if (mounted) handleStateChange(v);
      });
    }

    init();

    return () => {
      mounted = false;
      stopPeriodicValidation();
    };
  }, [user, profile?.business_id, handleStateChange, isSuperAdmin]);

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
