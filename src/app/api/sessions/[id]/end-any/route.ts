import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * DEPRECATED: POST /api/sessions/[id]/end-any
 *
 * This endpoint is deprecated and has been replaced with /api/sessions/[id]/end
 * which uses proper semantic logic to determine session status.
 *
 * This endpoint always marked sessions as "completed" without considering:
 * - Whether the session actually started
 * - Minimum billable duration
 * - Payment processing rules
 *
 * Please use /api/sessions/[id]/end instead.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

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
