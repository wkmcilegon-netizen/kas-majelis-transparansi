
CREATE POLICY "admins manage pamflet objects" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'pamflet' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'pamflet' AND public.has_role(auth.uid(),'admin'));
