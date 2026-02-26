import { useAuth } from "@/contexts/AuthContext";

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

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [
    "manage_team", "manage_inventory", "manage_sales", "manage_refunds",
    "manage_customers", "manage_suppliers", "manage_purchase_orders",
    "manage_stock", "view_reports", "manage_settings", "view_audit_logs", "manage_pos",
  ],
  business_owner: [
    "manage_team", "manage_inventory", "manage_sales", "manage_refunds",
    "manage_customers", "manage_suppliers", "manage_purchase_orders",
    "manage_stock", "view_reports", "manage_settings", "view_audit_logs", "manage_pos",
  ],
  manager: [
    "manage_inventory", "manage_sales", "manage_refunds", "manage_customers",
    "manage_suppliers", "manage_purchase_orders", "manage_stock",
    "view_reports", "view_audit_logs", "manage_pos",
  ],
  cashier: ["manage_sales", "manage_customers", "manage_pos"],
  waiter: ["manage_sales", "manage_pos"],
  inventory_officer: [
    "manage_inventory", "manage_suppliers", "manage_purchase_orders", "manage_stock",
  ],
};

export function usePermissions() {
  const { roles } = useAuth();

  const permissions = new Set<Permission>();
  for (const role of roles) {
    const perms = ROLE_PERMISSIONS[role] ?? [];
    for (const p of perms) permissions.add(p);
  }

  const can = (perm: Permission) => permissions.has(perm);
  const canAny = (...perms: Permission[]) => perms.some((p) => permissions.has(p));

  return { can, canAny, permissions };
}
