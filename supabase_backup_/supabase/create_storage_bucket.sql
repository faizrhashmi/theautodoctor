-- Create storage bucket for chat attachments

-- Step 1: Create the bucket (run this first)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Set up RLS policies for the bucket

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload chat attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT session_id::text
    FROM session_participants
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to view files from their sessions
CREATE POLICY "Users can view their session attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT session_id::text
    FROM session_participants
    WHERE user_id = auth.uid()
  )
);

-- Allow public access (since bucket is public)
CREATE POLICY "Public can view attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- Verify policies were created
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%chat%';

SELECT 'Storage bucket created successfully!' AS status;
