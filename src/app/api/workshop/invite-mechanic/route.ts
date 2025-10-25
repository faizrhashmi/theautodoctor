// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/email/emailService'
import { mechanicInviteEmail } from '@/lib/email/workshopTemplates'
import { trackInvitationEvent, trackEmailEvent, EventTimer } from '@/lib/analytics/workshopEvents'

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured', 500)

  const timer = new EventTimer()

  try {
    // Get authenticated user
    const supabase = getSupabaseServer()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('[WORKSHOP INVITE] Unauthorized access attempt')
      return bad('Unauthorized', 401)
    }

    const body = await req.json()
    const { organizationId, inviteEmail, role = 'member' } = body

    console.log('[WORKSHOP INVITE] Generating invite for:', inviteEmail, 'to org:', organizationId, 'by user:', user.id)

    // Validate required fields
    if (!organizationId || !inviteEmail) {
      return bad('Organization ID and email are required')
    }

    // Verify organization exists and is a workshop
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, organization_type, name, status')
      .eq('id', organizationId)
      .single()

    if (orgError || !org) {
      return bad('Organization not found', 404)
    }

    if (org.organization_type !== 'workshop') {
      return bad('Only workshops can invite mechanics', 403)
    }

    if (org.status !== 'active') {
      return bad('Workshop must be active to invite mechanics', 403)
    }

    // Verify inviter is owner or admin of the organization
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return bad('Only workshop owners and admins can invite mechanics', 403)
    }

    // Check if email already has a pending invite
    const { data: existingInvite } = await supabaseAdmin
      .from('organization_members')
      .select('id, status, invite_code')
      .eq('organization_id', organizationId)
      .eq('invite_email', inviteEmail)
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      // Return existing invite code
      return NextResponse.json({
        success: true,
        inviteCode: existingInvite.invite_code,
        inviteUrl: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/mechanic/signup/${existingInvite.invite_code}`,
        message: 'Invitation already exists for this email',
      })
    }

    // Create new invitation
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        invite_email: inviteEmail,
        role: role,
        status: 'pending',
        invited_by: user.id,
        invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select('invite_code')
      .single()

    if (inviteError) {
      console.error('[WORKSHOP INVITE] Error creating invite:', inviteError)
      return bad(inviteError.message, 500)
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/mechanic/signup/${invite.invite_code}`

    console.log('[WORKSHOP INVITE] Created invite:', invite.invite_code)

    // Track invitation created event
    await trackInvitationEvent('mechanic_invited', {
      workshopId: organizationId,
      userId: user.id,
      metadata: {
        inviteEmail,
        inviteCode: invite.invite_code,
        workshopName: org.name,
        role,
      },
      durationMs: timer.elapsed(),
    })

    // Send invitation email to mechanic
    try {
      const emailTemplate = mechanicInviteEmail({
        mechanicEmail: inviteEmail,
        workshopName: org.name,
        inviteCode: invite.invite_code,
        signupUrl: inviteUrl,
        expiresInDays: 7,
      })

      await sendEmail({
        to: inviteEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      })

      console.log(`[WORKSHOP INVITE] Invitation email sent to ${inviteEmail}`)

      // Track successful email
      await trackEmailEvent('email_invite_sent', {
        workshopId: organizationId,
        metadata: {
          to: inviteEmail,
          workshopName: org.name,
          inviteCode: invite.invite_code,
        },
      })
    } catch (emailError) {
      console.error('[WORKSHOP INVITE] Failed to send invitation email:', emailError)

      // Track failed email
      await trackEmailEvent('email_invite_failed', {
        workshopId: organizationId,
        success: false,
        errorMessage: emailError.message || 'Email send failed',
        metadata: {
          to: inviteEmail,
          workshopName: org.name,
        },
      })
      // Don't fail the entire request if email fails
    }

    return NextResponse.json({
      success: true,
      inviteCode: invite.invite_code,
      inviteUrl,
      message: 'Invitation created successfully',
    })
  } catch (e: any) {
    console.error('[WORKSHOP INVITE] Error:', e)
    return bad(e.message || 'Failed to create invitation', 500)
  }
}

// GET: Retrieve invite details by code
export async function GET(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured', 500)

  try {
    const { searchParams } = new URL(req.url)
    const inviteCode = searchParams.get('code')

    if (!inviteCode) {
      return bad('Invite code is required', 400)
    }

    // Get invite details
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('organization_members')
      .select(`
        id,
        invite_code,
        invite_email,
        role,
        status,
        invite_expires_at,
        organization_id,
        organizations (
          id,
          name,
          city,
          province,
          logo_url
        )
      `)
      .eq('invite_code', inviteCode)
      .single()

    if (inviteError || !invite) {
      return bad('Invalid or expired invitation', 404)
    }

    // Check if invite has expired
    if (new Date(invite.invite_expires_at) < new Date()) {
      return bad('Invitation has expired', 410)
    }

    // Check if already accepted
    if (invite.status !== 'pending') {
      return bad('Invitation already accepted', 409)
    }

    // Track invite viewed event
    await trackInvitationEvent('mechanic_invite_viewed', {
      workshopId: invite.organization_id,
      metadata: {
        inviteCode,
        inviteEmail: invite.invite_email,
        workshopName: invite.organizations?.name,
      },
    })

    return NextResponse.json({
      success: true,
      invite: {
        email: invite.invite_email,
        role: invite.role,
        expiresAt: invite.invite_expires_at,
        workshop: invite.organizations,
      },
    })
  } catch (e: any) {
    console.error('[WORKSHOP INVITE] Error fetching invite:', e)
    return bad(e.message || 'Failed to fetch invitation', 500)
  }
}
