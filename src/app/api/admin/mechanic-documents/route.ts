import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
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
