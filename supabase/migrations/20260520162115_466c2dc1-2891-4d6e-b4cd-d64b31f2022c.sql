CREATE TYPE public.submission_status AS ENUM ('pendente', 'aprovado', 'rejeitado');

ALTER TABLE public.income_submissions
  ADD COLUMN status public.submission_status NOT NULL DEFAULT 'pendente',
  ADD COLUMN document_url text,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN reviewed_by uuid,
  ADD COLUMN submission_month date GENERATED ALWAYS AS ((submitted_at AT TIME ZONE 'UTC')::date - EXTRACT(DAY FROM (submitted_at AT TIME ZONE 'UTC'))::int + 1) STORED;

CREATE UNIQUE INDEX income_submissions_user_month_uidx
  ON public.income_submissions (user_id, submission_month);

CREATE POLICY "Company updates adotados submissions status"
ON public.income_submissions
FOR UPDATE
TO authenticated
USING (user_id IN (SELECT id FROM public.profiles WHERE company_id = auth.uid()))
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE company_id = auth.uid()));

INSERT INTO storage.buckets (id, name, public)
VALUES ('income-proofs', 'income-proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Adotado uploads own proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'income-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Adotado reads own proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'income-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Company reads adotados proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'income-proofs'
  AND ((storage.foldername(name))[1])::uuid IN (
    SELECT id FROM public.profiles WHERE company_id = auth.uid()
  )
);
