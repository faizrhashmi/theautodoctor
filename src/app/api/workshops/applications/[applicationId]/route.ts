import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * PATCH /api/workshops/applications/[applicationId]
 *
 * Update application status (approve/reject)
 *
 * Body:
 * {
 *   action: 'approve' | 'reject' | 'under_review'
 *   rejection_reason?: string (required if action is 'reject')
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  const token = req.cookies.get('workshop_session')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate workshop session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('workshop_sessions')
      .select('workshop_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const applicationId = params.applicationId

    // Get application
    const { data: application, error: applicationError } = await supabaseAdmin
      .from('partnership_applications')
      .select('*, workshop_partnership_programs!partnership_applications_program_id_fkey (id, program_name)')
      .eq('id', applicationId)
      .single()

    if (applicationError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Verify workshop owns this application
    if (application.workshop_id !== session.workshop_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Parse request body
    const body = await req.json()
    const { action, rejection_reason } = body

    if (!['approve', 'reject', 'under_review'].includes(action)) {
      return NextResponse.json({
        error: 'action must be approve, reject, or under_review'
      }, { status: 400 })
    }

    if (action === 'reject' && !rejection_reason) {
      return NextResponse.json({
        error: 'rejection_reason is required when rejecting an application'
      }, { status: 400 })
    }

    // Update application status
    const updateData: any = {
      status: action === 'under_review' ? 'under_review' : action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (rejection_reason) {
      updateData.rejection_reason = rejection_reason
    }

    const { error: updateError } = await supabaseAdmin
      .from('partnership_applications')
      .update(updateData)
      .eq('id', applicationId)

    if (updateError) {
      console.error('[APPLICATION UPDATE API] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
    }

    // If approved, create a partnership agreement
    if (action === 'approve') {
      const agreementData = {
        program_id: application.program_id,
        mechanic_id: application.mechanic_id,
        workshop_id: application.workshop_id,
        status: 'pending_signature',
        start_date: null,
        end_date: null,
        terms_accepted_at: null,
        signed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error: agreementError } = await supabaseAdmin
        .from('partnership_agreements')
        .insert(agreementData)

      if (agreementError) {
        console.error('[APPLICATION UPDATE API] Agreement creation error:', agreementError)
        // Don't fail the request, just log the error
      }

      // Update mechanic service tier if needed
      const { error: mechanicUpdateError } = await supabaseAdmin
        .from('mechanics')
        .update({
          service_tier: 'workshop_partner',
          updated_at: new Date().toISOString()
        })
        .eq('id', application.mechanic_id)
        .eq('service_tier', 'virtual_only') // Only update if they're currently virtual_only

      if (mechanicUpdateError) {
        console.error('[APPLICATION UPDATE API] Mechanic update error:', mechanicUpdateError)
      }
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve'
        ? 'Application approved. Partnership agreement created.'
        : action === 'reject'
        ? 'Application rejected.'
        : 'Application moved to under review.'
    })

  } catch (error) {
    console.error('[APPLICATION UPDATE API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
