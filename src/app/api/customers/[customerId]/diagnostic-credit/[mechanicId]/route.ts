import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireCustomerAPI } from '@/lib/auth/guards'

/**
 * GET /api/customers/[customerId]/diagnostic-credit/[mechanicId]
 * Check if customer has valid diagnostic credit with specific mechanic
 *
 * Returns:
 * - has_credit: boolean (true if valid credit exists)
 * - session_id: UUID (parent session ID)
 * - session_type: 'chat' | 'video' (type of diagnostic that generated credit)
 * - credit_amount: number (dollar amount of credit)
 * - expires_at: timestamp (when credit expires, 48 hours from session completion)
 * - hours_remaining: number (hours until expiration)
 *
 * Credit is valid if:
 * - Session is completed
 * - Mechanic marked requires_in_person_follow_up = true
 * - Credit not already used
 * - Within 48-hour window (not expired)
 * - Same mechanic only
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { customerId: string; mechanicId: string } }
) {
  // ✅ SECURITY: Require customer authentication and validate customer ID matches
  const authResult = await requireCustomerAPI(req)
  if (authResult.error) return authResult.error

  const customer = authResult.data

  // ✅ SECURITY: Customer can only check their own credit
  if (customer.id !== params.customerId) {
    return NextResponse.json({
      error: 'You can only check your own diagnostic credits',
    }, { status: 403 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    // Use the helper function from the database to check credit validity
    const { data, error } = await supabaseAdmin.rpc('check_diagnostic_credit_validity', {
      p_customer_id: params.customerId,
      p_mechanic_id: params.mechanicId,
    })

    if (error) {
      console.error('[DIAGNOSTIC CREDIT API] RPC error:', error)
      return NextResponse.json({
        error: 'Failed to check diagnostic credit',
      }, { status: 500 })
    }

    // RPC returns an array with single row
    const creditInfo = data?.[0] || {
      has_credit: false,
      session_id: null,
      session_type: null,
      credit_amount: 0,
      expires_at: null,
      hours_remaining: 0,
    }

    return NextResponse.json({
      has_credit: creditInfo.has_credit,
      credit_info: creditInfo.has_credit
        ? {
            session_id: creditInfo.session_id,
            session_type: creditInfo.session_type,
            credit_amount: creditInfo.credit_amount,
            expires_at: creditInfo.expires_at,
            hours_remaining: Math.round(creditInfo.hours_remaining * 10) / 10, // Round to 1 decimal
          }
        : null,
    })
  } catch (error) {
    console.error('[DIAGNOSTIC CREDIT API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
