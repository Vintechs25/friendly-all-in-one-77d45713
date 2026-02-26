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
  refreshLicense: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || "vzerzgmywwhvcgkezkhh";

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [licenseState, setLicenseState] = useState<LicenseState>("unregistered");
  const [validation, setValidation] = useState<LicenseValidation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleStateChange = useCallback((v: LicenseValidation) => {
    setValidation(v);
    setLicenseState(v.state);
    setIsLoading(false);
  }, []);

  const refreshLicense = useCallback(async () => {
    if (!profile?.business_id) return;
    
    const { data: license } = await supabase
      .from("licenses")
      .select("license_key")
      .eq("business_id", profile.business_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!license) {
      // No license found — allow usage (license system is opt-in per business)
      setLicenseState("active");
      setValidation({
        state: "active",
        message: "No license required.",
      });
      setIsLoading(false);
      return;
    }

    const result = await validateLicense(license.license_key, PROJECT_ID);
    handleStateChange(result);
  }, [profile?.business_id, handleStateChange]);

  useEffect(() => {
    if (!user || !profile?.business_id) {
      setIsLoading(false);
      setLicenseState("active"); // no business = no license needed
      return;
    }

    let mounted = true;

    async function init() {
      const { data: license } = await supabase
        .from("licenses")
        .select("license_key")
        .eq("business_id", profile!.business_id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!mounted) return;

      if (!license) {
        // No license = no restrictions (license system is opt-in)
        setLicenseState("active");
        setValidation({ state: "active", message: "No license required." });
        setIsLoading(false);
        return;
      }

      startPeriodicValidation(license.license_key, PROJECT_ID, (v) => {
        if (mounted) handleStateChange(v);
      });
    }

    init();

    return () => {
      mounted = false;
      stopPeriodicValidation();
    };
  }, [user, profile?.business_id, handleStateChange]);

  const canUsePOS = licenseState === "active" || licenseState === "grace";
  const canLogin = licenseState !== "suspended" && licenseState !== "terminated";

  return (
    <LicenseContext.Provider
      value={{ licenseState, validation, isLoading, canUsePOS, canLogin, refreshLicense }}
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

// Reusable banner component for license status
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
