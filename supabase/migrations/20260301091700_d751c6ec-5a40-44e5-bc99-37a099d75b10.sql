
-- Suppliers table
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_select" ON public.suppliers FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "sup_all" ON public.suppliers FOR ALL USING (business_id = get_user_business_id(auth.uid()));

-- Purchase Orders table
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total numeric NOT NULL DEFAULT 0,
  expected_date text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_select" ON public.purchase_orders FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "po_all" ON public.purchase_orders FOR ALL USING (business_id = get_user_business_id(auth.uid()));

-- Purchase Order Items table
CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  quantity numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  received_quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poi_select" ON public.purchase_order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND po.business_id = get_user_business_id(auth.uid()))
);
CREATE POLICY "poi_all" ON public.purchase_order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND po.business_id = get_user_business_id(auth.uid()))
);

-- Stock Transfers table
CREATE TABLE public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  from_branch_id uuid NOT NULL REFERENCES public.branches(id),
  to_branch_id uuid NOT NULL REFERENCES public.branches(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  initiated_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "st_select" ON public.stock_transfers FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "st_all" ON public.stock_transfers FOR ALL USING (business_id = get_user_business_id(auth.uid()));

-- Stock Adjustments table
CREATE TABLE public.stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric NOT NULL DEFAULT 0,
  reason text NOT NULL,
  notes text,
  adjusted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_select" ON public.stock_adjustments FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "sa_all" ON public.stock_adjustments FOR ALL USING (business_id = get_user_business_id(auth.uid()));
