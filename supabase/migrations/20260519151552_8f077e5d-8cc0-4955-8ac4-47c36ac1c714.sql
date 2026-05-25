
ALTER FUNCTION public.classify_income(NUMERIC) SET search_path = public;
ALTER FUNCTION public.set_income_tier() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
