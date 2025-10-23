-- =====================================================
-- SUPABASE STORAGE BUCKETS SETUP
-- =====================================================
-- This script creates all necessary storage buckets
-- Run this in your Supabase SQL Editor OR use the Dashboard UI
-- Date: 2025-10-23

-- =====================================================
-- OPTION 1: Using SQL (Run in SQL Editor)
-- =====================================================

-- Create mechanic_documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mechanic_documents',
  'mechanic_documents',
  false, -- private bucket
  10485760, -- 10MB max file size
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Create waiver_signatures bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'waiver_signatures',
  'waiver_signatures',
  false, -- private bucket
  2097152, -- 2MB max file size
  ARRAY['image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Create session_files bucket (if not already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session_files',
  'session_files',
  false, -- private bucket
  52428800, -- 50MB max file size
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- Create corporate_invoices bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'corporate_invoices',
  'corporate_invoices',
  false, -- private bucket
  10485760, -- 10MB max file size
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES FOR mechanic_documents
-- =====================================================

-- Mechanics can upload their own documents
CREATE POLICY "Mechanics can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mechanic_documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Mechanics can view their own documents
CREATE POLICY "Mechanics can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'mechanic_documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Mechanics can update their own documents
CREATE POLICY "Mechanics can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mechanic_documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Mechanics can delete their own documents
CREATE POLICY "Mechanics can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'mechanic_documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all mechanic documents
CREATE POLICY "Admins can view all mechanic documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'mechanic_documents' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- =====================================================
-- STORAGE POLICIES FOR waiver_signatures
-- =====================================================

-- Users can upload their own waiver signatures
CREATE POLICY "Users can upload own waivers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'waiver_signatures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own waiver signatures
CREATE POLICY "Users can view own waivers"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'waiver_signatures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all waiver signatures
CREATE POLICY "Admins can view all waivers"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'waiver_signatures' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- =====================================================
-- STORAGE POLICIES FOR session_files
-- =====================================================

-- Session participants can upload files
CREATE POLICY "Session participants can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'session_files'
);

-- Session participants can view session files
CREATE POLICY "Session participants can view files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'session_files'
);

-- =====================================================
-- STORAGE POLICIES FOR corporate_invoices
-- =====================================================

-- Admins can upload corporate invoices
CREATE POLICY "Admins can upload corporate invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'corporate_invoices' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Admins can view all corporate invoices
CREATE POLICY "Admins can view corporate invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'corporate_invoices' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Corporate users can view their own invoices
CREATE POLICY "Corporate users can view own invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'corporate_invoices' AND
  EXISTS (
    SELECT 1 FROM corporate_employees ce
    JOIN corporate_businesses cb ON ce.corporate_id = cb.id
    WHERE ce.employee_user_id = auth.uid()
    AND ce.is_active = true
    AND (storage.foldername(name))[1] = cb.id::text
  )
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check buckets were created
SELECT id, name, public, file_size_limit, created_at
FROM storage.buckets
WHERE id IN ('mechanic_documents', 'waiver_signatures', 'session_files', 'corporate_invoices')
ORDER BY created_at DESC;

-- Check policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
ORDER BY policyname;

SELECT 'Storage buckets and policies created successfully!' AS status;

-- =====================================================
-- OPTION 2: Using Supabase Dashboard (RECOMMENDED)
-- =====================================================

/*
If the SQL approach doesn't work, use the Supabase Dashboard:

1. Go to Storage in your Supabase Dashboard
2. Click "Create a new bucket"
3. Create these buckets one by one:

BUCKET 1: mechanic_documents
- Name: mechanic_documents
- Public: OFF (private)
- File size limit: 10 MB
- Allowed MIME types:
  - application/pdf
  - image/jpeg
  - image/jpg
  - image/png
  - image/webp
  - application/msword
  - application/vnd.openxmlformats-officedocument.wordprocessingml.document

BUCKET 2: waiver_signatures
- Name: waiver_signatures
- Public: OFF (private)
- File size limit: 2 MB
- Allowed MIME types:
  - image/png
  - image/jpeg
  - image/jpg

BUCKET 3: session_files
- Name: session_files
- Public: OFF (private)
- File size limit: 50 MB
- Allowed MIME types:
  - application/pdf
  - image/jpeg
  - image/jpg
  - image/png
  - image/webp
  - video/mp4
  - video/webm
  - video/quicktime
  - application/msword
  - application/vnd.openxmlformats-officedocument.wordprocessingml.document
  - application/vnd.ms-excel
  - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

BUCKET 4: corporate_invoices
- Name: corporate_invoices
- Public: OFF (private)
- File size limit: 10 MB
- Allowed MIME types:
  - application/pdf

After creating buckets, go to each bucket's "Policies" tab and click
"Create policy" to add the policies listed in the SQL section above.
*/
