
CREATE POLICY "public can read pamflet objects" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'pamflet');
