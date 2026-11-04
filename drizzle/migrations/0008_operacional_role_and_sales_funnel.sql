ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operacional';

CREATE OR REPLACE FUNCTION public.is_operacional(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'operacional')
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('admin','operator','operacional'))
$$;

CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('admin','operator','viewer','operacional'))
$$;

CREATE OR REPLACE FUNCTION public.is_sales(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('admin','operacional'))
$$;

CREATE OR REPLACE FUNCTION public.can_finance_read(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_member(_user_id) AND NOT public.is_operacional(_user_id)
$$;
CREATE OR REPLACE FUNCTION public.can_finance_write(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff(_user_id) AND NOT public.is_operacional(_user_id)
$$;

DROP POLICY IF EXISTS "Members read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Staff manage expenses" ON public.expenses;
CREATE POLICY "Finance read expenses" ON public.expenses FOR SELECT TO authenticated USING (public.can_finance_read(auth.uid()));
CREATE POLICY "Finance manage expenses" ON public.expenses FOR ALL TO authenticated USING (public.can_finance_write(auth.uid())) WITH CHECK (public.can_finance_write(auth.uid()));

DROP POLICY IF EXISTS "Members read revenues" ON public.revenues;
DROP POLICY IF EXISTS "Staff manage revenues" ON public.revenues;
CREATE POLICY "Finance read revenues" ON public.revenues FOR SELECT TO authenticated USING (public.can_finance_read(auth.uid()));
CREATE POLICY "Finance manage revenues" ON public.revenues FOR ALL TO authenticated USING (public.can_finance_write(auth.uid())) WITH CHECK (public.can_finance_write(auth.uid()));

CREATE TABLE public.sales_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  segment text,
  city text,
  contact_name text,
  phone text,
  source text,
  monthly_value numeric NOT NULL DEFAULT 0,
  owner_id uuid,
  next_action_date date,
  notes text,
  lost_reason text,
  stage text NOT NULL DEFAULT 'prospeccao' CHECK (stage IN ('prospeccao','contato','reuniao','proposta','negociacao','ganho','perdido')),
  position integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lost_needs_reason CHECK (stage <> 'perdido' OR length(btrim(coalesce(lost_reason,''))) > 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_leads TO authenticated;
GRANT ALL ON public.sales_leads TO service_role;
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sales manage leads" ON public.sales_leads FOR ALL TO authenticated USING (public.is_sales(auth.uid())) WITH CHECK (public.is_sales(auth.uid()));

CREATE TABLE public.sales_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'nota' CHECK (kind IN ('etapa','nota','ligacao','visita','mensagem','reuniao')),
  from_stage text,
  to_stage text,
  body text,
  event_date timestamptz NOT NULL DEFAULT now(),
  user_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.sales_lead_events(lead_id, event_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_lead_events TO authenticated;
GRANT ALL ON public.sales_lead_events TO service_role;
ALTER TABLE public.sales_lead_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sales manage lead events" ON public.sales_lead_events FOR ALL TO authenticated USING (public.is_sales(auth.uid())) WITH CHECK (public.is_sales(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_lead_stage() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.sales_lead_events(lead_id, kind, to_stage, user_id) VALUES (NEW.id, 'etapa', NEW.stage, auth.uid());
  ELSIF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.sales_lead_events(lead_id, kind, from_stage, to_stage, user_id, body)
    VALUES (NEW.id, 'etapa', OLD.stage, NEW.stage, auth.uid(), CASE WHEN NEW.stage = 'perdido' THEN NEW.lost_reason END);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.touch_lead() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER sales_leads_touch BEFORE UPDATE ON public.sales_leads FOR EACH ROW EXECUTE FUNCTION public.touch_lead();
CREATE TRIGGER sales_leads_stage_log AFTER INSERT OR UPDATE OF stage ON public.sales_leads FOR EACH ROW EXECUTE FUNCTION public.log_lead_stage();

CREATE OR REPLACE FUNCTION public.list_sales_users() RETURNS TABLE(id uuid, name text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.email FROM public.profiles p
  WHERE public.is_member(auth.uid()) AND public.is_staff(p.id)
  ORDER BY coalesce(p.name, p.email)
$$;
REVOKE EXECUTE ON FUNCTION public.list_sales_users() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.list_sales_users() TO authenticated;