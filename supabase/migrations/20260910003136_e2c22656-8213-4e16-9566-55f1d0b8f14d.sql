CREATE TABLE public.advertiser_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT INSERT ON public.advertiser_leads TO anon;
GRANT SELECT ON public.advertiser_leads TO authenticated;
GRANT ALL ON public.advertiser_leads TO service_role;
ALTER TABLE public.advertiser_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer pessoa pode enviar" ON public.advertiser_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Equipe pode visualizar" ON public.advertiser_leads FOR SELECT TO authenticated USING (true);