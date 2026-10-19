DROP POLICY IF EXISTS "Auth delete media files" ON storage.objects;
DROP POLICY IF EXISTS "Auth update media files" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload media files" ON storage.objects;
CREATE POLICY "Staff delete media files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff update media files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'media' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff upload media files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.is_staff(auth.uid()));