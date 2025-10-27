import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/mechanic/sessions/complete
 *
 * Independent mechanic completes diagnostic session AND creates quote in one action
 *
 * Body:
 * {
 *   session_id: string,
 *   diagnosis: {
 *     summary: string,
 *     findings: string[],
 *     recommended_services: string[],
 *     urgency: 'low' | 'medium' | 'high' | 'urgent',
 *     service_type: string,
 *     photos: string[]
 *   },
 *   quote: {
 *     line_items: LineItem[],
 *     labor_cost: number,
 *     parts_cost: number,
 *     subtotal: number,
 *     trip_fee?: number,
 *     trip_distance?: number,
 *     platform_fee_percent: number,
 *     platform_fee_amount: number,
 *     customer_total: number,
 *     provider_receives: number,
 *     fee_rule_applied: string,
 *     notes?: string,
 *     estimated_completion_hours?: number,
 *     warranty_days?: number
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      session_id,
      diagnosis,
      quote
    } = body

    // Validate required fields
    if (!session_id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    if (!diagnosis || !diagnosis.summary || !diagnosis.recommended_services || diagnosis.recommended_services.length === 0) {
      return NextResponse.json(
        { error: 'Complete diagnosis information is required' },
        { status: 400 }
      )
    }

    if (!quote || !quote.line_items || quote.line_items.length === 0) {
      return NextResponse.json(
        { error: 'Quote must include at least one line item' },
        { status: 400 }
      )
    }

    // Load diagnostic session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Diagnostic session not found' },
        { status: 404 }
      )
    }

    // Check if session is already completed
    if (session.status === 'completed') {
      return NextResponse.json(
        { error: 'This session has already been completed' },
        { status: 400 }
      )
    }

    // Check if quote was already sent
    if (session.quote_sent) {
      return NextResponse.json(
        { error: 'A quote has already been sent for this session' },
        { status: 400 }
      )
    }

    // TODO: Get mechanic ID from authenticated session
    // For now, using the mechanic_id from the session
    const mechanicId = session.mechanic_id

    // Check that this is an independent mechanic (not workshop)
    if (session.workshop_id) {
      return NextResponse.json(
        { error: 'Workshop mechanics should use the workshop quote flow' },
        { status: 400 }
      )
    }

    // STEP 1: Update diagnostic session with diagnosis
    const { error: diagnosisError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .update({
        status: 'completed',
        diagnosis_summary: diagnosis.summary,
        recommended_services: diagnosis.recommended_services,
        urgency: diagnosis.urgency,
        service_type: diagnosis.service_type,
        photos: diagnosis.photos || [],
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id)

    if (diagnosisError) {
      console.error('Error updating diagnostic session:', diagnosisError)
      return NextResponse.json(
        { error: 'Failed to save diagnosis' },
        { status: 500 }
      )
    }

    // STEP 2: Create repair quote
    const warrantyExpiresAt = new Date()
    warrantyExpiresAt.setDate(warrantyExpiresAt.getDate() + (quote.warranty_days || 90))

    const { data: repairQuote, error: quoteError } = await supabaseAdmin
      .from('repair_quotes')
      .insert({
        customer_id: session.customer_id,
        diagnostic_session_id: session_id,
        mechanic_id: mechanicId, // Independent mechanic
        workshop_id: null, // Not a workshop
        diagnosing_mechanic_id: mechanicId,
        quoting_user_id: mechanicId, // Same person for independent
        line_items: quote.line_items,
        labor_cost: quote.labor_cost,
        parts_cost: quote.parts_cost,
        subtotal: quote.subtotal,
        platform_fee_percent: quote.platform_fee_percent,
        platform_fee_amount: quote.platform_fee_amount,
        fee_rule_applied: quote.fee_rule_applied,
        customer_total: quote.customer_total,
        provider_receives: quote.provider_receives,
        status: 'pending',
        notes: quote.notes || '',
        estimated_completion_hours: quote.estimated_completion_hours || 0,
        warranty_days: quote.warranty_days || 90,
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

    // STEP 3: If mobile mechanic with trip fee, create in_person_visit record
    if (quote.trip_fee && quote.trip_fee > 0) {
      const { error: visitError } = await supabaseAdmin
        .from('in_person_visits')
        .insert({
          customer_id: session.customer_id,
          mechanic_id: mechanicId,
          diagnostic_session_id: session_id,
          visit_type: 'mobile_visit',
          trip_fee: quote.trip_fee,
          status: 'scheduled',
          scheduled_at: new Date().toISOString(),
          quote_sent: true,
          quote_id: repairQuote.id
        })

      if (visitError) {
        console.error('Error creating visit record:', visitError)
        // Continue anyway - quote was created successfully
      }
    }

    // STEP 4: Update diagnostic session to link quote
    await supabaseAdmin
      .from('diagnostic_sessions')
      .update({
        quote_sent: true,
        quote_id: repairQuote.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id)

    // TODO: Send notification to customer about new quote

    return NextResponse.json({
      success: true,
      quote_id: repairQuote.id,
      message: 'Diagnosis completed and quote sent successfully'
    })

  } catch (error: any) {
    console.error('Error completing session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to complete session' },
      { status: 500 }
    )
  }
}
