/**
 * GET /api/mechanics/[mechanicId]/profile-completion
 * Returns profile completion score and details for a mechanic
 */

import { NextRequest, NextResponse } from 'next/server'
import { getProfileCompletion } from '@/lib/profileCompletion'

type RouteContext = {
  params: Promise<{
    mechanicId: string
  }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { mechanicId } = await context.params

    if (!mechanicId) {
      return NextResponse.json(
        { error: 'Mechanic ID is required' },
        { status: 400 }
      )
    }

    // Get profile completion (will recalculate if stale)
    const completion = await getProfileCompletion(mechanicId, false)

    return NextResponse.json(completion)
  } catch (error: any) {
    console.error('[Profile Completion API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate profile completion' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/mechanics/[mechanicId]/profile-completion/refresh
 * Force recalculates profile completion
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { mechanicId } = await context.params

    if (!mechanicId) {
      return NextResponse.json(
        { error: 'Mechanic ID is required' },
        { status: 400 }
      )
    }

    // Force recalculation
    const completion = await getProfileCompletion(mechanicId, true)

    return NextResponse.json({
      ...completion,
      refreshed: true
    })
  } catch (error: any) {
    console.error('[Profile Completion Refresh API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to refresh profile completion' },
      { status: 500 }
    )
  }
}
