import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { requireWorkshopAPI } from '@/lib/auth/guards'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * GET /api/workshop/diagnostics
 *
 * List all diagnostic sessions for the authenticated workshop
 */
export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require workshop authentication
    const authResult = await requireWorkshopAPI(req)
    if (authResult.error) return authResult.error

    const workshop = authResult.data
    console.log(`[WORKSHOP] ${workshop.organizationName} (${workshop.email}) listing diagnostics`)

    // Create Supabase client with cookie handling for querying
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    // Get query params
    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('diagnostic_sessions')
      .select(
        `
        id,
        customer_id,
        mechanic_id,
        workshop_id,
        session_type,
        status,
        base_price,
        total_price,
        vehicle_info,
        issue_description,
        scheduled_at,
        created_at,
        diagnosis_summary,
        urgency,
        service_type,
        profiles!diagnostic_sessions_customer_id_fkey (
          id,
          full_name
        ),
        mechanics (
          id,
          name,
          email
        )
      `
      )
      .eq('workshop_id', workshop.organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by status if specified
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: sessions, error: sessionsError } = await query

    if (sessionsError) {
      console.error('[WORKSHOP DIAGNOSTICS] Error fetching sessions:', sessionsError)
      return NextResponse.json(
        { error: 'Failed to fetch diagnostic sessions' },
        { status: 500 }
      )
    }

    // Format sessions
    // 🔒 PRIVACY: Never expose customer contact info to workshops
    const formattedSessions = (sessions || []).map((session: any) => ({
      id: session.id,
      customer_id: session.customer_id,
      customer_name: session.profiles?.full_name || 'Unknown Customer',
      // ✅ REMOVED: customer_email, customer_phone (marketplace privacy protection)
      mechanic_id: session.mechanic_id,
      mechanic_name: session.mechanics?.name,
      mechanic_email: session.mechanics?.email,
      session_type: session.session_type,
      status: session.status,
      base_price: session.base_price,
      total_price: session.total_price,
      vehicle_info: session.vehicle_info,
      issue_description: session.issue_description,
      scheduled_at: session.scheduled_at,
      created_at: session.created_at,
      diagnosis_summary: session.diagnosis_summary,
      urgency: session.urgency,
      service_type: session.service_type,
    }))

    return NextResponse.json({
      ok: true,
      sessions: formattedSessions,
      workshop: {
        id: workshop.organizationId,
        name: workshop.organizationName,
      },
    })
  } catch (error: any) {
    console.error('[WORKSHOP DIAGNOSTICS] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch diagnostic sessions' },
      { status: 500 }
    )
  }
}
