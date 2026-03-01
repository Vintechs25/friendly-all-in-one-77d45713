
-- Drop the restrictive insert policy and recreate as permissive
DROP POLICY IF EXISTS "Authenticated create business" ON public.businesses;

CREATE POLICY "Authenticated create business"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
