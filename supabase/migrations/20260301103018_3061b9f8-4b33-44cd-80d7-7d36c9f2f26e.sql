
-- Terminal hardware configurations per POS terminal
CREATE TABLE public.terminal_hardware_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  terminal_name text NOT NULL DEFAULT 'POS Terminal',
  printer_enabled boolean NOT NULL DEFAULT true,
  printer_connection_type text NOT NULL DEFAULT 'usb',
  drawer_enabled boolean NOT NULL DEFAULT true,
  scanner_enabled boolean NOT NULL DEFAULT true,
  scale_enabled boolean NOT NULL DEFAULT false,
  printer_status text NOT NULL DEFAULT 'disconnected',
  drawer_status text NOT NULL DEFAULT 'disconnected',
  scanner_status text NOT NULL DEFAULT 'disconnected',
  scale_status text NOT NULL DEFAULT 'disconnected',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.terminal_hardware_configs ENABLE ROW LEVEL SECURITY;

-- Business members can read hardware configs (cashiers need to see status)
CREATE POLICY "thc_select" ON public.terminal_hardware_configs
  FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));

-- Only owners/managers can modify hardware configs
CREATE POLICY "thc_modify" ON public.terminal_hardware_configs
  FOR ALL TO authenticated
  USING (
    business_id = get_user_business_id(auth.uid())
    AND (
      has_role(auth.uid(), 'business_owner'::app_role)
      OR has_role(auth.uid(), 'branch_manager'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  );
