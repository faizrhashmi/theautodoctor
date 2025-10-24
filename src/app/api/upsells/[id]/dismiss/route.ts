import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { markUpsellDismissed } from '@/lib/crm'
import { trackInteraction } from '@/lib/crm'

/**
 * POST /api/upsells/:id/dismiss
 * Tracks when a customer dismisses an upsell recommendation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await requireCustomerAPI(req)
  if (result.error) return result.error

  const customer = result.data
  const upsellId = params.id

  if (!upsellId) {
    return NextResponse.json({ error: 'Upsell ID required' }, { status: 400 })
  }

  try {
    // Mark upsell as dismissed
    const dismissResult = await markUpsellDismissed(upsellId)

    if (!dismissResult.success) {
      return NextResponse.json(
        { error: dismissResult.error || 'Failed to track dismissal' },
        { status: 500 }
      )
    }

    // Track the dismissal interaction in CRM
    void trackInteraction({
      customerId: customer.id,
      interactionType: 'upsell_dismissed',
      metadata: {
        upsell_id: upsellId,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Upsell dismissal tracked',
    })
  } catch (error: any) {
    console.error('[upsell dismiss] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
