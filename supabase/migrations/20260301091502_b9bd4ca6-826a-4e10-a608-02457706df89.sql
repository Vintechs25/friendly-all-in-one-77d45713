
-- ADD MISSING COLUMNS
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock_level NUMERIC(12,2) DEFAULT 10;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'piece';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS expiry_date TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS batch_number TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS serial_number TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS minimum_price NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS price_override NUMERIC(12,2);
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS override_by UUID;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS item_discount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS item_discount_type TEXT DEFAULT 'fixed';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'confirmed';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS mpesa_checkout_request_id TEXT;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 5;

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, title TEXT NOT NULL, message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', category TEXT NOT NULL DEFAULT 'system',
  reference_id TEXT, reference_type TEXT, is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select" ON public.notifications FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "notif_all" ON public.notifications FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- GIFT CARDS
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  code TEXT NOT NULL, balance NUMERIC(12,2) NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gc_select" ON public.gift_cards FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "gc_all" ON public.gift_cards FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- BUSINESS SETTINGS
CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  logo_url TEXT, primary_color TEXT, secondary_color TEXT,
  invoice_prefix TEXT DEFAULT 'INV', receipt_footer_text TEXT DEFAULT 'Thank you!',
  receipt_header_text TEXT, currency_code TEXT DEFAULT 'KES', currency_symbol TEXT DEFAULT 'KSh',
  default_tax_label TEXT DEFAULT 'VAT', default_tax_rate NUMERIC(5,2) DEFAULT 16,
  theme_mode TEXT DEFAULT 'light', allow_branding_edit BOOLEAN DEFAULT false,
  allow_name_edit BOOLEAN DEFAULT false, platform_watermark BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bs_select" ON public.business_settings FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "bs_all" ON public.business_settings FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- LICENSES
CREATE TABLE IF NOT EXISTS public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  license_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lic_select" ON public.licenses FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "lic_all" ON public.licenses FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- LICENSE VALIDATIONS
CREATE TABLE IF NOT EXISTS public.license_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  device_fingerprint TEXT, device_name TEXT, validation_status TEXT, failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.license_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lv_select" ON public.license_validations FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "lv_all" ON public.license_validations FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- FEATURE TOGGLES
CREATE TABLE IF NOT EXISTS public.feature_toggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL, is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(business_id, feature_name)
);
ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ft_select" ON public.feature_toggles FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "ft_all" ON public.feature_toggles FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, action TEXT NOT NULL, table_name TEXT,
  record_id TEXT, old_data JSONB, new_data JSONB, ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "al_select" ON public.audit_logs FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "al_all" ON public.audit_logs FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, notes TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cust_select" ON public.customers FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "cust_all" ON public.customers FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INVENTORY
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0, reorder_level NUMERIC(12,2) DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, branch_id)
);
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_select" ON public.inventory FOR SELECT USING (EXISTS (SELECT 1 FROM public.branches b WHERE b.id = branch_id AND b.business_id = public.get_user_business_id(auth.uid())));
CREATE POLICY "inv_all" ON public.inventory FOR ALL USING (EXISTS (SELECT 1 FROM public.branches b WHERE b.id = branch_id AND b.business_id = public.get_user_business_id(auth.uid())));
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- HELD SALES
CREATE TABLE IF NOT EXISTS public.held_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL, cashier_id UUID NOT NULL REFERENCES auth.users(id),
  label TEXT, subtotal NUMERIC(12,2) NOT NULL DEFAULT 0, tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0, total NUMERIC(12,2) NOT NULL DEFAULT 0,
  cart_discount NUMERIC(12,2) NOT NULL DEFAULT 0, cart_discount_type TEXT DEFAULT 'fixed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.held_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hs_select" ON public.held_sales FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "hs_all" ON public.held_sales FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- HELD SALE ITEMS
CREATE TABLE IF NOT EXISTS public.held_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), held_sale_id UUID NOT NULL REFERENCES public.held_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL, product_name TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1, unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  item_discount NUMERIC(12,2) NOT NULL DEFAULT 0, item_discount_type TEXT DEFAULT 'fixed',
  price_override NUMERIC(12,2), tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.held_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hsi_select" ON public.held_sale_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.held_sales hs WHERE hs.id = held_sale_id AND hs.business_id = public.get_user_business_id(auth.uid())));
CREATE POLICY "hsi_all" ON public.held_sale_items FOR ALL USING (EXISTS (SELECT 1 FROM public.held_sales hs WHERE hs.id = held_sale_id AND hs.business_id = public.get_user_business_id(auth.uid())));

-- REFUNDS
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE, refund_number TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0, reason TEXT, refunded_by UUID REFERENCES auth.users(id),
  restock_items BOOLEAN NOT NULL DEFAULT false, status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_select" ON public.refunds FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "ref_all" ON public.refunds FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- REFUND ITEMS
CREATE TABLE IF NOT EXISTS public.refund_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), refund_id UUID NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL, product_name TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1, unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.refund_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ri_select" ON public.refund_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.refunds r WHERE r.id = refund_id AND r.business_id = public.get_user_business_id(auth.uid())));
CREATE POLICY "ri_all" ON public.refund_items FOR ALL USING (EXISTS (SELECT 1 FROM public.refunds r WHERE r.id = refund_id AND r.business_id = public.get_user_business_id(auth.uid())));

-- CASHIER SHIFTS
CREATE TABLE IF NOT EXISTS public.cashier_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL, cashier_id UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(), ended_at TIMESTAMPTZ,
  opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0, closing_cash NUMERIC(12,2),
  expected_cash NUMERIC(12,2), cash_variance NUMERIC(12,2),
  total_sales NUMERIC(12,2) NOT NULL DEFAULT 0, total_transactions INTEGER NOT NULL DEFAULT 0,
  notes TEXT, status TEXT NOT NULL DEFAULT 'open'
);
ALTER TABLE public.cashier_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_select" ON public.cashier_shifts FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "cs_all" ON public.cashier_shifts FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- SAFE DROPS
CREATE TABLE IF NOT EXISTS public.safe_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), shift_id UUID NOT NULL REFERENCES public.cashier_shifts(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0, notes TEXT, dropped_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.safe_drops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sd_select" ON public.safe_drops FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "sd_all" ON public.safe_drops FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- PERMISSIONS
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), module TEXT NOT NULL, action TEXT NOT NULL,
  description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(module, action)
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perm_select" ON public.permissions FOR SELECT USING (auth.uid() IS NOT NULL);

-- USER PERMISSION OVERRIDES
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  override_type TEXT NOT NULL DEFAULT 'grant', granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id, permission_id, business_id)
);
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upo_select" ON public.user_permission_overrides FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "upo_all" ON public.user_permission_overrides FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- GET EFFECTIVE PERMISSIONS FUNCTION
CREATE OR REPLACE FUNCTION public.get_effective_permissions(_user_id UUID, _branch_id UUID DEFAULT NULL)
RETURNS TABLE(module TEXT, action TEXT, permission_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.module, p.action, p.id AS permission_id
  FROM public.permissions p
  WHERE p.id IN (
    SELECT upo.permission_id FROM public.user_permission_overrides upo
    WHERE upo.user_id = _user_id AND upo.override_type = 'grant'
  )
  UNION
  SELECT p.module, p.action, p.id AS permission_id
  FROM public.permissions p
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role::text IN ('super_admin', 'platform_admin', 'business_owner')
  )
$$;
