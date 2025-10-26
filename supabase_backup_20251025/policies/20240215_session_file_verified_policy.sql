-- Enforce verified participants for session file uploads
DROP POLICY IF EXISTS "Session participants can upload files" ON public.session_files;
CREATE POLICY "Session participants can upload files"
  ON public.session_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.session_participants sp
      WHERE sp.session_id = session_files.session_id
        AND sp.user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND coalesce(p.email_verified, false) = true
    )
  );
