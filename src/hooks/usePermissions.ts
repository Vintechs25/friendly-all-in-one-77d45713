import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Legacy permission type for backward compat with nav guards */
export type Permission =
  | "manage_team"
  | "manage_inventory"
  | "manage_sales"
  | "manage_refunds"
  | "manage_customers"
  | "manage_suppliers"
  | "manage_purchase_orders"
  | "manage_stock"
  | "view_reports"
  | "manage_settings"
  | "view_audit_logs"
  | "manage_pos";

/** Granular permission key: "module.action" */
export type PermissionKey = `${string}.${string}`;

/** Role hierarchy levels — lower = more powerful */
export const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 1,
  business_owner: 2,
  manager: 3,
  cashier: 5,
  waiter: 5,
  inventory_officer: 5,
};

/** Maps legacy Permission names to granular module.action keys for nav compatibility */
const LEGACY_MAP: Record<Permission, PermissionKey[]> = {
  manage_pos: ["pos.access"],
  manage_sales: ["sales.view", "sales.create"],
  manage_inventory: ["inventory.view", "inventory.manage"],
  manage_refunds: ["refunds.view", "refunds.create"],
  manage_customers: ["customers.view", "customers.manage"],
  manage_suppliers: ["suppliers.view", "suppliers.manage"],
  manage_purchase_orders: ["purchase_orders.view", "purchase_orders.create"],
  manage_stock: ["inventory.adjust_stock", "inventory.transfer_stock"],
  view_reports: ["reports.view_sales", "reports.view_inventory"],
  manage_settings: ["settings.manage"],
  view_audit_logs: ["audit.view_logs"],
  manage_team: ["team.view", "team.manage"],
};

interface EffectivePermission {
  module: string;
  action: string;
  permission_id: string;
}

export function usePermissions(branchId?: string) {
  const { user, roles } = useAuth();

  const { data: effectivePerms = [] } = useQuery<EffectivePermission[]>({
    queryKey: ["effective-permissions", user?.id, branchId],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_effective_permissions", {
        _user_id: user!.id,
        _branch_id: branchId ?? null,
      });
      if (error) {
        console.error("Permission resolution error:", error);
        return [];
      }
      return (data ?? []) as EffectivePermission[];
    },
  });

  const permSet = new Set<string>(
    effectivePerms.map((p) => `${p.module}.${p.action}`)
  );

  /** Check a granular permission key like "pos.price_override" */
  const hasPermission = (key: PermissionKey) => permSet.has(key);

  /** Check any of the provided granular keys */
  const hasAnyPermission = (...keys: PermissionKey[]) =>
    keys.some((k) => permSet.has(k));

  /** Legacy `can()` — maps old permission names to new granular checks */
  const can = (perm: Permission): boolean => {
    // Super admin always has all permissions
    if (roles.includes("super_admin" as any)) return true;
    const mapped = LEGACY_MAP[perm];
    if (!mapped) return false;
    return mapped.some((k) => permSet.has(k));
  };

  const canAny = (...perms: Permission[]) => perms.some((p) => can(p));

  /** Get the highest (lowest number) hierarchy level for the user */
  const userHierarchyLevel = Math.min(
    ...roles.map((r) => ROLE_HIERARCHY[r] ?? 99)
  );

  /** Check if user can manage someone at a given hierarchy level */
  const canManageLevel = (targetLevel: number) =>
    userHierarchyLevel < targetLevel;

  return {
    can,
    canAny,
    hasPermission,
    hasAnyPermission,
    permissions: permSet,
    userHierarchyLevel,
    canManageLevel,
    effectivePerms,
  };
}
