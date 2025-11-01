import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
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

    // Get all deletion requests with customer details
    const { data: deletions, error: deletionsError } = await supabase
      .from('account_deletion_queue')
      .select(
        `
        id,
        customer_id,
        deletion_reason,
        requested_at,
        approved_at,
        approved_by,
        rejected_at,
        rejected_by,
        rejection_reason,
        scheduled_deletion_date,
        anonymized_at,
        status,
        retention_period_days,
        customer_note,
        profiles:customer_id (email, full_name)
      `
      )
      .order('requested_at', { ascending: false })

    if (deletionsError) {
      console.error('Error fetching deletion requests:', deletionsError)
      return NextResponse.json(
        { error: 'Failed to fetch deletion requests' },
        { status: 500 }
      )
    }

    // Format deletions
    const formattedDeletions = (deletions || []).map((deletion: any) => ({
      id: deletion.id,
      customer_id: deletion.customer_id,
      customer_email: deletion.profiles?.email || null,
      customer_full_name: deletion.profiles?.full_name || null,
      deletion_reason: deletion.deletion_reason,
      requested_at: deletion.requested_at,
      approved_at: deletion.approved_at,
      approved_by: deletion.approved_by,
      rejected_at: deletion.rejected_at,
      rejected_by: deletion.rejected_by,
      rejection_reason: deletion.rejection_reason,
      scheduled_deletion_date: deletion.scheduled_deletion_date,
      anonymized_at: deletion.anonymized_at,
      status: deletion.status,
      retention_period_days: deletion.retention_period_days,
      customer_note: deletion.customer_note,
    }))

    return NextResponse.json({
      deletions: formattedDeletions,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Deletions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
