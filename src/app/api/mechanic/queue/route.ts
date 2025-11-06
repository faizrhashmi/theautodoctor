import { NextRequest, NextResponse } from 'next/server'
import { requireMechanicAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/mechanic/queue
 * Returns available session assignments for the mechanic
 * Shows sessions with status IN ('pending', 'waiting') and assignments IN ('queued', 'offered')
 */
export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Require mechanic authentication
    const authResult = await requireMechanicAPI(request)
    if (authResult.error) return authResult.error

    const mechanic = authResult.data
    console.log(`[Mechanic Queue] Fetching queue for mechanic ${mechanic.id}`)

    // Get mechanic's full profile for filtering
    const { data: mechanicProfile, error: profileError } = await supabaseAdmin
      .from('mechanics')
      .select('id, service_tier, workshop_id')
      .eq('id', mechanic.id)
      .single()

    if (profileError || !mechanicProfile) {
      console.error('[Mechanic Queue] Profile error:', profileError)
      return NextResponse.json(
        { error: 'Mechanic profile not found' },
        { status: 404 }
      )
    }

    // Build query based on mechanic capabilities
    let query = supabaseAdmin
      .from('session_assignments')
      .select(`
        id,
        session_id,
        mechanic_id,
        status,
        created_at,
        offered_at,
        accepted_at,
        sessions (
          id,
          type,
          status,
          plan,
          created_at,
          customer_user_id,
          intake_id
        )
      `)
      .in('status', ['queued', 'offered'])
      .order('created_at', { ascending: false })

    // Apply capability-based filtering
    if (mechanicProfile.service_tier === 'virtual_only') {
      // Virtual-only mechanics see only virtual/diagnostic/chat sessions
      console.log('[Mechanic Queue] Filtering for virtual-only mechanic')
      // We'll filter this after the query since we're joining through sessions
    } else if (mechanicProfile.workshop_id) {
      // Workshop mechanics see their workshop assignments OR general assignments
      console.log('[Mechanic Queue] Filtering for workshop mechanic:', mechanicProfile.workshop_id)
      // Filter will be applied on sessions side
    }

    const { data: assignments, error: queryError } = await query

    if (queryError) {
      console.error('[Mechanic Queue] Query error:', queryError)
      return NextResponse.json(
        { error: 'Failed to fetch queue' },
        { status: 500 }
      )
    }

    // Filter results first
    const filteredAssignments = (assignments || [])
      .filter(assignment => {
        const session = assignment.sessions as any
        if (!session) return false

        // Session must be pending or waiting
        if (!['pending', 'waiting'].includes(session.status)) return false

        // Apply service tier filtering
        if (mechanicProfile.service_tier === 'virtual_only') {
          if (!['chat', 'video', 'diagnostic'].includes(session.type)) return false
        }

        // Apply workshop filtering - workshop mechanics should see:
        // 1. Sessions assigned to their workshop (metadata.workshop_id matches)
        // 2. General sessions (metadata.workshop_id is null/undefined)
        if (mechanicProfile.workshop_id) {
          const sessionWorkshopId = session.metadata?.workshop_id

          // If session has a workshop_id, it must match the mechanic's workshop
          // If session has no workshop_id, it's a general assignment - show it
          if (sessionWorkshopId && sessionWorkshopId !== mechanicProfile.workshop_id) {
            return false // This is for a different workshop
          }
        }

        return true
      })

    // Collect all unique intake IDs
    const intakeIds = filteredAssignments
      .map(a => (a.sessions as any)?.intake_id)
      .filter(Boolean)

    // Fetch all intakes in one query
    const { data: intakes } = await supabaseAdmin
      .from('intakes')
      .select('id, name, email, concern, year, make, model, vin, urgent')
      .in('id', intakeIds)

    // Create a map of intake_id -> intake data for quick lookup
    const intakeMap = new Map(
      (intakes || []).map(intake => [intake.id, intake])
    )

    // Format results with intake data
    const formattedQueue = filteredAssignments.map(assignment => {
      const session = assignment.sessions as any
      const intake = intakeMap.get(session.intake_id)

      return {
        assignmentId: assignment.id,
        assignmentStatus: assignment.status,
        offeredAt: assignment.offered_at,
        sessionId: session.id,
        sessionType: session.type,
        sessionStatus: session.status,
        plan: session.plan,
        createdAt: session.created_at,
        customer: {
          name: intake?.name || 'Customer',
          email: intake?.email
        },
        vehicle: intake ? {
          year: intake.year,
          make: intake.make,
          model: intake.model,
          vin: intake.vin
        } : null,
        concern: intake?.concern || '',
        urgent: intake?.urgent || false
      }
    })

    console.log(`[Mechanic Queue] Found ${formattedQueue.length} available assignments`)

    return NextResponse.json({
      queue: formattedQueue,
      count: formattedQueue.length
    })

  } catch (error) {
    console.error('[Mechanic Queue] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
