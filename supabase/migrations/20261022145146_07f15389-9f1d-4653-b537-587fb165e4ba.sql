DROP POLICY IF EXISTS "Qualquer pessoa pode enviar" ON public.partner_leads;
CREATE POLICY "Public submit valid partner lead" ON public.partner_leads FOR INSERT TO anon, authenticated
WITH CHECK (length(regexp_replace(cnpj,'\D','','g')) = 14 AND length(btrim(business_name)) BETWEEN 2 AND 200 AND length(btrim(address)) BETWEEN 5 AND 300);
DROP POLICY IF EXISTS "Qualquer pessoa pode enviar" ON public.advertiser_leads;
CREATE POLICY "Public submit valid advertiser lead" ON public.advertiser_leads FOR INSERT TO anon, authenticated
WITH CHECK (length(btrim(name)) BETWEEN 2 AND 120 AND length(btrim(company)) BETWEEN 2 AND 200 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 255 AND length(regexp_replace(phone,'\D','','g')) BETWEEN 10 AND 13);