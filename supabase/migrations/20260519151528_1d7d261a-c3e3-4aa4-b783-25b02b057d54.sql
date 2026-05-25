
-- Enum de papéis
CREATE TYPE public.app_role AS ENUM ('empresa', 'adotado');
CREATE TYPE public.income_tier AS ENUM ('bronze', 'prata', 'ouro', 'diamante');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role public.app_role NOT NULL,
  company_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Income submissions
CREATE TABLE public.income_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  tier public.income_tier NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Volunteer internship hours
CREATE TABLE public.volunteer_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adotado_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hours NUMERIC(6,2) NOT NULL CHECK (hours > 0),
  description TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper: classify income
CREATE OR REPLACE FUNCTION public.classify_income(amount NUMERIC)
RETURNS public.income_tier
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN amount <= 2000 THEN 'bronze'::public.income_tier
    WHEN amount <= 5000 THEN 'prata'::public.income_tier
    WHEN amount <= 10000 THEN 'ouro'::public.income_tier
    ELSE 'diamante'::public.income_tier
  END;
$$;

-- Has role check (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Auto-create profile on signup using metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_name TEXT;
  v_company UUID;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'adotado')::public.app_role;
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  v_company := NULLIF(NEW.raw_user_meta_data->>'company_id', '')::UUID;

  INSERT INTO public.profiles (id, full_name, role, company_id)
  VALUES (NEW.id, v_name, v_role, CASE WHEN v_role = 'adotado' THEN v_company ELSE NULL END);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-classify income on insert
CREATE OR REPLACE FUNCTION public.set_income_tier()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.tier := public.classify_income(NEW.amount);
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_income_tier_trg
BEFORE INSERT OR UPDATE OF amount ON public.income_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_income_tier();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_hours ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Companies can view their adotados" ON public.profiles
  FOR SELECT TO authenticated USING (company_id = auth.uid());
CREATE POLICY "Adotados can view their company" ON public.profiles
  FOR SELECT TO authenticated USING (
    id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Anyone can view companies list" ON public.profiles
  FOR SELECT TO anon, authenticated USING (role = 'empresa');

-- User roles
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Income submissions
CREATE POLICY "Adotado manages own income" ON public.income_submissions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Company views adotados income" ON public.income_submissions
  FOR SELECT TO authenticated USING (
    user_id IN (SELECT id FROM public.profiles WHERE company_id = auth.uid())
  );

-- Volunteer hours
CREATE POLICY "Company manages hours for own adotados" ON public.volunteer_hours
  FOR ALL TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());
CREATE POLICY "Adotado views own hours" ON public.volunteer_hours
  FOR SELECT TO authenticated USING (adotado_id = auth.uid());
