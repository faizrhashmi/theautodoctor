import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    const documentId = params.id

    // Verify document belongs to this mechanic
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('mechanic_documents')
      .select('mechanic_id, file_url')
      .eq('id', documentId)
      .single()

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.mechanic_id !== mechanic.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete the document record
    const { error: deleteError } = await supabaseAdmin
      .from('mechanic_documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      console.error('[DELETE DOCUMENT] Error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    // TODO: Also delete the file from storage if using cloud storage
    // For now, we just delete the database record

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE DOCUMENT API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
