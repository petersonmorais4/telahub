CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'operator');
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['schedules','playlist_items','playlists','screens','media','play_logs'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Auth manage %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Staff manage %s" ON public.%I FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', t, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Auth manage settings" ON public.app_settings;
CREATE POLICY "Staff manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Public read play_logs" ON public.play_logs;
DROP POLICY IF EXISTS "Public insert play_logs" ON public.play_logs;
CREATE POLICY "Players insert play_logs for real screens" ON public.play_logs FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.screens s WHERE s.id = screen_id));

DROP POLICY IF EXISTS "Equipe pode visualizar" ON public.partner_leads;
CREATE POLICY "Equipe pode visualizar" ON public.partner_leads FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Equipe pode visualizar" ON public.advertiser_leads;
CREATE POLICY "Equipe pode visualizar" ON public.advertiser_leads FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));