import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { canSendQuotes } from '@/lib/auth/permissions'

/**
 * POST /api/workshop/quotes/create
 *
 * Create a repair quote from diagnostic session
 *
 * Body:
 * {
 *   diagnostic_session_id: string,
 *   customer_id: string,
 *   line_items: LineItem[],
 *   labor_cost: number,
 *   parts_cost: number,
 *   subtotal: number,
 *   platform_fee_percent: number,
 *   platform_fee_amount: number,
 *   customer_total: number,
 *   provider_receives: number,
 *   fee_rule_applied: string,
 *   notes?: string,
 *   internal_notes?: string,
 *   estimated_completion_hours?: number,
 *   warranty_days?: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      diagnostic_session_id,
      customer_id,
      line_items = [],
      labor_cost,
      parts_cost,
      subtotal,
      platform_fee_percent,
      platform_fee_amount,
      customer_total,
      provider_receives,
      fee_rule_applied,
      notes = '',
      internal_notes = '',
      estimated_completion_hours = 0,
      warranty_days = 90
    } = body

    // Validate required fields
    if (!diagnostic_session_id) {
      return NextResponse.json(
        { error: 'Diagnostic session ID is required' },
        { status: 400 }
      )
    }

    if (!line_items || line_items.length === 0) {
      return NextResponse.json(
        { error: 'At least one line item is required' },
        { status: 400 }
      )
    }

    // Load diagnostic session to get customer and workshop info
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('*')
      .eq('id', diagnostic_session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Diagnostic session not found' },
        { status: 404 }
      )
    }

    // Check if quote was already sent for this session
    if (session.quote_sent) {
      return NextResponse.json(
        { error: 'A quote has already been sent for this diagnostic session' },
        { status: 400 }
      )
    }

    // TODO: Get mechanic/service advisor ID from authenticated session
    // For now, using the mechanic_id from the session
    const quotingUserId = session.mechanic_id

    // Check if user has permission to send quotes
    if (session.workshop_id) {
      const hasPermission = await canSendQuotes(session.workshop_id, quotingUserId)
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'You do not have permission to send quotes' },
          { status: 403 }
        )
      }
    }

    // Calculate warranty expiration date
    const warrantyExpiresAt = new Date()
    warrantyExpiresAt.setDate(warrantyExpiresAt.getDate() + warranty_days)

    // Create the repair quote
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('repair_quotes')
      .insert({
        customer_id: session.customer_id,
        diagnostic_session_id: diagnostic_session_id,
        workshop_id: session.workshop_id,
        mechanic_id: session.workshop_id ? null : session.mechanic_id, // Only for independent mechanics
        diagnosing_mechanic_id: session.mechanic_id,
        quoting_user_id: quotingUserId,
        line_items: line_items,
        labor_cost: labor_cost,
        parts_cost: parts_cost,
        subtotal: subtotal,
        platform_fee_percent: platform_fee_percent,
        platform_fee_amount: platform_fee_amount,
        fee_rule_applied: fee_rule_applied,
        customer_total: customer_total,
        provider_receives: provider_receives,
        status: 'pending',
        notes: notes,
        internal_notes: internal_notes,
        estimated_completion_hours: estimated_completion_hours,
        warranty_days: warranty_days,
        warranty_expires_at: warrantyExpiresAt.toISOString(),
        sent_at: new Date().toISOString()
      })
      .select()
      .single()

    if (quoteError) {
      console.error('Error creating quote:', quoteError)
      return NextResponse.json(
        { error: 'Failed to create quote' },
        { status: 500 }
      )
    }

    // Update diagnostic session to mark quote as sent
    const { error: updateError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .update({
        quote_sent: true,
        quote_id: quote.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', diagnostic_session_id)

    if (updateError) {
      console.error('Error updating diagnostic session:', updateError)
      // Continue anyway - quote was created successfully
    }

    // TODO: Send notification to customer about new quote
    // This can be done via email, SMS, or push notification

    return NextResponse.json({
      success: true,
      quote_id: quote.id,
      message: 'Quote sent successfully to customer'
    })

  } catch (error: any) {
    console.error('Error creating quote:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create quote' },
      { status: 500 }
    )
  }
}
