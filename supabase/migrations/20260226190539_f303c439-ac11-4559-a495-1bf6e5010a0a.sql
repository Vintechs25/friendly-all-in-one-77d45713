
-- License status enum
CREATE TYPE public.license_status AS ENUM ('active', 'expired', 'suspended', 'terminated');

-- Licenses table
CREATE TABLE public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  license_key TEXT NOT NULL UNIQUE,
  subscription_plan public.subscription_plan_type NOT NULL DEFAULT 'trial',
  status public.license_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  allowed_device_count INTEGER NOT NULL DEFAULT 1,
  last_validated_at TIMESTAMPTZ,
  grace_period_hours INTEGER NOT NULL DEFAULT 72,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Device registrations table
CREATE TABLE public.device_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(license_id, device_fingerprint)
);

-- Enable RLS
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_registrations ENABLE ROW LEVEL SECURITY;

-- RLS: super_admin can do everything on licenses
CREATE POLICY "Super admins can manage all licenses"
  ON public.licenses FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS: business owners can view their own license
CREATE POLICY "Business owners can view their license"
  ON public.licenses FOR SELECT
  USING (business_id = get_user_business_id(auth.uid()));

-- RLS: super_admin can manage all device registrations
CREATE POLICY "Super admins can manage all devices"
  ON public.device_registrations FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS: users can view devices for their business license
CREATE POLICY "Users can view devices for their license"
  ON public.device_registrations FOR SELECT
  USING (license_id IN (
    SELECT id FROM public.licenses WHERE business_id = get_user_business_id(auth.uid())
  ));

-- Index for fast lookups
CREATE INDEX idx_licenses_business_id ON public.licenses(business_id);
CREATE INDEX idx_licenses_license_key ON public.licenses(license_key);
CREATE INDEX idx_device_registrations_license_id ON public.device_registrations(license_id);
CREATE INDEX idx_device_registrations_fingerprint ON public.device_registrations(device_fingerprint);
