import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FeatureToggle {
  feature_name: string;
  is_enabled: boolean;
}

/**
 * Maps feature toggle keys to the nav permission names they control.
 * When a feature is disabled, the corresponding nav items are hidden.
 */
const FEATURE_TO_PERMISSIONS: Record<string, string[]> = {
  pos: ["manage_pos"],
  inventory: ["manage_inventory", "manage_stock", "manage_suppliers", "manage_purchase_orders"],
  advanced_reports: ["view_reports"],
  audit_logs: ["view_audit_logs"],
  customer_loyalty: ["manage_customers"],
};

/**
 * Maps feature toggle keys to route paths they control.
 */
const FEATURE_TO_ROUTES: Record<string, string[]> = {
  pos: ["/dashboard/pos", "/dashboard/shifts"],
  inventory: [
    "/dashboard/inventory",
    "/dashboard/suppliers",
    "/dashboard/purchase-orders",
    "/dashboard/stock-adjustments",
    "/dashboard/stock-transfers",
  ],
  advanced_reports: ["/dashboard/reports"],
  audit_logs: ["/dashboard/audit-logs"],
  customer_loyalty: ["/dashboard/customers"],
};

export function useFeatureToggles() {
  const { profile, roles } = useAuth();

  const { data: toggles = [], isLoading } = useQuery<FeatureToggle[]>({
    queryKey: ["feature-toggles", profile?.business_id],
    enabled: !!profile?.business_id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_toggles")
        .select("feature_name, is_enabled")
        .eq("business_id", profile!.business_id!);
      if (error) {
        console.error("Feature toggles error:", error);
        return [];
      }
      return (data ?? []) as FeatureToggle[];
    },
  });

  // Build a set of disabled features
  const disabledFeatures = new Set<string>(
    toggles.filter((t) => !t.is_enabled).map((t) => t.feature_name)
  );

  // Super admins bypass feature toggles
  const isSuperAdmin = roles.includes("super_admin" as any);

  /** Check if a feature key is enabled (or has no toggle row = enabled by default) */
  const isFeatureEnabled = (featureKey: string): boolean => {
    if (isSuperAdmin) return true;
    // If no toggle exists for this feature, it's enabled by default
    const toggle = toggles.find((t) => t.feature_name === featureKey);
    if (!toggle) return true;
    return toggle.is_enabled;
  };

  /** Check if a nav permission is allowed by feature toggles */
  const isPermissionAllowedByFeature = (permission: string): boolean => {
    if (isSuperAdmin) return true;
    for (const [feature, perms] of Object.entries(FEATURE_TO_PERMISSIONS)) {
      if (perms.includes(permission) && !isFeatureEnabled(feature)) {
        return false;
      }
    }
    return true;
  };

  /** Check if a route path is allowed by feature toggles */
  const isRouteAllowedByFeature = (path: string): boolean => {
    if (isSuperAdmin) return true;
    for (const [feature, routes] of Object.entries(FEATURE_TO_ROUTES)) {
      if (routes.includes(path) && !isFeatureEnabled(feature)) {
        return false;
      }
    }
    return true;
  };

  return {
    isFeatureEnabled,
    isPermissionAllowedByFeature,
    isRouteAllowedByFeature,
    isLoading,
    toggles,
  };
}
