ALTER TABLE public.partner_leads ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.partner_leads ALTER COLUMN cnpj DROP NOT NULL;
COMMENT ON COLUMN public.partner_leads.cnpj IS 'DEPRECATED: replaced by phone';
DROP POLICY IF EXISTS "Public submit valid partner lead" ON public.partner_leads;
CREATE POLICY "Public submit valid partner lead" ON public.partner_leads FOR INSERT TO anon, authenticated
WITH CHECK (length(btrim(business_name)) BETWEEN 2 AND 200 AND length(btrim(address)) BETWEEN 5 AND 300 AND length(regexp_replace(coalesce(phone,''),'\D','','g')) BETWEEN 10 AND 13);