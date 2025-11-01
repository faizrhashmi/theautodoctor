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

    // Calculate scheduled deletion date (current date + retention period)
    const scheduledDate = new Date()
    scheduledDate.setDate(scheduledDate.getDate() + deletionRequest.retention_period_days)

    // Update deletion request to approved status
    const { error: updateError } = await supabase
      .from('account_deletion_queue')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        scheduled_deletion_date: scheduledDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', deletionId)

    if (updateError) {
      console.error('Error approving deletion request:', updateError)
      return NextResponse.json(
        { error: 'Failed to approve deletion request' },
        { status: 500 }
      )
    }

    // Log the approval in privacy audit log
    await supabase.from('privacy_audit_log').insert({
      customer_id: deletionRequest.customer_id,
      event_type: 'account_deletion_approved',
      user_id: user.id,
      user_role: 'admin',
      event_details: {
        deletion_request_id: deletionId,
        scheduled_deletion_date: scheduledDate.toISOString(),
        retention_period_days: deletionRequest.retention_period_days,
      },
      legal_basis: 'legal_obligation',
      data_categories_accessed: ['account_deletion_queue'],
    })

    return NextResponse.json({
      success: true,
      message: 'Deletion request approved',
      scheduled_deletion_date: scheduledDate.toISOString(),
    })
  } catch (error) {
    console.error('Approve deletion API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
