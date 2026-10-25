CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  category text NOT NULL DEFAULT 'outros',
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  expense_date date NOT NULL DEFAULT current_date,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  supplier text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read expenses" ON public.expenses FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Staff manage expenses" ON public.expenses FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX expenses_date_idx ON public.expenses(expense_date);