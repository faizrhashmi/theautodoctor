import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function createClient() {
  const cookieStore = cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

/**
 * PUT /api/upsells/:id
 * Update upsell interaction (click or dismiss)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const upsellId = params.id
    const body = await req.json()
    const { action } = body

    if (!action || !['click', 'dismiss', 'purchase'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: click, dismiss, or purchase' },
        { status: 400 }
      )
    }

    // Verify user owns the upsell
    const { data: upsell } = await supabaseAdmin
      .from('upsell_recommendations')
      .select('customer_id')
      .eq('id', upsellId)
      .single()

    if (!upsell || upsell.customer_id !== user.id) {
      return NextResponse.json({ error: 'Upsell not found or access denied' }, { status: 403 })
    }

    // Update based on action
    const now = new Date().toISOString()
    const updateData: Record<string, string> = {}

    if (action === 'click') {
      updateData.clicked_at = now
    } else if (action === 'dismiss') {
      updateData.dismissed_at = now
    } else if (action === 'purchase') {
      updateData.purchased_at = now
    }

    const { error: updateError } = await supabaseAdmin
      .from('upsell_recommendations')
      .update(updateData)
      .eq('id', upsellId)

    if (updateError) {
      console.error('[PUT /api/upsells/:id] Error updating upsell:', updateError)
      return NextResponse.json({ error: 'Failed to update upsell' }, { status: 500 })
    }

    // Track CRM interaction
    try {
      await supabaseAdmin.from('crm_interactions').insert({
        customer_id: user.id,
        interaction_type: `upsell_${action}`,
        metadata: { upsell_id: upsellId },
      })
    } catch (crmError) {
      console.error('[PUT /api/upsells/:id] Failed to track CRM interaction:', crmError)
      // Don't fail the request
    }

    return NextResponse.json({
      success: true,
      message: `Upsell ${action} tracked`,
    })
  } catch (error) {
    console.error('[PUT /api/upsells/:id] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
