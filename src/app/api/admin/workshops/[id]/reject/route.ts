// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { ensureAdmin } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/email/emailService'
import { workshopRejectionEmail } from '@/lib/email/workshopTemplates'
import { trackApprovalEvent, trackEmailEvent, EventTimer } from '@/lib/analytics/workshopEvents'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ✅ SECURITY: Require admin authentication
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error

  const admin = authResult.data

  // Check admin auth
  const adminCheck = await ensureAdmin()
  if (!adminCheck.ok) return adminCheck.res

  const { id } = params
  const { notes } = await req.json()

  const timer = new EventTimer()

  try {
    // Get workshop details
    const { data: workshop, error: workshopError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', id)
      .eq('organization_type', 'workshop')
      .single()

    if (workshopError || !workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
    }

    // Update workshop status to rejected
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({
        status: 'rejected',
        verification_status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('[ADMIN WORKSHOPS] Error rejecting workshop:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log admin action
    await supabaseAdmin.from('admin_actions').insert({
      admin_id: adminCheck.user.id,
      action_type: 'workshop_rejected',
      target_type: 'organization',
      target_id: id,
      notes: notes || 'Workshop application rejected',
      metadata: {
        workshop_name: workshop.name,
        workshop_email: workshop.email,
      },
    })

    // Get contact name from auth user
    let contactName: string | undefined
    if (workshop.created_by) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(workshop.created_by)
      contactName = userData?.user?.user_metadata?.full_name
    }

    // Track rejection event
    await trackApprovalEvent('workshop_rejected', {
      workshopId: id,
      adminId: adminCheck.user.id,
      metadata: {
        workshopName: workshop.name,
        workshopEmail: workshop.email,
        notes,
      },
      durationMs: timer.elapsed(),
    })

    // Send rejection email to workshop
    try {
      const supportEmail = process.env.SUPPORT_EMAIL || 'support@theautodoctor.com'
      const emailTemplate = workshopRejectionEmail({
        workshopName: workshop.name,
        contactName,
        notes,
        supportEmail,
      })

      await sendEmail({
        to: workshop.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      })

      console.log(`[ADMIN WORKSHOPS] Rejection email sent to ${workshop.email}`)

      // Track successful email
      await trackEmailEvent('email_rejection_sent', {
        workshopId: id,
        metadata: {
          to: workshop.email,
          workshopName: workshop.name,
        },
      })
    } catch (emailError) {
      console.error('[ADMIN WORKSHOPS] Failed to send rejection email:', emailError)

      // Track failed email
      await trackEmailEvent('email_rejection_failed', {
        workshopId: id,
        success: false,
        errorMessage: emailError.message || 'Email send failed',
        metadata: {
          to: workshop.email,
          workshopName: workshop.name,
        },
      })
      // Don't fail the entire request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Workshop rejected successfully',
    })
  } catch (e: any) {
    console.error('[ADMIN WORKSHOPS] Error:', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
