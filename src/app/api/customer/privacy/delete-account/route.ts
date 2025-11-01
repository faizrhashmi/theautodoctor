import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { deletionReason } = body

    if (!deletionReason || deletionReason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a reason for deletion (minimum 10 characters)' },
        { status: 400 }
      )
    }

    // Get IP address and user agent
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Request account deletion using database function
    const { data: deletionRequestId, error: deletionError } = await supabaseAdmin.rpc('request_account_deletion', {
      p_customer_id: user.id,
      p_deletion_reason: deletionReason.trim(),
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    })

    if (deletionError) {
      console.error('[delete-account] Database error:', deletionError)

      // Check if error is due to active sessions
      if (deletionError.message?.includes('active sessions')) {
        return NextResponse.json(
          { error: 'Cannot delete account with active diagnostic sessions. Please complete or cancel all active sessions first.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: deletionError.message || 'Failed to request account deletion' },
        { status: 500 }
      )
    }

    // Get the deletion request details to return retention schedule
    const { data: deletionRequest, error: fetchError } = await supabaseAdmin
      .from('account_deletion_queue')
      .select('*')
      .eq('id', deletionRequestId)
      .single()

    if (fetchError) {
      console.error('[delete-account] Failed to fetch deletion request:', fetchError)
    }

    return NextResponse.json({
      success: true,
      deletionRequestId,
      message: 'Account deletion request submitted successfully',
      retentionSchedule: deletionRequest?.retention_schedule || null,
      fullAnonymizationDate: deletionRequest?.full_anonymization_date || null,
      nextSteps: [
        'Your account will be deactivated immediately',
        'Personal data will be deleted or anonymized according to legal retention requirements',
        'Tax records will be retained for 7 years (CRA requirement)',
        'You will receive a confirmation email',
        'Contact privacy@theautodoctor.ca if you have questions',
      ],
    })
  } catch (error: any) {
    console.error('[delete-account] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
