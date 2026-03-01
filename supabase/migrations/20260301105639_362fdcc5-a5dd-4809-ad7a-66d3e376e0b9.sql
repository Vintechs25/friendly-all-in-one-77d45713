
-- Allow super_admin to see all licenses
DROP POLICY IF EXISTS "lic_select" ON public.licenses;

CREATE POLICY "lic_select"
ON public.licenses
FOR SELECT
TO authenticated
USING (
  business_id = get_user_business_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'platform_admin'::app_role)
);

-- Allow super_admin to manage all licenses
DROP POLICY IF EXISTS "lic_all" ON public.licenses;

CREATE POLICY "lic_all"
ON public.licenses
FOR ALL
TO authenticated
USING (
  business_id = get_user_business_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'platform_admin'::app_role)
);
