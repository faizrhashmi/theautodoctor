import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { markUpsellClicked } from '@/lib/crm'
import { trackInteraction } from '@/lib/crm'

/**
 * POST /api/upsells/:id/click
 * Tracks when a customer clicks on an upsell recommendation
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
    // Mark upsell as clicked
    const clickResult = await markUpsellClicked(upsellId)

    if (!clickResult.success) {
      return NextResponse.json(
        { error: clickResult.error || 'Failed to track click' },
        { status: 500 }
      )
    }

    // Track the click interaction in CRM
    void trackInteraction({
      customerId: customer.id,
      interactionType: 'upsell_clicked',
      metadata: {
        upsell_id: upsellId,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Upsell click tracked',
    })
  } catch (error: any) {
    console.error('[upsell click] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
