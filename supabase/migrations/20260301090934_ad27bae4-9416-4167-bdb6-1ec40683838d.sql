
-- ==============================================
-- FRIENDLY POS - CORE DATABASE SCHEMA (PHASE 1)
-- ==============================================

-- Enums
CREATE TYPE public.app_role AS ENUM ('platform_admin', 'business_owner', 'branch_manager', 'cashier', 'auditor');
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'mpesa', 'bank_transfer', 'store_credit', 'gift_card');
CREATE TYPE public.sale_status AS ENUM ('active', 'completed', 'held', 'voided', 'refunded');
CREATE TYPE public.shift_status AS ENUM ('open', 'closed');

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==============================================
-- BUSINESSES
-- ==============================================
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'retail',
  phone TEXT,
  email TEXT,
  address TEXT,
  logo_url TEXT,
  currency_code TEXT NOT NULL DEFAULT 'KES',
  currency_symbol TEXT NOT NULL DEFAULT 'KSh',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 16.00,
  tax_label TEXT NOT NULL DEFAULT 'VAT',
  subscription_plan TEXT NOT NULL DEFAULT 'trial',
  is_active BOOLEAN NOT NULL DEFAULT true,
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- BRANCHES
-- ==============================================
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- PROFILES
-- ==============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  pin_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================
-- USER ROLES
-- ==============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'cashier',
  UNIQUE(user_id, business_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_business_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT business_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- ==============================================
-- CATEGORIES
-- ==============================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- PRODUCTS
-- ==============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(12,2) DEFAULT 10,
  unit_of_measure TEXT NOT NULL DEFAULT 'piece',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  track_stock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_business ON public.products(business_id);

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- SHIFTS
-- ==============================================
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  cashier_id UUID NOT NULL REFERENCES auth.users(id),
  status shift_status NOT NULL DEFAULT 'open',
  opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_amount NUMERIC(12,2),
  expected_amount NUMERIC(12,2),
  notes TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- SALES
-- ==============================================
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  cashier_id UUID NOT NULL REFERENCES auth.users(id),
  customer_name TEXT,
  status sale_status NOT NULL DEFAULT 'active',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  receipt_number TEXT,
  held_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_sales_business ON public.sales(business_id);
CREATE INDEX idx_sales_status ON public.sales(status);

-- ==============================================
-- SALE ITEMS
-- ==============================================
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- PAYMENTS
-- ==============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  method payment_method NOT NULL DEFAULT 'cash',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS POLICIES
-- ==============================================

-- Businesses: owners see their own, platform admins see all
CREATE POLICY "Users see own business" ON public.businesses
  FOR SELECT USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Owners update own business" ON public.businesses
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Authenticated create business" ON public.businesses
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Branches: same business
CREATE POLICY "Users see own branches" ON public.branches
  FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()) OR public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Business members manage branches" ON public.branches
  FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- Profiles: users see own, same business members visible
CREATE POLICY "Users see own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid() OR business_id = public.get_user_business_id(auth.uid()) OR public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- User roles
CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR business_id = public.get_user_business_id(auth.uid()) OR public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "Business owners manage roles" ON public.user_roles
  FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- Categories: same business
CREATE POLICY "Business members see categories" ON public.categories
  FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Business members manage categories" ON public.categories
  FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- Products: same business
CREATE POLICY "Business members see products" ON public.products
  FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Business members manage products" ON public.products
  FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- Shifts: same business
CREATE POLICY "Business members see shifts" ON public.shifts
  FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Cashiers manage own shifts" ON public.shifts
  FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- Sales: same business
CREATE POLICY "Business members see sales" ON public.sales
  FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Business members manage sales" ON public.sales
  FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));

-- Sale items: via sale's business
CREATE POLICY "Business members see sale items" ON public.sale_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.business_id = public.get_user_business_id(auth.uid())));
CREATE POLICY "Business members manage sale items" ON public.sale_items
  FOR ALL USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.business_id = public.get_user_business_id(auth.uid())));

-- Payments: same business
CREATE POLICY "Business members see payments" ON public.payments
  FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Business members manage payments" ON public.payments
  FOR ALL USING (business_id = public.get_user_business_id(auth.uid()));
