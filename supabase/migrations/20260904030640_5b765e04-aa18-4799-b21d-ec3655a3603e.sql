CREATE TABLE public.balance_carry (
  target text PRIMARY KEY,
  amount numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.balance_carry TO anon;
GRANT SELECT ON public.balance_carry TO authenticated;
GRANT ALL ON public.balance_carry TO service_role;
ALTER TABLE public.balance_carry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read balance carry" ON public.balance_carry FOR SELECT TO anon USING (true);
CREATE POLICY "authenticated read balance carry" ON public.balance_carry FOR SELECT TO authenticated USING (true);
INSERT INTO public.balance_carry (target, amount) VALUES ('acara', 0), ('internal', 0);