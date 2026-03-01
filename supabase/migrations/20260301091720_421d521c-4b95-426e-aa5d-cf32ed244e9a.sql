
-- Subscription Plans table
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan_type text NOT NULL DEFAULT 'starter',
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  max_branches integer NOT NULL DEFAULT 1,
  max_users integer NOT NULL DEFAULT 5,
  max_products integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_select" ON public.subscription_plans FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sp_admin" ON public.subscription_plans FOR ALL USING (has_role(auth.uid(), 'platform_admin'));

-- Device Registrations table
CREATE TABLE public.device_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  device_fingerprint text NOT NULL,
  device_name text,
  last_seen_at timestamptz DEFAULT now(),
  registered_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.device_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_select" ON public.device_registrations FOR SELECT USING (
  EXISTS (SELECT 1 FROM licenses l WHERE l.id = device_registrations.license_id AND l.business_id = get_user_business_id(auth.uid()))
);
CREATE POLICY "dr_all" ON public.device_registrations FOR ALL USING (
  EXISTS (SELECT 1 FROM licenses l WHERE l.id = device_registrations.license_id AND l.business_id = get_user_business_id(auth.uid()))
);
