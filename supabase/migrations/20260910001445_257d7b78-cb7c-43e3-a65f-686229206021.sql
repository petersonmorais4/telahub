CREATE TABLE public.partner_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj TEXT NOT NULL,
  business_name TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT INSERT ON public.partner_leads TO anon;
GRANT SELECT ON public.partner_leads TO authenticated;
GRANT ALL ON public.partner_leads TO service_role;
ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer pessoa pode enviar" ON public.partner_leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Equipe pode visualizar" ON public.partner_leads FOR SELECT TO authenticated USING (true);