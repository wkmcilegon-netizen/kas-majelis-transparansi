DROP POLICY IF EXISTS "public read balance carry" ON public.balance_carry;
REVOKE SELECT ON public.balance_carry FROM anon;
DROP POLICY IF EXISTS "roles readable by authenticated" ON public.user_roles;