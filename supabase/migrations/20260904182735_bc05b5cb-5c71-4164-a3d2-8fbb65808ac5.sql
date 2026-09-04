DROP POLICY IF EXISTS "members read all transactions" ON public.transactions;
CREATE POLICY "read own, approved or admin transactions" ON public.transactions
FOR SELECT TO authenticated
USING (status = 'approved' OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "authenticated read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "members read all user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;
CREATE POLICY "read own roles or admin" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));