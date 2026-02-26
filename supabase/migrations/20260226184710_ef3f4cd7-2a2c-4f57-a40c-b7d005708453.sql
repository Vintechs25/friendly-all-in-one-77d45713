
-- Tighten the permissive INSERT policies

-- 1. Replace businesses insert policy - ensure user can only create one
DROP POLICY "Anyone can insert a business during signup" ON public.businesses;
CREATE POLICY "Authenticated users can create a business" ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND business_id IS NOT NULL)
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- 2. Replace branches insert policy
DROP POLICY "Anyone can insert branch during signup" ON public.branches;
CREATE POLICY "Authenticated users can create a branch for their business" ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = public.get_user_business_id(auth.uid())
    OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND business_id IS NOT NULL)
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- 3. Replace audit logs insert policy
DROP POLICY "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs for their business" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = public.get_user_business_id(auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );
