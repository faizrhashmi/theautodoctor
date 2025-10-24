import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { getSessionUpsells, trackInteraction } from '@/lib/crm'

/**
 * GET /api/sessions/:id/upsells
 * Fetches upsell recommendations for a session
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await requireCustomerAPI(req)
  if (result.error) return result.error

  const customer = result.data
  const sessionId = params.id

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
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
        customerId: customer.id,
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
