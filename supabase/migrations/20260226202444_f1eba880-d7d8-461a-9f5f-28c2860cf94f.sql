
-- =============================================================
-- BUSINESS SETTINGS (branding) & LICENSE VALIDATIONS
-- =============================================================

-- 1. Business settings table for branding
CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text DEFAULT '160 84% 39%',
  secondary_color text DEFAULT '220 60% 50%',
  invoice_prefix text DEFAULT 'INV',
  receipt_footer_text text DEFAULT 'Thank you for shopping with us!',
  receipt_header_text text,
  currency_code text DEFAULT 'KES',
  currency_symbol text DEFAULT 'KSh',
  default_tax_label text DEFAULT 'VAT',
  default_tax_rate numeric DEFAULT 16,
  theme_mode text DEFAULT 'light' CHECK (theme_mode IN ('light', 'dark', 'system')),
  allow_branding_edit boolean DEFAULT false,
  allow_name_edit boolean DEFAULT false,
  platform_watermark boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their business settings
CREATE POLICY "Users can view own business settings"
  ON public.business_settings FOR SELECT
  TO authenticated
  USING (
    business_id = get_user_business_id(auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Business owners can update (conditional fields enforced in app)
CREATE POLICY "Business owners can update settings"
  ON public.business_settings FOR UPDATE
  TO authenticated
  USING (
    (business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'business_owner'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Only super_admin can insert (created during provisioning)
CREATE POLICY "Platform owner can create settings"
  ON public.business_settings FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Only super_admin can delete
CREATE POLICY "Platform owner can delete settings"
  ON public.business_settings FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Auto-update updated_at
CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. License validations log table
CREATE TABLE public.license_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id),
  device_fingerprint text NOT NULL,
  device_name text,
  validation_status text NOT NULL DEFAULT 'success',
  ip_address text,
  failure_reason text,
  validated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.license_validations ENABLE ROW LEVEL SECURITY;

-- Business owners can view their validation logs
CREATE POLICY "Business owners can view license validations"
  ON public.license_validations FOR SELECT
  TO authenticated
  USING (
    (business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'business_owner'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Edge function inserts validations (service role)
-- For now, allow authenticated insert for the license-server function
CREATE POLICY "System can insert validations"
  ON public.license_validations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Create logo storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('business-logos', 'business-logos', true, 2097152)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for logos
CREATE POLICY "Anyone can view business logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'business-logos');

CREATE POLICY "Authenticated users can upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'business-logos');

CREATE POLICY "Authenticated users can update logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'business-logos');

CREATE POLICY "Authenticated users can delete logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'business-logos');
