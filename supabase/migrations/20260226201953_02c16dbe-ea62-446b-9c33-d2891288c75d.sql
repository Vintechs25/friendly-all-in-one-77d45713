
-- =============================================================
-- RBAC SYSTEM: permissions, role_permissions, user_permission_overrides
-- =============================================================

-- 1. Permissions table (module + action)
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(module, action)
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read permissions (they're like a catalog)
CREATE POLICY "Authenticated users can view permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

-- Only super_admin can manage permissions catalog
CREATE POLICY "Super admins can manage permissions"
  ON public.permissions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 2. Role-permissions mapping (default permissions per role per business)
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id, business_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view role permissions for their business or global (null business_id)
CREATE POLICY "Users can view role permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (
    business_id IS NULL
    OR business_id = get_user_business_id(auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Business owners can manage role permissions for their business
CREATE POLICY "Business owners can manage role permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (
    (business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'business_owner'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    (business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'business_owner'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 3. User permission overrides (per-user, per-branch, with expiry)
CREATE TABLE public.user_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  override_type text NOT NULL CHECK (override_type IN ('grant', 'revoke')),
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_id, business_id, branch_id)
);

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Users can view their own overrides
CREATE POLICY "Users can view own permission overrides"
  ON public.user_permission_overrides FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (business_id = get_user_business_id(auth.uid()) AND (has_role(auth.uid(), 'business_owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Business owners and managers can manage overrides
CREATE POLICY "Owners/managers can manage permission overrides"
  ON public.user_permission_overrides FOR ALL
  TO authenticated
  USING (
    (business_id = get_user_business_id(auth.uid()) AND (has_role(auth.uid(), 'business_owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    (business_id = get_user_business_id(auth.uid()) AND (has_role(auth.uid(), 'business_owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 4. Add hierarchy_level to user_roles for hierarchy enforcement
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS hierarchy_level integer NOT NULL DEFAULT 5;

-- 5. Seed the permissions catalog
INSERT INTO public.permissions (module, action, description) VALUES
  -- POS
  ('pos', 'access', 'Access point of sale'),
  ('pos', 'apply_discount', 'Apply discounts at POS'),
  ('pos', 'price_override', 'Override item prices'),
  ('pos', 'void_sale', 'Void a completed sale'),
  ('pos', 'hold_sale', 'Hold and recall sales'),
  -- Sales
  ('sales', 'view', 'View sales history'),
  ('sales', 'create', 'Create new sales'),
  ('sales', 'export', 'Export sales data'),
  -- Refunds
  ('refunds', 'create', 'Process refunds'),
  ('refunds', 'approve', 'Approve refund requests'),
  ('refunds', 'view', 'View refund history'),
  -- Inventory
  ('inventory', 'view', 'View inventory levels'),
  ('inventory', 'manage', 'Add/edit products'),
  ('inventory', 'adjust_stock', 'Make stock adjustments'),
  ('inventory', 'transfer_stock', 'Transfer stock between branches'),
  -- Customers
  ('customers', 'view', 'View customer list'),
  ('customers', 'manage', 'Add/edit customers'),
  ('customers', 'manage_credit', 'Manage store credit'),
  -- Suppliers
  ('suppliers', 'view', 'View suppliers'),
  ('suppliers', 'manage', 'Add/edit suppliers'),
  -- Purchase Orders
  ('purchase_orders', 'view', 'View purchase orders'),
  ('purchase_orders', 'create', 'Create purchase orders'),
  ('purchase_orders', 'receive', 'Receive purchase orders'),
  -- Reports
  ('reports', 'view_sales', 'View sales reports'),
  ('reports', 'view_inventory', 'View inventory reports'),
  ('reports', 'view_financial', 'View financial/profit reports'),
  ('reports', 'export', 'Export reports'),
  -- Team
  ('team', 'view', 'View team members'),
  ('team', 'manage', 'Add/remove team members'),
  ('team', 'assign_roles', 'Assign roles to users'),
  ('team', 'manage_permissions', 'Grant/revoke individual permissions'),
  -- Settings
  ('settings', 'view', 'View business settings'),
  ('settings', 'manage', 'Modify business settings'),
  ('settings', 'receipt_config', 'Configure receipt layout'),
  -- Shifts
  ('shifts', 'manage_own', 'Open/close own shifts'),
  ('shifts', 'view_all', 'View all shifts'),
  ('shifts', 'manage_all', 'Manage all shifts'),
  -- Audit
  ('audit', 'view_logs', 'View audit logs'),
  -- Branches
  ('branches', 'view', 'View branches'),
  ('branches', 'manage', 'Create/edit branches'),
  -- Notifications
  ('notifications', 'view', 'View notifications'),
  ('notifications', 'manage', 'Manage notification settings')
ON CONFLICT (module, action) DO NOTHING;

-- 6. Seed default global role_permissions (business_id = NULL = global defaults)
-- We insert them with NULL business_id to serve as system defaults.

-- BUSINESS OWNER gets everything
INSERT INTO public.role_permissions (role, permission_id, business_id)
SELECT 'business_owner'::app_role, p.id, NULL
FROM public.permissions p
ON CONFLICT DO NOTHING;

-- MANAGER gets most except team.manage_permissions, settings.manage, branches.manage
INSERT INTO public.role_permissions (role, permission_id, business_id)
SELECT 'manager'::app_role, p.id, NULL
FROM public.permissions p
WHERE (p.module, p.action) NOT IN (
  ('team', 'manage_permissions'),
  ('settings', 'manage'),
  ('branches', 'manage'),
  ('reports', 'view_financial')
)
ON CONFLICT DO NOTHING;

-- CASHIER gets POS + basic sales/customers
INSERT INTO public.role_permissions (role, permission_id, business_id)
SELECT 'cashier'::app_role, p.id, NULL
FROM public.permissions p
WHERE (p.module, p.action) IN (
  ('pos', 'access'), ('pos', 'apply_discount'), ('pos', 'hold_sale'),
  ('sales', 'view'), ('sales', 'create'),
  ('customers', 'view'), ('customers', 'manage'),
  ('shifts', 'manage_own'),
  ('notifications', 'view'),
  ('refunds', 'view')
)
ON CONFLICT DO NOTHING;

-- WAITER gets POS access only
INSERT INTO public.role_permissions (role, permission_id, business_id)
SELECT 'waiter'::app_role, p.id, NULL
FROM public.permissions p
WHERE (p.module, p.action) IN (
  ('pos', 'access'), ('pos', 'hold_sale'),
  ('sales', 'create'),
  ('customers', 'view'),
  ('shifts', 'manage_own'),
  ('notifications', 'view')
)
ON CONFLICT DO NOTHING;

-- INVENTORY OFFICER
INSERT INTO public.role_permissions (role, permission_id, business_id)
SELECT 'inventory_officer'::app_role, p.id, NULL
FROM public.permissions p
WHERE (p.module, p.action) IN (
  ('inventory', 'view'), ('inventory', 'manage'), ('inventory', 'adjust_stock'), ('inventory', 'transfer_stock'),
  ('suppliers', 'view'), ('suppliers', 'manage'),
  ('purchase_orders', 'view'), ('purchase_orders', 'create'), ('purchase_orders', 'receive'),
  ('reports', 'view_inventory'),
  ('notifications', 'view')
)
ON CONFLICT DO NOTHING;

-- SUPER ADMIN gets everything
INSERT INTO public.role_permissions (role, permission_id, business_id)
SELECT 'super_admin'::app_role, p.id, NULL
FROM public.permissions p
ON CONFLICT DO NOTHING;

-- 7. Create a function to resolve effective permissions for a user
CREATE OR REPLACE FUNCTION public.get_effective_permissions(_user_id uuid, _branch_id uuid DEFAULT NULL)
RETURNS TABLE(module text, action text, permission_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_business AS (
    SELECT business_id FROM public.profiles WHERE id = _user_id LIMIT 1
  ),
  user_role_list AS (
    SELECT role FROM public.user_roles WHERE user_id = _user_id
  ),
  -- Base permissions from roles (global defaults + business-specific)
  base_perms AS (
    SELECT DISTINCT rp.permission_id
    FROM public.role_permissions rp
    JOIN user_role_list ur ON rp.role = ur.role
    WHERE rp.business_id IS NULL
       OR rp.business_id = (SELECT business_id FROM user_business)
  ),
  -- Grants (add permissions)
  granted AS (
    SELECT upo.permission_id
    FROM public.user_permission_overrides upo
    WHERE upo.user_id = _user_id
      AND upo.override_type = 'grant'
      AND upo.business_id = (SELECT business_id FROM user_business)
      AND (upo.branch_id IS NULL OR upo.branch_id = _branch_id)
      AND (upo.expires_at IS NULL OR upo.expires_at > now())
  ),
  -- Revokes (remove permissions)
  revoked AS (
    SELECT upo.permission_id
    FROM public.user_permission_overrides upo
    WHERE upo.user_id = _user_id
      AND upo.override_type = 'revoke'
      AND upo.business_id = (SELECT business_id FROM user_business)
      AND (upo.branch_id IS NULL OR upo.branch_id = _branch_id)
      AND (upo.expires_at IS NULL OR upo.expires_at > now())
  ),
  -- Final set = (base + grants) - revokes
  effective AS (
    SELECT permission_id FROM base_perms
    UNION
    SELECT permission_id FROM granted
    EXCEPT
    SELECT permission_id FROM revoked
  )
  SELECT p.module, p.action, p.id as permission_id
  FROM effective e
  JOIN public.permissions p ON p.id = e.permission_id;
$$;

-- 8. Hierarchy levels mapping
-- super_admin=1, business_owner=2, manager=3, cashier/waiter/inventory_officer=5
-- Update existing user_roles to set hierarchy levels
UPDATE public.user_roles SET hierarchy_level = 1 WHERE role = 'super_admin';
UPDATE public.user_roles SET hierarchy_level = 2 WHERE role = 'business_owner';
UPDATE public.user_roles SET hierarchy_level = 3 WHERE role = 'manager';
UPDATE public.user_roles SET hierarchy_level = 5 WHERE role IN ('cashier', 'waiter', 'inventory_officer');
