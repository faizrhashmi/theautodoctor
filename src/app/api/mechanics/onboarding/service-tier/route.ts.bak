import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { ServiceTier } from '@/types/mechanic'

/**
 * GET /api/mechanics/onboarding/service-tier
 *
 * Get mechanic's current service tier selection
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Get mechanic service tier
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, service_tier, partnership_type, can_perform_physical_work, workshop_id')
      .eq('id', session.mechanic_id)
      .single()

    if (mechanicError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    return NextResponse.json({
      service_tier: mechanic.service_tier,
      partnership_type: mechanic.partnership_type,
      can_perform_physical_work: mechanic.can_perform_physical_work,
      has_workshop: !!mechanic.workshop_id
    })

  } catch (error) {
    console.error('[SERVICE TIER API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/mechanics/onboarding/service-tier
 *
 * Set mechanic's service tier during onboarding
 *
 * Body:
 * {
 *   service_tier: 'virtual_only' | 'workshop_partner'
 * }
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get('aad_mech')?.value

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Validate session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    // Parse request body
    const body = await req.json()
    const { service_tier } = body as { service_tier: ServiceTier }

    // Validate service_tier
    if (!service_tier || !['virtual_only', 'workshop_partner', 'licensed_mobile'].includes(service_tier)) {
      return NextResponse.json({
        error: 'Invalid service_tier. Must be one of: virtual_only, workshop_partner, licensed_mobile'
      }, { status: 400 })
    }

    // licensed_mobile not available yet (Phase 7)
    if (service_tier === 'licensed_mobile') {
      return NextResponse.json({
        error: 'Licensed mobile service tier coming in Phase 7. Please select virtual_only or workshop_partner.'
      }, { status: 400 })
    }

    // Get current mechanic data
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, service_tier, workshop_id')
      .eq('id', session.mechanic_id)
      .single()

    if (mechanicError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    // Update mechanic service tier
    const updates: Record<string, any> = {
      service_tier: service_tier,
      updated_at: new Date().toISOString()
    }

    if (service_tier === 'virtual_only') {
      // Virtual-only mechanics
      updates.partnership_type = 'none'
      updates.can_perform_physical_work = false
      updates.prefers_virtual = true
      updates.prefers_physical = false

    } else if (service_tier === 'workshop_partner') {
      // Workshop partner - need workshop affiliation
      // If they already have a workshop_id, set them as employee
      if (mechanic.workshop_id) {
        updates.partnership_type = 'employee'
        updates.can_perform_physical_work = true
        updates.prefers_physical = true
      } else {
        // No workshop yet - they need to find a partner
        updates.partnership_type = 'none'
        updates.can_perform_physical_work = false
        updates.prefers_physical = true
        // Note: can_perform_physical_work will be set to true once partnership is approved
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('mechanics')
      .update(updates)
      .eq('id', session.mechanic_id)

    if (updateError) {
      console.error('[SERVICE TIER API] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update service tier' }, { status: 500 })
    }

    // Return next steps
    let next_step = ''
    let redirect_url = ''

    if (service_tier === 'virtual_only') {
      next_step = 'complete_profile'
      redirect_url = '/mechanics/onboarding/virtual-only'
    } else if (service_tier === 'workshop_partner') {
      if (mechanic.workshop_id) {
        next_step = 'complete_profile'
        redirect_url = '/mechanics/onboarding/workshop-partner'
      } else {
        next_step = 'find_workshop'
        redirect_url = '/mechanics/partnerships/browse'
      }
    }

    return NextResponse.json({
      success: true,
      service_tier: service_tier,
      next_step: next_step,
      redirect_url: redirect_url,
      message: service_tier === 'virtual_only'
        ? 'Virtual-only tier selected. You can start offering consultations immediately after profile completion!'
        : mechanic.workshop_id
          ? 'Workshop partner tier selected. Complete your profile to get started!'
          : 'Workshop partner tier selected. Find a workshop partner to start offering physical repairs!'
    })

  } catch (error) {
    console.error('[SERVICE TIER API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
