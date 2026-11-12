DROP POLICY IF EXISTS "Public read media files" ON storage.objects;
CREATE POLICY "Members read media files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND public.is_member(auth.uid()));
CREATE POLICY "Player reads active media files" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media' AND (
    EXISTS (SELECT 1 FROM public.media m WHERE m.storage_path = storage.objects.name AND m.active
      AND (m.end_date IS NULL OR m.end_date >= current_date))
    OR EXISTS (SELECT 1 FROM public.app_settings s WHERE s.logo_url = storage.objects.name)
  ));