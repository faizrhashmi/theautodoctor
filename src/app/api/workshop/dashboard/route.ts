import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { trackActivityEvent, EventTimer } from '@/lib/analytics/workshopEvents'
import { requireWorkshopAPI } from '@/lib/auth/guards'

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured', 500)

  const timer = new EventTimer()

  try {
    // ✅ SECURITY: Require workshop authentication
    const authResult = await requireWorkshopAPI(req)
    if (authResult.error) return authResult.error

    const workshop = authResult.data
    console.log(`[WORKSHOP] ${workshop.organizationName} (${workshop.email}) accessing dashboard`)

    // Only owners and admins can access dashboard
    if (!['owner', 'admin'].includes(workshop.role)) {
      return bad('Insufficient permissions to access dashboard', 403)
    }

    // Get full organization details
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select(`
        id,
        organization_type,
        name,
        slug,
        email,
        phone,
        address,
        city,
        province,
        postal_code,
        coverage_postal_codes,
        service_radius_km,
        mechanic_capacity,
        commission_rate,
        status,
        verification_status,
        stripe_account_id,
        stripe_account_status,
        logo_url,
        website,
        industry
      `)
      .eq('id', workshop.organizationId)
      .single()

    if (orgError || !organization) {
      console.error('[WORKSHOP DASHBOARD] Failed to get organization details:', orgError)
      return bad('Failed to load workshop details', 500)
    }

    console.log('[WORKSHOP DASHBOARD] Fetching data for organization:', organization.id)

    // Fetch mechanics belonging to this workshop
    const { data: mechanics, error: mechanicsError } = await supabaseAdmin
      .from('mechanics')
      .select(`
        id,
        name,
        email,
        phone,
        years_of_experience,
        specializations,
        red_seal_certified,
        red_seal_number,
        red_seal_province,
        application_status,
        created_at,
        date_of_birth,
        account_type
      `)
      .eq('workshop_id', organization.id)
      .order('created_at', { ascending: false })

    if (mechanicsError) {
      console.error('[WORKSHOP DASHBOARD] Error fetching mechanics:', mechanicsError)
    }

    // Fetch pending invitations
    const { data: pendingInvites, error: invitesError } = await supabaseAdmin
      .from('organization_members')
      .select(`
        id,
        invite_code,
        invite_email,
        invited_at,
        invite_expires_at,
        status
      `)
      .eq('organization_id', organization.id)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false })

    if (invitesError) {
      console.error('[WORKSHOP DASHBOARD] Error fetching invites:', invitesError)
    }

    // Calculate statistics
    const totalMechanics = mechanics?.length || 0
    const activeMechanics =
      mechanics?.filter((m) => m.application_status === 'approved').length || 0
    const pendingInvitesCount = pendingInvites?.length || 0

    // Fetch session statistics (if sessions table exists)
    // For now, we'll use placeholder values
    // TODO: Implement session tracking and revenue calculation
    const totalSessions = 0
    const totalRevenue = 0
    const workshopRevenue = 0

    // Alternatively, query sessions if table exists:
    /*
    const { data: sessions } = await supabaseAdmin
      .from('sessions')
      .select('id, total_amount, workshop_commission')
      .eq('workshop_id', organization.id)
      .eq('status', 'completed')

    const totalSessions = sessions?.length || 0
    const totalRevenue = sessions?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0
    const workshopRevenue = sessions?.reduce((sum, s) => sum + (s.workshop_commission || 0), 0) || 0
    */

    const responseData = {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        email: organization.email,
        phone: organization.phone,
        address: organization.address,
        city: organization.city,
        province: organization.province,
        postal_code: organization.postal_code,
        coverage_postal_codes: organization.coverage_postal_codes || [],
        service_radius_km: organization.service_radius_km,
        mechanic_capacity: organization.mechanic_capacity,
        commission_rate: organization.commission_rate,
        status: organization.status,
        verification_status: organization.verification_status,
        stripe_account_id: organization.stripe_account_id,
        stripe_account_status: organization.stripe_account_status,
        logo_url: organization.logo_url,
        website: organization.website,
        industry: organization.industry,
      },
      mechanics: mechanics || [],
      pendingInvites: pendingInvites || [],
      stats: {
        totalMechanics,
        activeMechanics,
        pendingInvites: pendingInvitesCount,
        totalSessions,
        totalRevenue,
        workshopRevenue,
      },
      userRole: workshop.role,
    }

    console.log('[WORKSHOP DASHBOARD] Successfully fetched dashboard data')

    // Track dashboard access
    await trackActivityEvent('workshop_dashboard_accessed', {
      workshopId: organization.id,
      userId: workshop.userId,
      metadata: {
        workshopName: organization.name,
        userRole: workshop.role,
        totalMechanics,
        activeMechanics,
        pendingInvites: pendingInvitesCount,
      },
      durationMs: timer.elapsed(),
    })

    // Track special milestones
    if (totalMechanics === 1 && mechanics?.length === 1) {
      // First mechanic joined milestone
      await trackActivityEvent('workshop_first_mechanic', {
        workshopId: organization.id,
        userId: workshop.userId,
        metadata: {
          workshopName: organization.name,
          mechanicName: mechanics[0].name,
        },
      })
    }

    if (totalMechanics >= organization.mechanic_capacity) {
      // Capacity reached milestone
      await trackActivityEvent('workshop_capacity_reached', {
        workshopId: organization.id,
        userId: workshop.userId,
        metadata: {
          workshopName: organization.name,
          capacity: organization.mechanic_capacity,
          totalMechanics,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (e: any) {
    console.error('[WORKSHOP DASHBOARD] Error:', e)
    return bad(e.message || 'Failed to load dashboard', 500)
  }
}
