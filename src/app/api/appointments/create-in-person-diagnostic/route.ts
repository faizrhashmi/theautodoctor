/**
 * POST /api/appointments/create-in-person-diagnostic
 * Create in-person diagnostic appointment with optional diagnostic credit
 *
 * Scenarios:
 *
 * 1. NEW DIAGNOSTIC (no credit):
 *    - Customer books new in-person diagnostic
 *    - appointment_type = 'new_diagnostic'
 *    - Full payment required
 *
 * 2. IN-PERSON FOLLOW-UP (with credit):
 *    - Customer had previous diagnostic (chat/video)
 *    - Mechanic marked requires_in_person_follow_up = true
 *    - appointment_type = 'in_person_follow_up'
 *    - Credit applied, customer pays difference (or $0 if credit covers full amount)
 *
 * Request Body:
 * {
 *   mechanicId: UUID (mechanic user_id),
 *   requestedDate: string (ISO date),
 *   requestedTime: string (HH:mm),
 *   vehicleInfo: object (vehicle details),
 *   customerNotes?: string,
 *   parentDiagnosticSessionId?: UUID (for follow-up with credit),
 *   paymentIntentId?: string (Stripe payment intent ID, if payment was required)
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await request.json()
    const {
      mechanicId,
      requestedDate,
      requestedTime,
      vehicleInfo,
      customerNotes = '',
      parentDiagnosticSessionId = null,
      paymentIntentId = null,
    } = body

    // 3. Validate required fields
    if (!mechanicId || !requestedDate || !requestedTime || !vehicleInfo) {
      return NextResponse.json({
        error: 'Missing required fields: mechanicId, requestedDate, requestedTime, vehicleInfo',
      }, { status: 400 })
    }

    // 4. Get mechanic details
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id, user_id, workshop_id, participation_mode, can_perform_physical_work')
      .eq('user_id', mechanicId)
      .single()

    if (mechanicError || !mechanic) {
      console.error('[CREATE IN-PERSON APPOINTMENT] Mechanic not found:', mechanicError)
      return NextResponse.json({ error: 'Mechanic not found' }, { status: 404 })
    }

    // 5. Get mechanic's in-person diagnostic pricing
    const { data: pricing, error: pricingError } = await supabaseAdmin
      .from('mechanic_diagnostic_pricing')
      .select('in_person_diagnostic_price, in_person_diagnostic_description')
      .eq('mechanic_id', mechanic.id)
      .single()

    if (pricingError || !pricing) {
      console.error('[CREATE IN-PERSON APPOINTMENT] Pricing not found:', pricingError)
      return NextResponse.json({
        error: 'Mechanic has not set in-person diagnostic pricing',
      }, { status: 400 })
    }

    const diagnosticPrice = pricing.in_person_diagnostic_price

    // 6. Check for valid diagnostic credit (if parent session provided)
    let creditAmount = 0
    let creditSessionId = null
    let appointmentType = 'new_diagnostic'

    if (parentDiagnosticSessionId) {
      // Verify credit validity using helper function
      const { data: creditData, error: creditError } = await supabaseAdmin.rpc(
        'check_diagnostic_credit_validity',
        {
          p_customer_id: user.id,
          p_mechanic_id: mechanic.id,
        }
      )

      if (creditError) {
        console.error('[CREATE IN-PERSON APPOINTMENT] Credit check error:', creditError)
        return NextResponse.json({
          error: 'Failed to validate diagnostic credit',
        }, { status: 500 })
      }

      const creditInfo = creditData?.[0]

      // Verify credit matches parent session
      if (creditInfo?.has_credit && creditInfo.session_id === parentDiagnosticSessionId) {
        creditAmount = creditInfo.credit_amount
        creditSessionId = creditInfo.session_id
        appointmentType = 'in_person_follow_up'

        console.log('[CREATE IN-PERSON APPOINTMENT] Credit applied:', {
          creditAmount,
          sessionId: creditSessionId,
          expiresAt: creditInfo.expires_at,
        })
      } else {
        return NextResponse.json({
          error: 'Diagnostic credit is invalid, expired, or already used',
        }, { status: 400 })
      }
    }

    // 7. Calculate final amounts
    const totalAmount = diagnosticPrice
    const creditApplied = creditAmount > 0
    const diagnosticCreditAmount = creditApplied ? creditAmount : 0
    const amountPaid = Math.max(0, totalAmount - diagnosticCreditAmount)

    console.log('[CREATE IN-PERSON APPOINTMENT] Payment breakdown:', {
      totalAmount,
      creditAmount: diagnosticCreditAmount,
      amountPaid,
      isFree: amountPaid === 0,
    })

    // 8. Combine requested date and time
    const scheduledAt = new Date(`${requestedDate}T${requestedTime}:00`)

    // 9. Create appointment
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('workshop_appointments')
      .insert({
        customer_user_id: user.id,
        mechanic_id: mechanic.id,
        workshop_id: mechanic.workshop_id,
        appointment_type: appointmentType,
        parent_diagnostic_session_id: creditSessionId,
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending',

        // Vehicle info
        vehicle_info: vehicleInfo,
        customer_notes: customerNotes,

        // Payment tracking
        total_amount: totalAmount,
        diagnostic_credit_applied: creditApplied,
        diagnostic_credit_amount: diagnosticCreditAmount,
        mechanic_diagnostic_price: diagnosticPrice,
        platform_commission_percent: 30.00, // 30% for diagnostics

        // Payment intent (if payment was made)
        deposit_payment_intent_id: paymentIntentId,
        payment_status: amountPaid === 0 ? 'paid_full' : (paymentIntentId ? 'deposit_paid' : 'pending'),
        deposit_paid_at: paymentIntentId ? new Date().toISOString() : null,

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (appointmentError) {
      console.error('[CREATE IN-PERSON APPOINTMENT] Creation error:', appointmentError)

      // Check if error is due to credit validation trigger
      if (appointmentError.message?.includes('already been used')) {
        return NextResponse.json({
          error: 'Diagnostic credit has already been used',
        }, { status: 400 })
      }

      if (appointmentError.message?.includes('expired')) {
        return NextResponse.json({
          error: 'Diagnostic credit has expired (48-hour limit)',
        }, { status: 400 })
      }

      return NextResponse.json({
        error: 'Failed to create appointment',
      }, { status: 500 })
    }

    // 10. If credit was applied, the trigger automatically marks it as used
    // This happens via the mark_diagnostic_credit_as_used() trigger

    console.log('[CREATE IN-PERSON APPOINTMENT] Success:', {
      appointmentId: appointment.id,
      appointmentType,
      creditApplied,
      creditAmount: diagnosticCreditAmount,
      amountPaid,
    })

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        appointment_type: appointment.appointment_type,
        scheduled_at: appointment.scheduled_at,
        status: appointment.status,
        total_amount: appointment.total_amount,
        diagnostic_credit_applied: appointment.diagnostic_credit_applied,
        diagnostic_credit_amount: appointment.diagnostic_credit_amount,
        amount_paid: amountPaid,
        payment_status: appointment.payment_status,
        is_free: amountPaid === 0,
      },
      message: creditApplied
        ? `Appointment created! Your $${diagnosticCreditAmount} credit has been applied.`
        : 'Appointment created successfully!',
    })
  } catch (error: any) {
    console.error('[CREATE IN-PERSON APPOINTMENT] Error:', error)

    return NextResponse.json({
      error: error.message || 'Failed to create appointment',
    }, { status: 500 })
  }
}
