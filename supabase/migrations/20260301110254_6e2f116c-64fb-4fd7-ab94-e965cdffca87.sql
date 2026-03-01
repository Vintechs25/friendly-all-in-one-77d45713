
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "ft_all" ON public.feature_toggles;
DROP POLICY IF EXISTS "ft_select" ON public.feature_toggles;

-- Recreate with admin access
CREATE POLICY "ft_select" ON public.feature_toggles
FOR SELECT TO authenticated
USING (
  business_id = get_user_business_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'platform_admin'::app_role)
);

CREATE POLICY "ft_all" ON public.feature_toggles
FOR ALL TO authenticated
USING (
  business_id = get_user_business_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'platform_admin'::app_role)
)
WITH CHECK (
  business_id = get_user_business_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'platform_admin'::app_role)
);
