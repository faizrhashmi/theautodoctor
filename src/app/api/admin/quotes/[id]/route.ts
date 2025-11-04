/**
 * Admin Quote Management API
 * Phase 4: Admin actions on individual quotes
 *
 * PATCH /api/admin/quotes/[id]
 * Body: {
 *   action: 'expire' | 'unexpire' | 'cancel',
 *   source: 'direct' | 'rfq',
 *   notes?: string
 * }
 *
 * Returns: { success: boolean, quote: {...} }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

interface AdminQuoteActionRequest {
  action: 'expire' | 'unexpire' | 'cancel'
  source: 'direct' | 'rfq'
  notes?: string
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const { id } = params
    const body: AdminQuoteActionRequest = await req.json()
    const { action, source, notes } = body

    console.log(
      `[ADMIN-QUOTE-ACTION] Admin ${authResult.data.email} performing ${action} on ${source} quote ${id}`
    )

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Validate input
    if (!action || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: action, source' },
        { status: 400 }
      )
    }

    if (!['expire', 'unexpire', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: expire, unexpire, or cancel' },
        { status: 400 }
      )
    }

    // Route to appropriate table based on source
    if (source === 'direct') {
      // Update repair_quotes
      const { data: currentQuote, error: fetchError } = await supabaseAdmin
        .from('repair_quotes')
        .select('id, status')
        .eq('id', id)
        .maybeSingle()

      if (fetchError || !currentQuote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
      }

      // Determine new status based on action
      let newStatus: string
      switch (action) {
        case 'expire':
          newStatus = 'expired'
          break
        case 'unexpire':
          newStatus = 'pending'
          break
        case 'cancel':
          newStatus = 'cancelled'
          break
        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
      }

      // Update the quote
      const { data: updatedQuote, error: updateError } = await supabaseAdmin
        .from('repair_quotes')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('[ADMIN-QUOTE-ACTION] Update error:', updateError)
        return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
      }

      // Log admin action in metadata if we have an admin_actions table
      try {
        await supabaseAdmin.from('admin_actions').insert({
          admin_id: authResult.data.id,
          action_type: 'quote_status_change',
          target_type: 'repair_quote',
          target_id: id,
          old_value: currentQuote.status,
          new_value: newStatus,
          notes: notes || null,
          metadata: {
            source: 'direct',
            action: action,
          },
        })
      } catch (logError) {
        // Don't fail if admin_actions table doesn't exist
        console.warn('[ADMIN-QUOTE-ACTION] Could not log admin action:', logError)
      }

      return NextResponse.json({
        success: true,
        message: `Quote ${action}d successfully`,
        quote: updatedQuote,
      })
    } else if (source === 'rfq') {
      // Update workshop_rfq_bids
      const { data: currentBid, error: fetchError } = await supabaseAdmin
        .from('workshop_rfq_bids')
        .select('id, status')
        .eq('id', id)
        .maybeSingle()

      if (fetchError || !currentBid) {
        return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
      }

      // Determine new status based on action
      let newStatus: string
      switch (action) {
        case 'expire':
          newStatus = 'expired'
          break
        case 'unexpire':
          newStatus = 'pending'
          break
        case 'cancel':
          newStatus = 'cancelled'
          break
        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
      }

      // Update the bid
      const { data: updatedBid, error: updateError } = await supabaseAdmin
        .from('workshop_rfq_bids')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('[ADMIN-QUOTE-ACTION] Update error:', updateError)
        return NextResponse.json({ error: 'Failed to update bid' }, { status: 500 })
      }

      // Log admin action
      try {
        await supabaseAdmin.from('admin_actions').insert({
          admin_id: authResult.data.id,
          action_type: 'quote_status_change',
          target_type: 'rfq_bid',
          target_id: id,
          old_value: currentBid.status,
          new_value: newStatus,
          notes: notes || null,
          metadata: {
            source: 'rfq',
            action: action,
          },
        })
      } catch (logError) {
        console.warn('[ADMIN-QUOTE-ACTION] Could not log admin action:', logError)
      }

      return NextResponse.json({
        success: true,
        message: `Bid ${action}d successfully`,
        quote: updatedBid,
      })
    }

    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  } catch (error: any) {
    console.error('[ADMIN-QUOTE-ACTION] Error:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Internal server error' },
      { status: 500 }
    )
  }
}
