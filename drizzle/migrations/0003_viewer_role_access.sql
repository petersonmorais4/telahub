CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE POLICY "Members read play_logs" ON public.play_logs FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS "Equipe pode visualizar" ON public.partner_leads;
CREATE POLICY "Equipe pode visualizar" ON public.partner_leads FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS "Equipe pode visualizar" ON public.advertiser_leads;
CREATE POLICY "Equipe pode visualizar" ON public.advertiser_leads FOR SELECT TO authenticated USING (public.is_member(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'admin'::public.app_role ELSE 'viewer'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;