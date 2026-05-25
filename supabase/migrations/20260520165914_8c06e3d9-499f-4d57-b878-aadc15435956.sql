
-- Avatar
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Messages / recados
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  adotado_id uuid NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company sends messages to own adotados"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (company_id = auth.uid() AND adotado_id IN (
  SELECT id FROM public.profiles WHERE company_id = auth.uid()
));

CREATE POLICY "Company views sent messages"
ON public.messages FOR SELECT TO authenticated
USING (company_id = auth.uid());

CREATE POLICY "Adotado views own messages"
ON public.messages FOR SELECT TO authenticated
USING (adotado_id = auth.uid());

CREATE POLICY "Adotado updates own messages read"
ON public.messages FOR UPDATE TO authenticated
USING (adotado_id = auth.uid())
WITH CHECK (adotado_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_messages_adotado ON public.messages(adotado_id, created_at DESC);

-- Avatars bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
