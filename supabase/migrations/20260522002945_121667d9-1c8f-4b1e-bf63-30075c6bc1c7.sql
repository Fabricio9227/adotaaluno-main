
-- 1. Waiting list: companies can view unadopted adotados
CREATE POLICY "Companies view waiting list"
ON public.profiles FOR SELECT
TO authenticated
USING (role = 'adotado' AND company_id IS NULL);

-- 2. Companies can claim (adopt) an unadopted student
-- Only when current company_id IS NULL, and only by setting it to themselves
CREATE POLICY "Companies adopt waiting students"
ON public.profiles FOR UPDATE
TO authenticated
USING (role = 'adotado' AND company_id IS NULL)
WITH CHECK (role = 'adotado' AND company_id = auth.uid());

-- 3. Tasks table
CREATE TYPE public.task_status AS ENUM ('pendente', 'em_andamento', 'concluida');

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  adotado_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company manages tasks for own adotados"
ON public.tasks FOR ALL
TO authenticated
USING (company_id = auth.uid())
WITH CHECK (company_id = auth.uid());

CREATE POLICY "Adotado views own tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (adotado_id = auth.uid());

CREATE POLICY "Adotado updates own task status"
ON public.tasks FOR UPDATE
TO authenticated
USING (adotado_id = auth.uid())
WITH CHECK (adotado_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER tasks_set_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
