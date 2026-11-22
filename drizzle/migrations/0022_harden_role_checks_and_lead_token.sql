CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT (_user_id = auth.uid() OR auth.role() = 'service_role')
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT (_user_id = auth.uid() OR auth.role() = 'service_role')
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('admin','operator','viewer','operacional'));
$$;
CREATE OR REPLACE FUNCTION public.can_finance_write(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT (_user_id = auth.uid() OR auth.role() = 'service_role')
    AND public.is_staff(_user_id) AND NOT public.is_operacional(_user_id);
$$;
ALTER TABLE public.advertiser_leads ADD COLUMN IF NOT EXISTS notify_token_hash text;
ALTER TABLE public.partner_leads ADD COLUMN IF NOT EXISTS notify_token_hash text;