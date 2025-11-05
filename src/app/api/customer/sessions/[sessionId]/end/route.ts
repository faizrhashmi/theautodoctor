import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * DEPRECATED: POST /api/customer/sessions/:sessionId/end
 *
 * This endpoint is deprecated and has been replaced with /api/sessions/[id]/end
 * which uses proper semantic logic to determine session status.
 *
 * This endpoint had inconsistent logic:
 * - Used 'ended' status instead of 'completed'
 * - No payment processing
 * - No minimum billable duration check
 * - Incomplete session state management
 *
 * Please use /api/sessions/[id]/end instead.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId

  return NextResponse.json(
    {
      error: 'This endpoint is deprecated',
      message: 'Please use /api/sessions/[id]/end instead',
      redirect_to: `/api/sessions/${sessionId}/end`,
      deprecated_at: '2025-11-05',
      reason: 'Replaced with semantic session ending logic'
    },
    { status: 410 }
  )
}
