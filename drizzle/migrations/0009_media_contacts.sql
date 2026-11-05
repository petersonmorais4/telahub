CREATE TABLE public.media_contacts (
  media_id uuid PRIMARY KEY REFERENCES public.media(id) ON DELETE CASCADE,
  client_name text,
  client_email text,
  send_report boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_contacts TO authenticated;
GRANT ALL ON public.media_contacts TO service_role;
ALTER TABLE public.media_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read media contacts" ON public.media_contacts FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "staff insert media contacts" ON public.media_contacts FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update media contacts" ON public.media_contacts FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff delete media contacts" ON public.media_contacts FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));