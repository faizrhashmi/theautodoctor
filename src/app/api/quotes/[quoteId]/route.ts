import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/quotes/[quoteId]
 *
 * Get a specific repair quote with all details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  try {
    const quoteId = params.quoteId

    // Load the repair quote with related data
    const { data: quote, error } = await supabaseAdmin
      .from('repair_quotes')
      .select(`
        *,
        profiles!repair_quotes_customer_id_fkey (
          id,
          full_name,
          email,
          phone
        ),
        organizations!repair_quotes_workshop_id_fkey (
          id,
          name,
          email
        ),
        diagnostic_sessions!repair_quotes_diagnostic_session_id_fkey (
          id,
          diagnosis_summary,
          recommended_services,
          urgency,
          service_type,
          vehicle_info
        )
      `)
      .eq('id', quoteId)
      .single()

    if (error || !quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Update viewed_at if first time viewing and status is pending
    if (quote.status === 'pending' && !quote.viewed_at) {
      await supabaseAdmin
        .from('repair_quotes')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString()
        })
        .eq('id', quoteId)
    }

    // Format response
    const response = {
      id: quote.id,
      customer: {
        id: (quote.profiles as any)?.id,
        name: (quote.profiles as any)?.full_name || 'Unknown Customer',
        email: (quote.profiles as any)?.email,
        phone: (quote.profiles as any)?.phone
      },
      workshop: quote.organizations ? {
        id: (quote.organizations as any)?.id,
        name: (quote.organizations as any)?.name,
        email: (quote.organizations as any)?.email
      } : null,
      diagnosis: quote.diagnostic_sessions ? {
        summary: (quote.diagnostic_sessions as any)?.diagnosis_summary,
        recommended_services: (quote.diagnostic_sessions as any)?.recommended_services,
        urgency: (quote.diagnostic_sessions as any)?.urgency,
        service_type: (quote.diagnostic_sessions as any)?.service_type,
        vehicle: (quote.diagnostic_sessions as any)?.vehicle_info
      } : null,
      line_items: quote.line_items,
      pricing: {
        labor_cost: quote.labor_cost,
        parts_cost: quote.parts_cost,
        subtotal: quote.subtotal,
        platform_fee_percent: quote.platform_fee_percent,
        platform_fee_amount: quote.platform_fee_amount,
        customer_total: quote.customer_total,
        provider_receives: quote.provider_receives,
        fee_rule_applied: quote.fee_rule_applied
      },
      status: quote.status,
      notes: quote.notes,
      warranty_days: quote.warranty_days,
      warranty_expires_at: quote.warranty_expires_at,
      estimated_completion_hours: quote.estimated_completion_hours,
      created_at: quote.created_at,
      sent_at: quote.sent_at,
      viewed_at: quote.viewed_at,
      customer_responded_at: quote.customer_responded_at,
      customer_response: quote.customer_response,
      customer_notes: quote.customer_notes,
      decline_reason: quote.decline_reason
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error fetching quote:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quote' },
      { status: 500 }
    )
  }
}
