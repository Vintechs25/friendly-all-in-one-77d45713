
-- Fix the overly permissive insert policy on license_validations
DROP POLICY IF EXISTS "System can insert validations" ON public.license_validations;

-- Only allow inserts for users within the same business
CREATE POLICY "Users can insert license validations for their business"
  ON public.license_validations FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id = get_user_business_id(auth.uid())
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );
