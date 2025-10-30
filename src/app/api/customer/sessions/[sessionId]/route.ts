import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(request)
    if (authResult.error) return authResult.error

    const customer = authResult.data
    console.log(`[CUSTOMER] ${customer.email} deleting session ${params.sessionId}`)

    const { sessionId } = params

    // First verify this session belongs to the customer
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_user_id, status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify ownership
    if (session.customer_user_id !== customer.id) {
      return NextResponse.json({ error: 'Forbidden - Not your session' }, { status: 403 })
    }

    // Only allow deletion of completed or cancelled sessions
    if (!['completed', 'cancelled'].includes(session.status)) {
      return NextResponse.json({
        error: 'Cannot delete active or scheduled sessions. Please cancel them first.'
      }, { status: 400 })
    }

    // Delete the session
    const { error: deleteError } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('id', sessionId)

    if (deleteError) {
      console.error('Delete session error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    })

  } catch (error) {
    console.error('Delete session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
