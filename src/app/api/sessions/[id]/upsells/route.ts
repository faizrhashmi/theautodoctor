import { NextRequest, NextResponse } from 'next/server'
import { requireSessionParticipantRelaxed } from '@/lib/auth/relaxedSessionAuth'
import { getSessionUpsells, trackInteraction } from '@/lib/crm'

/**
 * GET /api/sessions/:id/upsells
 * Fetches upsell recommendations for a session
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  // Validate session participant FIRST
  const authResult = await requireSessionParticipantRelaxed(req, sessionId)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[GET /sessions/${sessionId}/upsells] ${participant.role} fetching upsells for session ${participant.sessionId}`)

  // Only customers can view upsells (business rule)
  if (participant.role !== 'customer') {
    return NextResponse.json({ error: 'Only customers can view upsells' }, { status: 403 })
  }

  try {
    // Fetch upsells for the session
    const upsellsResult = await getSessionUpsells(sessionId)

    if (!upsellsResult.success) {
      return NextResponse.json(
        { error: upsellsResult.error || 'Failed to fetch upsells' },
        { status: 500 }
      )
    }

    const upsells = upsellsResult.data || []

    // Track that upsells were shown (for newly created ones that haven't been shown yet)
    const newUpsells = upsells.filter((u) => !u.shown_at)
    if (newUpsells.length > 0) {
      void trackInteraction({
        customerId: participant.userId,
        interactionType: 'upsell_shown',
        sessionId,
        metadata: {
          upsell_count: newUpsells.length,
          upsell_ids: newUpsells.map((u) => u.id),
        },
      })

      // Mark each as shown
      const { markUpsellShown } = await import('@/lib/crm')
      for (const upsell of newUpsells) {
        void markUpsellShown(upsell.id)
      }
    }

    return NextResponse.json({
      success: true,
      upsells,
    })
  } catch (error: any) {
    console.error('[session upsells] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
