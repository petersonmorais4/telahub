ALTER TABLE public.advertiser_leads ADD COLUMN IF NOT EXISTS notified_at timestamptz;
ALTER TABLE public.partner_leads ADD COLUMN IF NOT EXISTS notified_at timestamptz;

CREATE OR REPLACE FUNCTION public.advertiser_lead_to_funnel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.sales_leads (business_name, contact_name, phone, source, notes, stage)
  VALUES (
    left(NEW.company, 250), NEW.name, NEW.phone,
    CASE WHEN NEW.company LIKE '[Indicação%' THEN 'Site - Indique e Ganhe' ELSE 'Site - Quero anunciar' END,
    'Anunciante. E-mail: ' || NEW.email, 'prospeccao');
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.partner_lead_to_funnel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.sales_leads (business_name, source, notes, stage)
  VALUES (left(NEW.business_name, 250), 'Site - Seja parceiro',
    'Parceiro. CNPJ: ' || NEW.cnpj || ' | Endereço: ' || NEW.address, 'prospeccao');
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.advertiser_lead_to_funnel() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.partner_lead_to_funnel() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS advertiser_lead_to_funnel ON public.advertiser_leads;
CREATE TRIGGER advertiser_lead_to_funnel AFTER INSERT ON public.advertiser_leads
FOR EACH ROW EXECUTE FUNCTION public.advertiser_lead_to_funnel();
DROP TRIGGER IF EXISTS partner_lead_to_funnel ON public.partner_leads;
CREATE TRIGGER partner_lead_to_funnel AFTER INSERT ON public.partner_leads
FOR EACH ROW EXECUTE FUNCTION public.partner_lead_to_funnel();