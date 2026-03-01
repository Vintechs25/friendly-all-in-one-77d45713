
-- Fix the overly permissive INSERT policy on profiles
-- The trigger runs as SECURITY DEFINER so it bypasses RLS.
-- We can restrict the INSERT policy to only allow users to insert their own profile.
DROP POLICY "System insert profiles" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
