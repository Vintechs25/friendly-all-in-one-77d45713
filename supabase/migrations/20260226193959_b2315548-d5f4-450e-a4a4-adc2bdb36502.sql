
-- Add void columns to sales
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid,
  ADD COLUMN IF NOT EXISTS void_reason text;

-- Add price override columns to sale_items
ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS price_override numeric,
  ADD COLUMN IF NOT EXISTS override_by uuid,
  ADD COLUMN IF NOT EXISTS item_discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_discount_type text NOT NULL DEFAULT 'fixed';

-- Create held_sales table for parked transactions
CREATE TABLE public.held_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  cashier_id uuid NOT NULL,
  customer_id uuid REFERENCES public.customers(id),
  label text,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  cart_discount numeric NOT NULL DEFAULT 0,
  cart_discount_type text NOT NULL DEFAULT 'fixed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create held_sale_items table
CREATE TABLE public.held_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  held_sale_id uuid NOT NULL REFERENCES public.held_sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  item_discount numeric NOT NULL DEFAULT 0,
  item_discount_type text NOT NULL DEFAULT 'fixed',
  price_override numeric,
  tax_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.held_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.held_sale_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for held_sales
CREATE POLICY "Users can manage held sales in their business"
  ON public.held_sales FOR ALL TO authenticated
  USING (business_id = get_user_business_id(auth.uid()))
  WITH CHECK (business_id = get_user_business_id(auth.uid()));

CREATE POLICY "Users can view held sales in their business"
  ON public.held_sales FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS policies for held_sale_items
CREATE POLICY "Users can manage held sale items"
  ON public.held_sale_items FOR ALL TO authenticated
  USING (held_sale_id IN (SELECT id FROM public.held_sales WHERE business_id = get_user_business_id(auth.uid())))
  WITH CHECK (held_sale_id IN (SELECT id FROM public.held_sales WHERE business_id = get_user_business_id(auth.uid())));

CREATE POLICY "Users can view held sale items"
  ON public.held_sale_items FOR SELECT TO authenticated
  USING (held_sale_id IN (SELECT id FROM public.held_sales WHERE business_id = get_user_business_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'::app_role));
