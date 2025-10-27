import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Fetch all documents for this mechanic
    const { data: documents, error: documentsError } = await supabaseAdmin
      .from('mechanic_documents')
      .select('*')
      .eq('mechanic_id', session.mechanic_id)
      .order('uploaded_at', { ascending: false })

    if (documentsError) {
      console.error('[MECHANIC DOCUMENTS API] Error fetching documents:', documentsError)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    // Check for expired documents and update status
    const now = new Date()
    const documentsWithStatus = documents.map((doc: any) => {
      // Auto-mark as expired if expires_at is in the past
      if (doc.expires_at && new Date(doc.expires_at) < now && doc.status === 'approved') {
        // Update in background (don't await)
        supabaseAdmin
          .from('mechanic_documents')
          .update({ status: 'expired' })
          .eq('id', doc.id)
          .then(() => {})

        return { ...doc, status: 'expired' }
      }
      return doc
    })

    return NextResponse.json({
      documents: documentsWithStatus,
    })
  } catch (error) {
    console.error('[MECHANIC DOCUMENTS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
