import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const documentId = params.id
    const body = await req.json()
    const { status, rejection_reason } = body

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (status === 'rejected' && !rejection_reason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
    }

    // Update the document
    const updateData: any = {
      status,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    }

    if (status === 'rejected') {
      updateData.rejection_reason = rejection_reason
    } else {
      updateData.rejection_reason = null
    }

    const { error: updateError } = await supabaseAdmin
      .from('mechanic_documents')
      .update(updateData)
      .eq('id', documentId)

    if (updateError) {
      console.error('[ADMIN REVIEW DOCUMENT] Error:', updateError)
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN REVIEW DOCUMENT API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
