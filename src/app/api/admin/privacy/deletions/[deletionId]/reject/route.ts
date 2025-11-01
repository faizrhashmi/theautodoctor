import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { deletionId: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { deletionId } = params
    const { reason } = await req.json()

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    // Get deletion request details
    const { data: deletionRequest, error: fetchError } = await supabase
      .from('account_deletion_queue')
      .select('*, profiles:customer_id (email, full_name)')
      .eq('id', deletionId)
      .single()

    if (fetchError || !deletionRequest) {
      return NextResponse.json(
        { error: 'Deletion request not found' },
        { status: 404 }
      )
    }

    if (deletionRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Deletion request has already been processed' },
        { status: 400 }
      )
    }

    // Update deletion request to rejected status
    const { error: updateError } = await supabase
      .from('account_deletion_queue')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deletionId)

    if (updateError) {
      console.error('Error rejecting deletion request:', updateError)
      return NextResponse.json(
        { error: 'Failed to reject deletion request' },
        { status: 500 }
      )
    }

    // Log the rejection in privacy audit log
    await supabase.from('privacy_audit_log').insert({
      customer_id: deletionRequest.customer_id,
      event_type: 'account_deletion_rejected',
      user_id: user.id,
      user_role: 'admin',
      event_details: {
        deletion_request_id: deletionId,
        rejection_reason: reason,
      },
      legal_basis: 'legal_obligation',
      data_categories_accessed: ['account_deletion_queue'],
    })

    return NextResponse.json({
      success: true,
      message: 'Deletion request rejected',
    })
  } catch (error) {
    console.error('Reject deletion API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
