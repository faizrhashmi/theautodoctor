import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_session_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate admin session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('admin_sessions')
      .select('admin_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Fetch all mechanic documents with mechanic details
    const { data: documents, error: documentsError } = await supabaseAdmin
      .from('mechanic_documents')
      .select(`
        *,
        mechanics (
          name,
          email
        )
      `)
      .order('uploaded_at', { ascending: false })

    if (documentsError) {
      console.error('[ADMIN MECHANIC DOCUMENTS] Error:', documentsError)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    // Format the response
    const formattedDocuments = documents.map((doc: any) => ({
      ...doc,
      mechanic: doc.mechanics,
      mechanics: undefined,
    }))

    return NextResponse.json({
      documents: formattedDocuments,
    })
  } catch (error) {
    console.error('[ADMIN MECHANIC DOCUMENTS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
