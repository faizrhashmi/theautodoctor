-- Migration: Chat Attachments Storage Bucket
-- Creates storage bucket for chat file uploads
-- Note: Policies must be added via Supabase Dashboard UI due to permissions

-- Step 1: Create the chat-attachments storage bucket (public for easy access)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  true,
  52428800, -- 50MB limit
  array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'video/mp4',
    'video/quicktime'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'video/mp4',
    'video/quicktime'
  ];

-- Step 2: Add helpful comment
comment on table storage.buckets is 'Storage buckets for file uploads';

-- IMPORTANT: After running this SQL, you MUST add storage policies via the Supabase Dashboard
-- because the postgres user doesn't have permission to create policies on storage.objects table.
--
-- Go to: Storage → chat-attachments → Policies → Add Policy
-- Add these 4 policies:
--
-- 1. Policy Name: "Authenticated users can upload"
--    Operation: INSERT
--    Target roles: authenticated
--    USING expression: true
--    WITH CHECK expression: bucket_id = 'chat-attachments'
--
-- 2. Policy Name: "Authenticated users can read"
--    Operation: SELECT
--    Target roles: authenticated
--    USING expression: bucket_id = 'chat-attachments'
--
-- 3. Policy Name: "Authenticated users can update"
--    Operation: UPDATE
--    Target roles: authenticated
--    USING expression: bucket_id = 'chat-attachments'
--    WITH CHECK expression: bucket_id = 'chat-attachments'
--
-- 4. Policy Name: "Authenticated users can delete"
--    Operation: DELETE
--    Target roles: authenticated
--    USING expression: bucket_id = 'chat-attachments'
