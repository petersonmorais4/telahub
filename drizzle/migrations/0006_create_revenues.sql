CREATE TABLE public.revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  description text,
  amount numeric NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'pix',
  recurrence_days integer NOT NULL DEFAULT 30,
  recurring boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenues TO authenticated;
GRANT ALL ON public.revenues TO service_role;
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read revenues" ON public.revenues FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Staff manage revenues" ON public.revenues FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));