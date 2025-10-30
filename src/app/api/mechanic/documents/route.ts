import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

export async function GET(req: NextRequest) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Fetch all documents for this mechanic
    const { data: documents, error: documentsError } = await supabaseAdmin
      .from('mechanic_documents')
      .select('*')
      .eq('mechanic_id', mechanic.id)
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
