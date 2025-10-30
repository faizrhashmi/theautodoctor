import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireWorkshopAPI } from '@/lib/auth/guards'

/**
 * GET /api/workshop/quotes
 *
 * Fetch all repair quotes for a workshop
 *
 * Query params:
 * - status: Filter by status (pending, approved, declined, etc.)
 */
export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require workshop authentication
    const authResult = await requireWorkshopAPI(req)
    if (authResult.error) return authResult.error

    const workshop = authResult.data
    console.log(`[WORKSHOP] ${workshop.organizationName} (${workshop.email}) listing quotes`)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    // Build the query
    let query = supabaseAdmin
      .from('repair_quotes')
      .select(`
        *,
        customer:profiles!customer_id (
          id,
          full_name,
          email,
          phone
        ),
        diagnostic_session:diagnostic_sessions!diagnostic_session_id (
          id,
          issue_description,
          vehicle_info,
          status
        )
      `)
      .eq('workshop_id', workshop.organizationId)
      .order('created_at', { ascending: false })

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: quotes, error: quotesError } = await query

    if (quotesError) {
      console.error('Error fetching quotes:', quotesError)
      return NextResponse.json(
        { error: 'Failed to fetch quotes' },
        { status: 500 }
      )
    }

    // Calculate summary statistics
    const stats = {
      total: quotes?.length || 0,
      pending: quotes?.filter(q => q.status === 'pending').length || 0,
      approved: quotes?.filter(q => q.status === 'approved').length || 0,
      declined: quotes?.filter(q => q.status === 'declined').length || 0,
      totalValue: quotes?.reduce((sum, q) => sum + parseFloat(q.customer_total || 0), 0) || 0,
      pendingValue: quotes?.filter(q => q.status === 'pending').reduce((sum, q) => sum + parseFloat(q.customer_total || 0), 0) || 0
    }

    return NextResponse.json({
      success: true,
      quotes: quotes || [],
      stats
    })

  } catch (error: any) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quotes' },
      { status: 500 }
    )
  }
}
