/**
 * SESSION FILES API
 *
 * Handles file uploads and downloads for sessions using Supabase Storage.
 * Only session participants (customer or mechanic) can upload/view files.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// GET: List all files for a session with signed URLs
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  try {
    // Auth check
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is participant
    const { data: session } = await supabase
      .from('sessions')
      .select('customer_user_id, mechanic_id')
      .eq('id', sessionId)
      .single()

    if (!session || (session.customer_user_id !== user.id && session.mechanic_id !== user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
          fileName: file.name,
          fileSize: file.size,
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

  try {
    // Auth check
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is participant
    const { data: session } = await supabase
      .from('sessions')
      .select('customer_user_id, mechanic_id')
      .eq('id', sessionId)
      .single()

    if (!session || (session.customer_user_id !== user.id && session.mechanic_id !== user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Generate storage path: session-files/{sessionId}/{timestamp}-{random}.{ext}
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const storagePath = `${sessionId}/${timestamp}-${randomId}.${fileExt}`

    console.log('[files/POST] Uploading file:', { sessionId, fileName: file.name, size: file.size, storagePath })

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('session-files')
      .upload(storagePath, file, {
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
        uploaded_by: user.id,
        name: file.name,
        type: file.type,
        size: file.size,
        storage_path: storagePath,
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
          fileName: dbFile.name,
          fileSize: dbFile.size,
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
