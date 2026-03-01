
-- Allow super_admin and platform_admin to insert businesses
DROP POLICY IF EXISTS "Authenticated create business" ON public.businesses;

CREATE POLICY "Authenticated create business"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    owner_id = auth.uid()
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'platform_admin'::app_role)
  )
);

-- Also allow super_admin/platform_admin to SELECT all businesses
DROP POLICY IF EXISTS "Users see own business" ON public.businesses;

CREATE POLICY "Users see own business"
ON public.businesses
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow super_admin/platform_admin to UPDATE any business
DROP POLICY IF EXISTS "Owners update own business" ON public.businesses;

CREATE POLICY "Owners update own business"
ON public.businesses
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'platform_admin'::app_role)
);
