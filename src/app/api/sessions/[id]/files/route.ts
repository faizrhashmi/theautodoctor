import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/sessions/[id]/files
 * Save session files (screenshots, voice transcripts, uploads) to database
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const sessionId = params.id

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is participant in this session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('customer_user_id, mechanic_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const isParticipant = user.id === session.customer_user_id || user.id === session.mechanic_id

    if (!isParticipant) {
      return NextResponse.json({ error: 'Not a participant in this session' }, { status: 403 })
    }

    // Parse request body
    const body = await req.json()
    const { file_category, transcript, tags, metadata } = body

    // Validate file_category
    if (!['upload', 'voice_transcript', 'screenshot'].includes(file_category)) {
      return NextResponse.json({ error: 'Invalid file_category' }, { status: 400 })
    }

    // For voice transcripts, save directly without file upload
    const fileName = `${file_category}-${Date.now()}.txt`

    // Save to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('session_files')
      .insert({
        session_id: sessionId,
        uploaded_by: user.id,
        file_category,
        file_name: fileName,
        file_size: transcript ? transcript.length : 0,
        file_type: 'text/plain',
        storage_path: '',
        file_url: null,
        transcript: transcript || null,
        tags: tags || [],
        metadata: metadata || {},
        description: transcript ? transcript.substring(0, 200) : null
      })
      .select()
      .single()

    if (dbError) {
      console.error('[API] Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save to database: ' + dbError.message }, { status: 500 })
    }

    console.log('[API] ✅ Session file saved:', {
      id: fileRecord.id,
      category: file_category,
      session: sessionId
    })

    return NextResponse.json({
      success: true,
      file: fileRecord
    })

  } catch (error) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/sessions/[id]/files
 * Get all files for a session
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const sessionId = params.id

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is participant
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('customer_user_id, mechanic_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const isParticipant = user.id === session.customer_user_id || user.id === session.mechanic_id

    if (!isParticipant) {
      return NextResponse.json({ error: 'Not a participant in this session' }, { status: 403 })
    }

    // Get all files for this session
    const { data: files, error: filesError } = await supabase
      .from('session_files')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (filesError) {
      console.error('[API] Error fetching files:', filesError)
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
    }

    // Calculate summary
    const summary = {
      total_files: files.length,
      screenshots: files.filter(f => f.file_category === 'screenshot').length,
      voice_transcripts: files.filter(f => f.file_category === 'voice_transcript').length,
      uploads: files.filter(f => f.file_category === 'upload').length,
      tags_used: [...new Set(files.flatMap(f => f.tags || []))],
      total_size_bytes: files.reduce((sum, f) => sum + (f.file_size || 0), 0)
    }

    return NextResponse.json({
      success: true,
      files,
      summary
    })

  } catch (error) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
