-- Fix infinite recursion in profiles RLS by using a SECURITY DEFINER helper

CREATE OR REPLACE FUNCTION public.get_user_company(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id;
$$;

DROP POLICY IF EXISTS "Adotados can view their company" ON public.profiles;

CREATE POLICY "Adotados can view their company"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = public.get_user_company(auth.uid()));
