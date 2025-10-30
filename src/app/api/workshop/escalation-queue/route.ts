import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireWorkshopAPI } from '@/lib/auth/guards'

/**
 * GET /api/workshop/escalation-queue
 *
 * Get escalated diagnostic sessions assigned to the workshop
 *
 * Query params:
 * - status: Filter by status (pending, accepted, in_progress, quote_sent, declined)
 * - priority: Filter by priority (low, normal, high, urgent)
 */
export async function GET(req: NextRequest) {
  // ✅ SECURITY: Require workshop authentication
  const authResult = await requireWorkshopAPI(req)
  if (authResult.error) return authResult.error

  const workshop = authResult.data
  console.log(`[WORKSHOP] ${workshop.organizationName} (${workshop.email}) accessing escalation queue`)

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {

    // Get query parameters
    const status = req.nextUrl.searchParams.get('status')
    const priority = req.nextUrl.searchParams.get('priority')

    // Build query
    let query = supabaseAdmin
      .from('workshop_escalation_queue')
      .select(`
        id,
        diagnostic_session_id,
        customer_id,
        escalating_mechanic_id,
        assigned_workshop_id,
        status,
        priority,
        auto_assigned,
        assignment_method,
        assigned_to_advisor_id,
        assigned_at,
        accepted_at,
        vehicle_info,
        issue_summary,
        urgency,
        diagnosis_summary,
        recommended_services,
        diagnostic_photos,
        mechanic_notes,
        quote_created_at,
        quote_id,
        referral_fee_percent,
        created_at,
        updated_at,
        customer:profiles!workshop_escalation_queue_customer_id_fkey (
          id,
          full_name,
          email,
          city
        ),
        escalating_mechanic:mechanics!workshop_escalation_queue_escalating_mechanic_id_fkey (
          id,
          name,
          email
        ),
        assigned_advisor:mechanics!workshop_escalation_queue_assigned_to_advisor_id_fkey (
          id,
          name
        ),
        quote:repair_quotes (
          id,
          customer_total,
          status
        )
      `)
      .eq('assigned_workshop_id', workshop.organizationId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    const { data: escalations, error: escalationsError } = await query

    if (escalationsError) {
      console.error('[WORKSHOP QUEUE] Error fetching escalations:', escalationsError)
      return NextResponse.json({
        error: 'Failed to fetch escalation queue'
      }, { status: 500 })
    }

    // Get counts by status
    const { data: statusCounts } = await supabaseAdmin
      .from('workshop_escalation_queue')
      .select('status')
      .eq('assigned_workshop_id', workshop.organizationId)

    const counts = {
      pending: 0,
      accepted: 0,
      in_progress: 0,
      quote_sent: 0,
      declined: 0,
      total: statusCounts?.length || 0
    }

    statusCounts?.forEach((item: any) => {
      if (item.status in counts) {
        counts[item.status as keyof typeof counts]++
      }
    })

    return NextResponse.json({
      escalations: escalations || [],
      counts: counts,
      workshop_id: workshop.organizationId
    })

  } catch (error) {
    console.error('[WORKSHOP QUEUE] Error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/workshop/escalation-queue
 *
 * Update escalation status (accept, assign to advisor, etc.)
 *
 * Body:
 * {
 *   escalation_id: string
 *   action: 'accept' | 'assign_advisor' | 'decline'
 *   advisor_id?: string (required for assign_advisor)
 *   declined_reason?: string (required for decline)
 * }
 */
export async function PATCH(req: NextRequest) {
  // ✅ SECURITY: Require workshop authentication
  const authResult = await requireWorkshopAPI(req)
  if (authResult.error) return authResult.error

  const workshop = authResult.data
  console.log(`[WORKSHOP] ${workshop.organizationName} (${workshop.email}) updating escalation`)

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {

    // Parse request body
    const body = await req.json()
    const { escalation_id, action, advisor_id, declined_reason } = body

    if (!escalation_id || !action) {
      return NextResponse.json({
        error: 'escalation_id and action are required'
      }, { status: 400 })
    }

    // Get escalation
    const { data: escalation, error: escalationError } = await supabaseAdmin
      .from('workshop_escalation_queue')
      .select('id, assigned_workshop_id, status')
      .eq('id', escalation_id)
      .single()

    if (escalationError || !escalation) {
      return NextResponse.json({
        error: 'Escalation not found'
      }, { status: 404 })
    }

    // Verify escalation belongs to this workshop
    if (escalation.assigned_workshop_id !== workshop.organizationId) {
      return NextResponse.json({
        error: 'Not authorized to modify this escalation'
      }, { status: 403 })
    }

    // Handle action
    let updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    switch (action) {
      case 'accept':
        if (escalation.status !== 'pending') {
          return NextResponse.json({
            error: 'Can only accept pending escalations'
          }, { status: 400 })
        }
        updates.status = 'accepted'
        updates.accepted_at = new Date().toISOString()
        break

      case 'assign_advisor':
        if (!advisor_id) {
          return NextResponse.json({
            error: 'advisor_id is required for assign_advisor action'
          }, { status: 400 })
        }
        updates.assigned_to_advisor_id = advisor_id
        updates.assigned_at = new Date().toISOString()
        if (escalation.status === 'pending') {
          updates.status = 'accepted'
          updates.accepted_at = new Date().toISOString()
        }
        break

      case 'decline':
        if (!declined_reason) {
          return NextResponse.json({
            error: 'declined_reason is required for decline action'
          }, { status: 400 })
        }
        updates.status = 'declined'
        updates.declined_reason = declined_reason
        updates.declined_at = new Date().toISOString()
        break

      default:
        return NextResponse.json({
          error: 'Invalid action. Must be one of: accept, assign_advisor, decline'
        }, { status: 400 })
    }

    // Update escalation
    const { error: updateError } = await supabaseAdmin
      .from('workshop_escalation_queue')
      .update(updates)
      .eq('id', escalation_id)

    if (updateError) {
      console.error('[WORKSHOP QUEUE] Update error:', updateError)
      return NextResponse.json({
        error: 'Failed to update escalation'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Escalation ${action}ed successfully`
    })

  } catch (error) {
    console.error('[WORKSHOP QUEUE PATCH] Error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
