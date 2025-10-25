// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { hashPassword, makeSessionToken } from '@/lib/auth'

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured on server', 500)

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

    // Hash password
    const password_hash = hashPassword(password)

    // Create mechanic record
    const { data: mech, error: mechError } = await supabaseAdmin
      .from('mechanics')
      .insert({
        // Basic info
        name,
        email,
        phone,
        password_hash,
        date_of_birth: dateOfBirth,

        // Account type tracking (for B2B2C)
        account_type: 'workshop_mechanic',
        source: 'workshop_invitation',
        workshop_id: invite.organization_id,
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
      if (mechError.code === '23505') {
        return bad('Email already registered', 409)
      }
      return bad(mechError.message, 500)
    }

    console.log('[WORKSHOP MECHANIC SIGNUP] Created mechanic:', mech.id)

    // Update organization_members invitation status
    const { error: updateInviteError } = await supabaseAdmin
      .from('organization_members')
      .update({
        status: 'active',
        joined_at: new Date().toISOString(),
        user_id: null, // We'll set this when we create auth user (not done yet in this flow)
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

    // Create session for the mechanic
    const token = makeSessionToken()
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days
    const { error: sErr } = await supabaseAdmin.from('mechanic_sessions').insert({
      mechanic_id: mech.id,
      token,
      expires_at: expires.toISOString(),
    })

    if (sErr) {
      console.error('[WORKSHOP MECHANIC SIGNUP] Session creation error:', sErr)
      return bad(sErr.message, 500)
    }

    const res = NextResponse.json({
      ok: true,
      message: `Welcome to ${invite.organizations.name}! Your account has been approved and is ready to use.`,
      mechanicId: mech.id,
      workshopName: invite.organizations.name,
    })

    res.cookies.set('aad_mech', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })

    console.log('[WORKSHOP MECHANIC SIGNUP] Success! Workshop mechanic created:', mech.id)

    // TODO: Send welcome email to mechanic
    // TODO: Notify workshop admin that mechanic joined

    return res
  } catch (e: any) {
    console.error('[WORKSHOP MECHANIC SIGNUP] Error:', e)
    return bad(e.message || 'Signup failed', 500)
  }
}
