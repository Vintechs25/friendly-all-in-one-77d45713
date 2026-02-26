
-- Restrict business creation to super_admin only
-- Drop the existing permissive insert policy
DROP POLICY IF EXISTS "Authenticated users can create a business" ON public.businesses;

-- Create new restrictive policy: only super_admin can create businesses
CREATE POLICY "Only platform owner can create businesses"
  ON public.businesses FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
