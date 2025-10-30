import { NextRequest, NextResponse } from 'next/server'
import { requireSessionParticipantRelaxed } from '@/lib/auth/relaxedSessionAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { stripe } from '@/lib/stripe'
import { PRICING, type PlanKey } from '@/config/pricing'
import { canTransition } from '@/lib/sessionFsm'
import type { SessionStatus } from '@/types/session'
import { logInfo } from '@/lib/log'
import { sendSessionEndedEmail } from '@/lib/email/templates'
import { trackInteraction, generateUpsellsForSession } from '@/lib/crm'

const MECHANIC_SHARE = 0.7 // 70% to mechanic, 30% to platform

/**
 * Calculate duration in minutes between two ISO timestamps
 */
function calculateDuration(startedAt: string | null, endedAt: string): number | null {
  if (!startedAt) return null

  const start = new Date(startedAt).getTime()
  const end = new Date(endedAt).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null
  }

  return Math.max(1, Math.round((end - start) / 60000))
}

/**
 * POST /api/sessions/:id/end
 * Ends a session and processes mechanic payout
 *
 * Flow:
 * 1. Verify user is authorized (participant)
 * 2. Fetch session details (plan, mechanic, started_at)
 * 3. Calculate duration
 * 4. Calculate mechanic earnings (70%)
 * 5. Create Stripe transfer if mechanic has connected account
 * 6. Update session with completion data and payout metadata
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  // Validate session participant using RELAXED auth (handles cookie issues)
  const authResult = await requireSessionParticipantRelaxed(req, sessionId)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[POST /sessions/${sessionId}/end] ${participant.role} ending session ${participant.sessionId} (auth source: ${participant.source})`)

  // CRITICAL FIX: Try both sessions and diagnostic_sessions tables
  // First check sessions table
  let session: any = null
  let sessionTable: 'sessions' | 'diagnostic_sessions' | null = null

  const { data: sessionsData, error: sessionsError } = await supabaseAdmin
    .from('sessions')
    .select('id, status, plan, type, started_at, ended_at, duration_minutes, mechanic_id, customer_user_id, metadata')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionsData) {
    session = sessionsData
    sessionTable = 'sessions'
  } else {
    // Try diagnostic_sessions table
    const { data: diagnosticData, error: diagnosticError } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('id, status, session_type as type, started_at, ended_at, duration_minutes, mechanic_id, customer_id as customer_user_id, metadata, base_price')
      .eq('id', sessionId)
      .maybeSingle()

    if (diagnosticData) {
      session = diagnosticData
      sessionTable = 'diagnostic_sessions'
      // Map diagnostic_sessions fields to sessions structure
      if (!session.plan) {
        session.plan = 'diagnostic' // Default plan for diagnostic sessions
      }
    }
  }

  if (!session || !sessionTable) {
    console.error(`[end session] Session ${sessionId} not found in either table`, {
      sessionsError: sessionsError?.message,
      checked: ['sessions', 'diagnostic_sessions']
    })
    return NextResponse.json({
      error: 'Session not found',
      details: 'Session does not exist in database',
      sessionId
    }, { status: 404 })
  }

  console.log(`[end session] Found session in ${sessionTable} table`)


  // Determine role from participant data
  const isCustomer = participant.role === 'customer'
  const isMechanic = participant.role === 'mechanic'

  const now = new Date().toISOString()
  const acceptHeader = req.headers.get('accept')
  const contentType = req.headers.get('content-type')

  // FSM VALIDATION: Check if transition to 'completed' is valid
  const currentStatus = session.status as SessionStatus

  // Idempotent: If already completed, return success
  if (currentStatus === 'completed') {
    return NextResponse.json({
      success: true,
      message: 'Session already completed',
      session: {
        id: sessionId,
        status: 'completed',
        ended_at: session.ended_at || now,
      },
    })
  }

  // Check if we can transition to completed
  if (!canTransition(currentStatus, 'completed')) {
    // Try transitioning to cancelled instead if completed is not allowed
    if (canTransition(currentStatus, 'cancelled')) {
      console.log(`[end session] Cannot transition ${currentStatus} -> completed, using cancelled instead`)

      // Update correct table for cancellation
      const { error: cancelError } = sessionTable === 'sessions'
        ? await supabaseAdmin
            .from('sessions')
            .update({
              status: 'cancelled',
              ended_at: now,
              updated_at: now,
              metadata: {
                ...(typeof session.metadata === 'object' && session.metadata !== null ? session.metadata : {}),
                cancelled_via_end: {
                  original_status: currentStatus,
                  ended_at: now,
                  ended_by: isCustomer ? 'customer' : 'mechanic',
                },
              },
            })
            .eq('id', sessionId)
        : await supabaseAdmin
            .from('diagnostic_sessions')
            .update({
              status: 'cancelled',
              ended_at: now,
              updated_at: now,
            })
            .eq('id', sessionId)

      if (cancelError) {
        console.error('Failed to cancel session', cancelError)
        return NextResponse.json({ error: cancelError.message }, { status: 500 })
      }

      await logInfo('session.cancelled', `Session ${sessionId} cancelled (via end request)`, {
        sessionId,
        customerId: session.customer_user_id,
        mechanicId: session.mechanic_id,
        metadata: { original_status: currentStatus, ended_by: isCustomer ? 'customer' : 'mechanic' },
      })

      // Broadcast session ended event
      try {
        await supabaseAdmin.channel(`session:${sessionId}`).send({
          type: 'broadcast',
          event: 'session:ended',
          payload: {
            sessionId,
            status: 'cancelled',
            ended_at: now,
          },
        })
      } catch (broadcastError) {
        console.error('[end session] Failed to broadcast session:ended', broadcastError)
      }

      // Always return JSON for API calls (fetch from frontend)
      // Only redirect if coming from a form submission
      return NextResponse.json({
        success: true,
        message: 'Session cancelled successfully',
        session: { id: sessionId, status: 'cancelled', ended_at: now },
      })
    }

    return NextResponse.json(
      {
        error: 'Invalid state transition',
        current: currentStatus,
        requested: 'completed',
        message: `Cannot end session in ${currentStatus} status`,
      },
      { status: 409 }
    )
  }

  console.log(`[end session] Ending session ${sessionId} with status: ${session.status}`)

  // If session was never started (pending/waiting), mark as completed with no-show metadata
  const shouldMarkNoShow = !session.started_at && ['pending', 'waiting'].includes(currentStatus)
  const durationMinutes = calculateDuration(session.started_at, now) ?? 0

  // If session should be marked as no-show (never started), mark as completed
  if (shouldMarkNoShow) {
    console.log(`[end session] Session ${sessionId} never started - marking as completed (no-show)`)

    // Mark session as completed (not cancelled) so it shows in mechanic history
    const noShowUpdate = {
      status: 'completed',
      ended_at: now,
      updated_at: now,
      duration_minutes: 0,
      metadata: {
        ...(typeof session.metadata === 'object' && session.metadata !== null ? session.metadata : {}),
        no_show: {
          ended_at: now,
          reason: 'Session ended before starting (customer/mechanic no-show)',
          ended_by: isCustomer ? 'customer' : 'mechanic',
        },
      },
    }

    const { error: updateError } = sessionTable === 'sessions'
      ? await supabaseAdmin.from('sessions').update(noShowUpdate).eq('id', sessionId)
      : await supabaseAdmin.from('diagnostic_sessions').update({
          status: 'completed',
          ended_at: now,
          updated_at: now,
          duration_minutes: 0,
          metadata: noShowUpdate.metadata,
        }).eq('id', sessionId)

    if (updateError) {
      console.error('Failed to end no-show session', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log no-show completion
    await logInfo('session.completed', `Session ${sessionId} completed (no-show)`, {
      sessionId,
      customerId: session.customer_user_id,
      mechanicId: session.mechanic_id,
      metadata: {
        no_show: true,
        ended_by: isCustomer ? 'customer' : 'mechanic',
      },
    })

    // CRITICAL FIX: Create notifications for no-show scenario
    const noShowNotifications = []

    if (session.customer_user_id) {
      noShowNotifications.push({
        user_id: session.customer_user_id,
        type: 'session_cancelled',
        payload: {
          session_id: sessionId,
          session_type: session.type,
          reason: 'Session ended before starting (no-show)',
          ended_by: isCustomer ? 'customer' : 'mechanic'
        }
      })
    }

    if (session.mechanic_id && session.mechanic_id !== session.customer_user_id) {
      noShowNotifications.push({
        user_id: session.mechanic_id,
        type: 'session_cancelled',
        payload: {
          session_id: sessionId,
          session_type: session.type,
          reason: 'Session ended before starting (no-show)',
          ended_by: isMechanic ? 'mechanic' : 'customer'
        }
      })
    }

    if (noShowNotifications.length > 0) {
      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert(noShowNotifications)

      if (notificationError) {
        console.error('[end session] Failed to create no-show notifications:', notificationError)
      } else {
        console.log(`[end session] ✓ Created ${noShowNotifications.length} notification(s) for no-show`)
      }
    }

    // Broadcast session ended event
    try {
      await supabaseAdmin.channel(`session:${sessionId}`).send({
        type: 'broadcast',
        event: 'session:ended',
        payload: {
          sessionId,
          status: 'completed',
          ended_at: now,
          no_show: true,
        },
      })
    } catch (broadcastError) {
      console.error('[end session] Failed to broadcast session:ended', broadcastError)
    }

    // Mark any associated session request as cancelled (no-show)
    // CRITICAL FIX: Match by customer_id since session_requests has no session_id column
    if (session.customer_user_id) {
      await supabaseAdmin
        .from('session_requests')
        .update({
          status: 'cancelled',
          updated_at: now,
        })
        .eq('customer_id', session.customer_user_id)
        .in('status', ['pending', 'accepted', 'unattended']) // Update all active statuses
    }

    const responseData = {
      success: true,
      message: 'Session ended successfully',
      session: {
        id: sessionId,
        status: 'completed',
        ended_at: now,
      },
    }

    // Always return JSON for API calls
    return NextResponse.json(responseData)
  }

  // Calculate mechanic earnings (only for sessions that actually happened)
  const planKey = session.plan as PlanKey
  const planPrice = PRICING[planKey]?.priceCents || 0
  const mechanicEarningsCents = Math.round(planPrice * MECHANIC_SHARE)

  let payoutMetadata: any = {
    amount_cents: mechanicEarningsCents,
    amount_dollars: (mechanicEarningsCents / 100).toFixed(2),
    plan: session.plan,
    plan_price_cents: planPrice,
    mechanic_share_percent: MECHANIC_SHARE * 100,
    calculated_at: now,
  }

  // Attempt Stripe transfer if mechanic has connected account AND session was actually started
  if (session.mechanic_id && mechanicEarningsCents > 0 && session.started_at) {
    try {
      // First try mechanics table (custom auth system)
      const { data: mechanic } = await supabaseAdmin
        .from('mechanics')
        .select('stripe_account_id, stripe_payouts_enabled, name')
        .eq('id', session.mechanic_id)
        .single()

      // Fallback to profiles table (Supabase auth system) if not found
      const { data: profile } = !mechanic ? await supabaseAdmin
        .from('profiles')
        .select('stripe_account_id, stripe_payouts_enabled, full_name')
        .eq('id', session.mechanic_id)
        .single() : { data: null }

      const mechanicData = mechanic || profile
      const mechanicName = mechanic?.name || profile?.full_name || 'Mechanic'

      if (mechanicData?.stripe_account_id && mechanicData.stripe_payouts_enabled) {
        // Create Stripe transfer
        const transfer = await stripe.transfers.create({
          amount: mechanicEarningsCents,
          currency: 'usd',
          destination: mechanicData.stripe_account_id,
          description: `Session ${sessionId} - ${session.type} (${session.plan})`,
          metadata: {
            session_id: sessionId,
            mechanic_id: session.mechanic_id,
            plan: session.plan,
            session_type: session.type,
          },
        })

        payoutMetadata = {
          ...payoutMetadata,
          status: 'transferred',
          transfer_id: transfer.id,
          destination_account: mechanicData.stripe_account_id,
          transferred_at: now,
          mechanic_name: mechanicName,
        }

        console.log(
          `[end session] Stripe transfer created: ${transfer.id} for ${mechanicEarningsCents / 100} USD`
        )
      } else {
        payoutMetadata = {
          ...payoutMetadata,
          status: 'pending_stripe_connection',
          message: 'Mechanic needs to complete Stripe Connect onboarding',
        }

        console.warn(`⚠️ Mechanic ${session.mechanic_id} not connected to Stripe - payout pending`)
      }
    } catch (stripeError) {
      console.error('Stripe transfer failed', stripeError)
      payoutMetadata = {
        ...payoutMetadata,
        status: 'transfer_failed',
        error: stripeError instanceof Error ? stripeError.message : 'Transfer failed',
        failed_at: now,
      }
    }
  } else {
    payoutMetadata = {
      ...payoutMetadata,
      status: 'no_payout',
      message: 'No mechanic assigned or zero earnings',
    }
  }

  // =====================================================
  // NEW: Record earnings using workshop-aware revenue splits
  // =====================================================
  if (session.started_at && planPrice > 0) {
    try {
      console.log(`[end session] Recording earnings for session ${sessionId}: $${(planPrice / 100).toFixed(2)}`)

      // Get payment intent ID from session metadata (if available)
      const paymentIntentId = (session.metadata as any)?.payment_intent_id || null

      // Call database function to record earnings with proper splits
      // This handles all 3 scenarios: workshop mechanic, independent mechanic, cross-workshop
      const { error: earningsError } = await supabaseAdmin.rpc('record_session_earnings', {
        p_session_id: sessionId,
        p_payment_intent_id: paymentIntentId,
        p_amount_cents: planPrice,
      })

      if (earningsError) {
        console.error('[end session] Failed to record earnings:', earningsError)
        // Don't fail the entire request - log and continue
        payoutMetadata = {
          ...payoutMetadata,
          earnings_recording_error: earningsError.message,
        }
      } else {
        console.log(`[end session] ✓ Earnings recorded successfully for session ${sessionId}`)
        payoutMetadata = {
          ...payoutMetadata,
          earnings_recorded: true,
          earnings_recorded_at: now,
        }
      }
    } catch (earningsException) {
      console.error('[end session] Exception recording earnings:', earningsException)
      payoutMetadata = {
        ...payoutMetadata,
        earnings_recording_error: earningsException instanceof Error ? earningsException.message : 'Unknown error',
      }
    }
  } else {
    console.log(`[end session] Skipping earnings recording - session not started or zero price`)
  }
  // =====================================================

  // Update session with completion data (use correct table)
  const existingMetadata = (session.metadata || {}) as Record<string, any>
  const updateData: any = {
    status: 'completed',
    ended_at: now,
    duration_minutes: durationMinutes,
    updated_at: now,
    metadata: {
      ...existingMetadata,
      payout: payoutMetadata,
    },
  }

  // Update the correct table
  const { error: updateError } = sessionTable === 'sessions'
    ? await supabaseAdmin
        .from('sessions')
        .update(updateData)
        .eq('id', sessionId)
    : await supabaseAdmin
        .from('diagnostic_sessions')
        .update({
          status: 'completed',
          ended_at: now,
          duration_minutes: durationMinutes,
          updated_at: now,
          // diagnostic_sessions stores metadata differently
          ...existingMetadata,
        })
        .eq('id', sessionId)

  if (updateError) {
    console.error(`Failed to update ${sessionTable}`, updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  console.log(`[end session] Updated ${sessionTable} with completion data`)

  // Log session completion
  await logInfo('session.completed', `Session ${sessionId} completed`, {
    sessionId,
    customerId: session.customer_user_id,
    mechanicId: session.mechanic_id,
    metadata: {
      duration_minutes: durationMinutes,
      payout_status: payoutMetadata.status,
      ended_by: isCustomer ? 'customer' : 'mechanic',
    },
  })

  // Track session completion in CRM
  if (session.customer_user_id) {
    void trackInteraction({
      customerId: session.customer_user_id,
      interactionType: 'session_completed',
      sessionId: session.id,
      metadata: {
        duration_minutes: durationMinutes,
        mechanic_id: session.mechanic_id,
        plan: session.plan,
        session_type: session.type,
        ended_by: isCustomer ? 'customer' : 'mechanic',
      },
    })

    // Generate upsell recommendations for this completed session
    void generateUpsellsForSession(session.id)
  }

  // CRITICAL FIX: Create notifications for both participants
  const notifications = []

  if (session.customer_user_id) {
    notifications.push({
      user_id: session.customer_user_id,
      type: 'session_completed',
      payload: {
        session_id: sessionId,
        session_type: session.type,
        ended_by: isCustomer ? 'customer' : 'mechanic',
        duration_minutes: durationMinutes
      }
    })
  }

  if (session.mechanic_id && session.mechanic_id !== session.customer_user_id) {
    notifications.push({
      user_id: session.mechanic_id,
      type: 'session_completed',
      payload: {
        session_id: sessionId,
        session_type: session.type,
        ended_by: isMechanic ? 'mechanic' : 'customer',
        duration_minutes: durationMinutes
      }
    })
  }

  if (notifications.length > 0) {
    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert(notifications)

    if (notificationError) {
      console.error('[end session] Failed to create notifications:', notificationError)
      // Don't fail the request - log and continue
    } else {
      console.log(`[end session] ✓ Created ${notifications.length} notification(s) for session completion`)
    }
  }

  // Broadcast session ended event
  try {
    await supabaseAdmin.channel(`session:${sessionId}`).send({
      type: 'broadcast',
      event: 'session:ended',
      payload: {
        sessionId,
        status: 'completed',
        ended_at: now,
        duration_minutes: durationMinutes,
      },
    })
  } catch (broadcastError) {
    console.error('[end session] Failed to broadcast session:ended', broadcastError)
  }

  // Send session ended email to customer
  try {
    // Fetch customer profile (Supabase auth) if available
    let customerEmail: string | null = null
    let customerName: string | null = null

    if (session.customer_user_id) {
      const { data: customerProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', session.customer_user_id)
        .single()

      customerEmail = customerProfile?.email ?? null
      customerName = customerProfile?.full_name ?? null
    }

    // Fetch mechanic contact info from mechanics table
    let mechanicName: string | null = null
    let mechanicEmail: string | null = null

    if (session.mechanic_id) {
      const { data: mechanicRecord } = await supabaseAdmin
        .from('mechanics')
        .select('name, email')
        .eq('id', session.mechanic_id)
        .single()

      mechanicName = mechanicRecord?.name ?? null
      mechanicEmail = mechanicRecord?.email ?? null
    }

    if (customerEmail) {
      // Format duration for display
      const hours = Math.floor(durationMinutes / 60)
      const minutes = durationMinutes % 60
      const durationStr =
        durationMinutes > 0
          ? hours > 0
            ? `${hours}h ${minutes}m`
            : `${minutes} minutes`
          : 'Duration unavailable'

      await sendSessionEndedEmail({
        customerEmail,
        customerName: customerName || 'Customer',
        mechanicName: mechanicName || mechanicEmail || 'Your Mechanic',
        sessionId,
        duration: durationStr,
        hasSummary: false, // Will be updated when summary is submitted
      })
    }
  } catch (emailError) {
    console.error('[end session] Failed to send session ended email:', emailError)
    // Don't fail the request if email fails
  }

  // CRITICAL FIX: Mark the session_request as completed using parent_session_id
  // This removes it from the mechanic's "new requests" list and tracks successful completion
  // Use parent_session_id for precise matching (avoids marking multiple requests)
  if (session.mechanic_id && session.customer_user_id) {
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('session_requests')
      .update({
        status: 'completed',
        // Note: updated_at column doesn't exist in session_requests table
      })
      .eq('parent_session_id', sessionId)
      .select()

    if (updateError) {
      console.error(`[end session] Failed to update session_request:`, updateError)
    } else if (updatedRequest && updatedRequest.length > 0) {
      console.log(`[end session] Marked session_request ${updatedRequest[0].id} as completed`)
    } else {
      console.warn(`[end session] No session_request found for session ${sessionId}`)
    }
  }
  const responseData = {
    success: true,
    message: 'Session ended successfully',
    session: {
      id: sessionId,
      status: 'completed',
      ended_at: now,
      duration_minutes: durationMinutes,
    },
    payout: payoutMetadata,
  }

  // Always return JSON for API calls
  return NextResponse.json(responseData)
}

