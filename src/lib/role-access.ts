import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * Defines which routes each role can access.
 * Roles not listed here get NO access (except login).
 * "super_admin" and "platform_admin" bypass all checks.
 */
const ROLE_ROUTES: Record<string, string[] | "all"> = {
  cashier: [
    "/dashboard/pos",
    "/dashboard/shifts",
  ],
  waiter: [
    "/dashboard/pos",
    "/dashboard/shifts",
  ],
  branch_manager: [
    "/dashboard",
    "/dashboard/pos",
    "/dashboard/sales",
    "/dashboard/refunds",
    "/dashboard/customers",
    "/dashboard/shifts",
    "/dashboard/inventory",
    "/dashboard/suppliers",
    "/dashboard/purchase-orders",
    "/dashboard/stock-adjustments",
    "/dashboard/stock-transfers",
    "/dashboard/reports",
    "/dashboard/team",
  ],
  manager: [
    "/dashboard",
    "/dashboard/pos",
    "/dashboard/sales",
    "/dashboard/refunds",
    "/dashboard/customers",
    "/dashboard/shifts",
    "/dashboard/inventory",
    "/dashboard/suppliers",
    "/dashboard/purchase-orders",
    "/dashboard/stock-adjustments",
    "/dashboard/stock-transfers",
    "/dashboard/reports",
    "/dashboard/team",
  ],
  inventory_officer: [
    "/dashboard",
    "/dashboard/inventory",
    "/dashboard/suppliers",
    "/dashboard/purchase-orders",
    "/dashboard/stock-adjustments",
    "/dashboard/stock-transfers",
  ],
  auditor: [
    "/dashboard",
    "/dashboard/reports",
    "/dashboard/audit-logs",
    "/dashboard/sales",
  ],
  business_owner: "all",  // full access
  super_admin: "all",
  platform_admin: "all",
};

/**
 * Post-login redirect target per role (first match wins).
 */
const ROLE_REDIRECTS: Record<string, string> = {
  cashier: "/dashboard/pos",
  waiter: "/dashboard/pos",
  branch_manager: "/dashboard",
  manager: "/dashboard",
  inventory_officer: "/dashboard/inventory",
  auditor: "/dashboard/reports",
  business_owner: "/dashboard",
  super_admin: "/admin",
  platform_admin: "/admin",
};

/** Admin roles that bypass all route restrictions */
const ADMIN_ROLES: AppRole[] = ["super_admin", "platform_admin", "business_owner"];

/** Roles that should see a minimal POS-only interface (no sidebar) */
const POS_ONLY_ROLES: AppRole[] = ["cashier", "waiter"];

/**
 * Check if a set of roles grants access to a specific route.
 */
export function canAccessRoute(roles: AppRole[], route: string): boolean {
  // Admin roles can access everything
  if (roles.some((r) => ADMIN_ROLES.includes(r))) return true;

  for (const role of roles) {
    const allowed = ROLE_ROUTES[role];
    if (allowed === "all") return true;
    if (Array.isArray(allowed) && allowed.some((r) => route === r || route.startsWith(r + "/"))) {
      return true;
    }
  }
  return false;
}

/**
 * Filter nav items based on user roles.
 */
export function filterNavItemsByRole<T extends { path: string }>(
  items: T[],
  roles: AppRole[]
): T[] {
  if (roles.some((r) => ADMIN_ROLES.includes(r))) return items;

  return items.filter((item) => canAccessRoute(roles, item.path));
}

/**
 * Get the redirect path after login based on roles.
 */
export function getLoginRedirect(roles: AppRole[]): string {
  for (const role of roles) {
    if (ROLE_REDIRECTS[role]) return ROLE_REDIRECTS[role];
  }
  return "/dashboard";
}

/**
 * Check if the user has POS-only roles (should see minimal UI).
 */
export function isPosOnlyUser(roles: AppRole[]): boolean {
  if (roles.length === 0) return false;
  // If ALL roles are POS-only roles, show minimal UI
  return roles.every((r) => POS_ONLY_ROLES.includes(r));
}
