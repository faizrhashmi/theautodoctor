// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { trackInvitationEvent, EventTimer } from '@/lib/analytics/workshopEvents'

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

// CLEANED UP: Removed old auth imports (hashPassword, makeSessionToken)
// Now using Supabase Auth for unified authentication system

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured on server', 500)

  const timer = new EventTimer()

  try {
    const body = await req.json()
    const {
      inviteCode,
      name,
      email,
      phone,
      password,
      dateOfBirth,
      yearsOfExperience,
      specializations,
      redSealCertified,
      redSealNumber,
      redSealProvince,
    } = body

    console.log('[WORKSHOP MECHANIC SIGNUP] New signup from:', email, 'with invite:', inviteCode)

    // Validate required fields
    if (!inviteCode || !name || !email || !password) {
      return bad('Invite code, name, email, and password are required')
    }

    if (!yearsOfExperience || !specializations || specializations.length === 0) {
      return bad('Experience and specializations are required')
    }

    // Fetch and validate invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('organization_members')
      .select(`
        id,
        invite_code,
        invite_email,
        status,
        invite_expires_at,
        organization_id,
        organizations (
          id,
          name,
          organization_type,
          status
        )
      `)
      .eq('invite_code', inviteCode)
      .single()

    if (inviteError || !invite) {
      console.error('[WORKSHOP MECHANIC SIGNUP] Invalid invite code:', inviteCode)
      return bad('Invalid or expired invitation', 404)
    }

    // Validate invite
    if (invite.status !== 'pending') {
      return bad('Invitation already accepted', 409)
    }

    if (new Date(invite.invite_expires_at) < new Date()) {
      return bad('Invitation has expired', 410)
    }

    if (!invite.organizations || invite.organizations.organization_type !== 'workshop') {
      return bad('Invalid workshop invitation', 400)
    }

    if (invite.organizations.status !== 'active') {
      return bad('Workshop is not active', 403)
    }

    // Check if email matches invite (if invite email was specified)
    if (invite.invite_email && invite.invite_email !== email) {
      return bad('Email does not match invitation', 403)
    }

    // CLEANED UP: Create Supabase Auth user first (unified auth system)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm workshop mechanics
      user_metadata: {
        full_name: name,
        phone,
        role: 'mechanic',
        account_type: 'workshop',
        workshop_id: invite.organization_id,
      },
    })

    if (authError) {
      console.error('[WORKSHOP MECHANIC SIGNUP] Auth error:', authError)
      if (authError.message?.includes('already registered')) {
        return bad('Email already registered', 409)
      }
      return bad(authError.message || 'Failed to create account', 500)
    }

    if (!authData.user) {
      return bad('Failed to create user', 500)
    }

    console.log('[WORKSHOP MECHANIC SIGNUP] Created auth user:', authData.user.id)

    // Create mechanic record (linked to Supabase Auth user)
    const { data: mech, error: mechError } = await supabaseAdmin
      .from('mechanics')
      .insert({
        // Basic info
        name,
        email,
        phone,
        user_id: authData.user.id, // Link to Supabase Auth
        date_of_birth: dateOfBirth,

        // Account type tracking (for B2B2C)
        account_type: 'workshop', // Use 'workshop' to match migration
        source: 'workshop_invitation',
        workshop_id: invite.organization_id,
        invited_by: invite.organization_id, // Track who invited
        invite_accepted_at: new Date().toISOString(), // Track acceptance time
        requires_sin_collection: false, // Workshop mechanics are EXEMPT from SIN collection
        sin_encrypted: null, // No SIN required
        sin_collection_completed_at: null,
        auto_approved: true, // Auto-approve workshop mechanics

        // Credentials
        years_of_experience: parseInt(yearsOfExperience) || 0,
        specializations,
        red_seal_certified: redSealCertified || false,
        red_seal_number: redSealNumber || null,
        red_seal_province: redSealProvince || null,

        // Simplified signup - no shop info, insurance, or documents required
        shop_affiliation: null,
        shop_name: invite.organizations.name, // Link to workshop name
        shop_address: null,
        business_license_number: null,
        liability_insurance: false, // Workshop provides insurance
        insurance_policy_number: null,
        insurance_expiry: null,
        criminal_record_check: false, // Workshop handles background checks
        certification_documents: [],
        business_license_document: null,
        insurance_document: null,
        crc_document: null,

        // Application status - AUTO-APPROVED
        application_status: 'approved',
        background_check_status: 'pending', // Workshop to complete
        application_submitted_at: new Date().toISOString(),
        approval_date: new Date().toISOString(),
        current_step: 2, // Completed simplified signup
      })
      .select('id, email')
      .single()

    if (mechError) {
      console.error('[WORKSHOP MECHANIC SIGNUP] Database error:', mechError)
      // Cleanup: delete the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      if (mechError.code === '23505') {
        return bad('Email already registered', 409)
      }
      return bad(mechError.message, 500)
    }

    console.log('[WORKSHOP MECHANIC SIGNUP] Created mechanic:', mech.id)

    // Create profile record
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: name,
        phone,
        role: 'mechanic',
        email,
        account_type: 'workshop',
        organization_id: invite.organization_id,
        source: 'workshop_invitation',
      })

    if (profileError) {
      console.error('[WORKSHOP MECHANIC SIGNUP] Profile creation error:', profileError)
      // Don't fail - profile might be created by trigger
    }

    // Track invitation accepted event
    await trackInvitationEvent('mechanic_invite_accepted', {
      workshopId: invite.organization_id,
      mechanicId: mech.id,
      metadata: {
        mechanicName: name,
        mechanicEmail: email,
        workshopName: invite.organizations.name,
        inviteCode,
        autoApproved: true,
      },
      durationMs: timer.elapsed(),
    })

    // Update organization_members invitation status
    const { error: updateInviteError } = await supabaseAdmin
      .from('organization_members')
      .update({
        status: 'active',
        joined_at: new Date().toISOString(),
        user_id: authData.user.id, // Link to Supabase Auth user
      })
      .eq('id', invite.id)

    if (updateInviteError) {
      console.error('[WORKSHOP MECHANIC SIGNUP] Failed to update invite:', updateInviteError)
      // Don't fail the whole signup - can be fixed manually
    }

    // Create admin action record
    await supabaseAdmin.from('mechanic_admin_actions').insert({
      mechanic_id: mech.id,
      admin_id: 'system',
      action_type: 'auto_approved',
      notes: `Auto-approved workshop mechanic invited by organization ${invite.organization_id}`,
      metadata: {
        email,
        workshop_name: invite.organizations.name,
        workshop_id: invite.organization_id,
        invite_code: inviteCode,
        submitted_at: new Date().toISOString(),
      },
    })

    // CLEANED UP: Removed old session creation (mechanic_sessions table and aad_mech cookie)
    // Supabase Auth handles sessions automatically via HTTP-only cookies

    console.log('[WORKSHOP MECHANIC SIGNUP] Success! Workshop mechanic created:', mech.id)

    // TODO: Send welcome email to mechanic
    // TODO: Notify workshop admin that mechanic joined

    return NextResponse.json({
      ok: true,
      message: `Welcome to ${invite.organizations.name}! Your account has been approved and is ready to use.`,
      mechanicId: mech.id,
      userId: authData.user.id,
      workshopName: invite.organizations.name,
    })
  } catch (e: any) {
    console.error('[WORKSHOP MECHANIC SIGNUP] Error:', e)
    return bad(e.message || 'Signup failed', 500)
  }
}
