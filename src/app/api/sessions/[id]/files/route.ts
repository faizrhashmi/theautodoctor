/**
 * SESSION FILES API
 *
 * Handles file uploads and downloads for sessions using Supabase Storage.
 * Only session participants (customer or mechanic) can upload/view files.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSessionParticipantRelaxed } from '@/lib/auth/relaxedSessionAuth'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { fileTypeFromBuffer } from 'file-type'
import { scanFileForMalware, logMalwareDetection, logSecurityEvent } from '@/lib/security/malwareScan'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// GET: List all files for a session with signed URLs
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  // Validate session participant FIRST
  const authResult = await requireSessionParticipantRelaxed(req, sessionId)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[GET /sessions/${sessionId}/files] ${participant.role} accessing files for session ${participant.sessionId}`)

  try {
    // Create supabase client for storage operations
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    // Fetch files from DB
    const { data: files, error } = await supabase
      .from('session_files')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[files] Error fetching files:', error)
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
    }

    // Generate signed URLs (1 hour expiry)
    const filesWithUrls = await Promise.all(
      (files || []).map(async (file) => {
        const { data } = await supabase.storage
          .from('session-files')
          .createSignedUrl(file.storage_path, 3600)

        return {
          id: file.id,
          fileName: file.file_name,
          fileSize: file.file_size,
          fileType: file.file_type,
          uploadedAt: file.created_at,
          uploadedBy: file.uploaded_by,
          url: data?.signedUrl || null,
          storagePath: file.storage_path,
        }
      })
    )

    return NextResponse.json({ files: filesWithUrls })
  } catch (error) {
    console.error('[files/GET] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Upload a file to session storage
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  // Validate session participant FIRST
  const authResult = await requireSessionParticipantRelaxed(req, sessionId)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[POST /sessions/${sessionId}/files] ${participant.role} uploading file to session ${participant.sessionId}`)

  try {

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // P0-3 FIX: Validate file size (25MB limit as approved)
    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 })
    }

    // P0-3 FIX: File type whitelist (as approved)
    const ALLOWED_MIME_TYPES = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
      'video/mp4',
    ]

    const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt', '.csv', '.mp4']

    // Validate declared MIME type
    const declaredType = file.type
    if (!ALLOWED_MIME_TYPES.includes(declaredType)) {
      await logSecurityEvent('file_type_rejected', {
        user_id: participant.userId,
        session_id: sessionId,
        filename: file.name,
        declared_type: declaredType,
      })
      return NextResponse.json({
        error: `File type ${declaredType} not allowed. Allowed: images, PDF, text, CSV, MP4 video`
      }, { status: 400 })
    }

    // Validate file extension
    const fileName = file.name.toLowerCase()
    const hasAllowedExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext))
    if (!hasAllowedExtension) {
      await logSecurityEvent('file_extension_rejected', {
        user_id: participant.userId,
        session_id: sessionId,
        filename: file.name,
      })
      return NextResponse.json({
        error: `File extension not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
      }, { status: 400 })
    }

    // P0-3 FIX: Validate actual file content (magic bytes)
    const buffer = Buffer.from(await file.arrayBuffer())
    const detectedType = await fileTypeFromBuffer(buffer)

    // Some text files may not have a detectable type, allow for text/plain and text/csv
    if (!detectedType && !['text/plain', 'text/csv'].includes(declaredType)) {
      await logSecurityEvent('file_type_undetectable', {
        user_id: participant.userId,
        session_id: sessionId,
        filename: file.name,
        declared_type: declaredType,
      })
      return NextResponse.json({
        error: 'Unable to determine file type'
      }, { status: 400 })
    }

    // If type is detectable, verify it matches whitelist
    if (detectedType && !ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
      await logSecurityEvent('file_type_mismatch', {
        user_id: participant.userId,
        session_id: sessionId,
        filename: file.name,
        declared_type: declaredType,
        detected_type: detectedType.mime,
      })
      return NextResponse.json({
        error: 'File content does not match declared type (possible malware)'
      }, { status: 400 })
    }

    // P0-4 FIX: Scan for malware before upload
    let scanResult
    try {
      scanResult = await scanFileForMalware(buffer, file.name)
    } catch (error) {
      console.error('[files/POST] Malware scan failed:', error)
      return NextResponse.json({
        error: 'File scanning unavailable. Upload blocked for security.'
      }, { status: 503 })
    }

    if (scanResult.infected) {
      // Log malware detection
      await logMalwareDetection({
        user_id: participant.userId,
        session_id: sessionId,
        filename: file.name,
        virus: scanResult.virus || 'unknown',
        engine: scanResult.engine || 'unknown',
      })

      return NextResponse.json({
        error: 'File blocked: contains malware or suspicious content'
      }, { status: 400 })
    }

    // Generate storage path: session-files/{sessionId}/{timestamp}-{random}.{ext}
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const storagePath = `${sessionId}/${timestamp}-${randomId}.${fileExt}`

    console.log('[files/POST] Uploading file:', {
      sessionId,
      fileName: file.name,
      size: file.size,
      storagePath,
      scanned: scanResult.scanned,
      clean: scanResult.clean,
    })

    // Upload to Supabase Storage (now safe after all validations)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('session-files')
      .upload(storagePath, buffer, {
        contentType: detectedType?.mime || declaredType,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('[files/POST] Upload error:', uploadError)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    // Insert DB record
    const { data: dbFile, error: dbError } = await supabaseAdmin
      .from('session_files')
      .insert({
        session_id: sessionId,
        uploaded_by: participant.userId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        metadata: {
          original_filename: file.name,
          bytes: file.size,
          mime_type: file.type,
        },
      })
      .select()
      .single()

    if (dbError) {
      console.error('[files/POST] DB insert error:', dbError)
      // Cleanup storage if DB fails
      await supabaseAdmin.storage.from('session-files').remove([storagePath])
      return NextResponse.json({ error: 'Failed to save file metadata' }, { status: 500 })
    }

    console.log('[files/POST] File uploaded successfully:', dbFile.id)

    // Generate signed URL for immediate use
    const { data: urlData } = await supabaseAdmin.storage
      .from('session-files')
      .createSignedUrl(storagePath, 3600)

    return NextResponse.json(
      {
        file: {
          id: dbFile.id,
          fileName: dbFile.file_name,
          fileSize: dbFile.file_size,
          fileType: dbFile.file_type,
          uploadedAt: dbFile.created_at,
          uploadedBy: dbFile.uploaded_by,
          url: urlData?.signedUrl || null,
          storagePath: dbFile.storage_path,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[files/POST] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
