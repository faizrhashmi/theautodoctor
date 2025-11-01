import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/credit-pricing
 * Public endpoint to fetch current credit costs for session types
 *
 * Query params:
 * - session_type: 'quick' | 'video' | 'diagnostic' (optional)
 * - is_specialist: 'true' | 'false' (optional)
 *
 * Examples:
 * - GET /api/credit-pricing → Returns all active pricing
 * - GET /api/credit-pricing?session_type=video → Returns video pricing (both specialist and non-specialist)
 * - GET /api/credit-pricing?session_type=quick&is_specialist=false → Returns quick chat standard pricing
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const sessionType = searchParams.get('session_type')
    const isSpecialistParam = searchParams.get('is_specialist')

    let query = supabase
      .from('credit_pricing')
      .select('session_type, is_specialist, credit_cost, effective_from, effective_until, notes')
      .or('effective_until.is.null,effective_until.gt.' + new Date().toISOString())
      .order('session_type', { ascending: true })
      .order('is_specialist', { ascending: false })
      .order('effective_from', { ascending: false })

    // Filter by session type if provided
    if (sessionType) {
      if (!['quick', 'video', 'diagnostic'].includes(sessionType)) {
        return NextResponse.json(
          { error: 'Invalid session_type. Must be: quick, video, or diagnostic' },
          { status: 400 }
        )
      }
      query = query.eq('session_type', sessionType)
    }

    // Filter by specialist flag if provided
    if (isSpecialistParam !== null) {
      const isSpecialist = isSpecialistParam === 'true'
      query = query.eq('is_specialist', isSpecialist)
    }

    const { data: pricing, error } = await query

    if (error) {
      console.error('[GET /api/credit-pricing] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch credit pricing' }, { status: 500 })
    }

    // Group by session_type and is_specialist for easier frontend consumption
    const grouped = (pricing || []).reduce((acc: any, item: any) => {
      const key = `${item.session_type}_${item.is_specialist ? 'specialist' : 'standard'}`
      // Only keep the most recent pricing for each combination
      if (!acc[key]) {
        acc[key] = item
      }
      return acc
    }, {})

    return NextResponse.json({
      pricing: pricing || [],
      grouped: grouped
    })
  } catch (error) {
    console.error('[GET /api/credit-pricing] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
