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
import { getSessionPaymentDestination } from '@/types/mechanic'

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

  // === EARLY STATE PATCH (must run before any long work) ===
  const now = new Date().toISOString()

  // A) Complete the session if it's active
  const { error: sErr } = await supabaseAdmin
    .from('sessions')
    .update({
      status: 'completed',
      ended_at: now
    })
    .eq('id', sessionId)
    .in('status', ['waiting','live']) // only end active sessions

  if (sErr) {
    console.error('[end-session] session state patch failed', sErr)
    return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 })
  }

  // B) End any open assignment rows so they drop from the mechanic queue
  // IMPORTANT: use 'ended' for end-of-session; keep 'cancelled' only for cancel flows
  const { data: assignments, error: aSelErr } = await supabaseAdmin
    .from('session_assignments')
    .select('id, metadata')
    .eq('session_id', sessionId)

  if (aSelErr) {
    console.error('[end-session] assignment select failed', aSelErr)
  } else if (assignments && assignments.length > 0) {
    const { error: aUpdErr } = await supabaseAdmin
      .from('session_assignments')
      .update({
        status: 'ended',
        updated_at: now,
        metadata: {
          ...(assignments[0]?.metadata ?? {}),
          completed_at: now,
          final_session_status: 'completed',
          completion_reason: 'session_ended'
        }
      })
      .eq('session_id', sessionId)
      .in('status', ['accepted','joined','in_progress','queued','pending'])

    if (aUpdErr) {
      console.error('[end-session] assignment state patch failed', aUpdErr)
      // do not return 500; state for the session is already correct
    }
  }
  // === END EARLY STATE PATCH ===

  // Determine role from participant data
  const isCustomer = participant.role === 'customer'
  const isMechanic = participant.role === 'mechanic'

  // Use the new semantic function to intelligently end the session
  console.log(`[end session] Calling end_session_with_semantics for session ${sessionId}`)

  const { data: semanticResult, error: semanticError } = await supabaseAdmin
    .rpc('end_session_with_semantics', {
      p_actor_role: participant.role,
      p_reason: 'user_ended',
      p_session_id: sessionId
    })

  if (semanticError) {
    console.error('[end session] Semantic function error:', semanticError)
    return NextResponse.json({ error: 'Failed to end session', details: semanticError.message }, { status: 500 })
  }

  // Extract result from JSONB response
  const result = semanticResult as { final_status: string; started: boolean; duration_seconds: number; message: string }
  const { final_status, started, duration_seconds, message } = result || {}

  console.log(`[end session] Semantic result:`, {
    final_status,
    started,
    duration_seconds,
    message
  })

  // Refresh session data after semantic update
  const { data: updatedSession } = sessionTable === 'sessions'
    ? await supabaseAdmin
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
    : await supabaseAdmin
        .from('diagnostic_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

  const durationMinutes = Math.max(1, Math.round((duration_seconds || 0) / 60))

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

  // Attempt Stripe transfer if mechanic has connected account AND session was completed (not cancelled)
  if (session.mechanic_id && mechanicEarningsCents > 0 && final_status === 'completed' && started) {
    try {
      // Fetch mechanic with workshop data for payment routing
      const { data: mechanic } = await supabaseAdmin
        .from('mechanics')
        .select(`
          id,
          name,
          stripe_account_id,
          stripe_payouts_enabled,
          workshop_id,
          account_type,
          service_tier,
          partnership_type,
          organizations!inner(
            id,
            name,
            stripe_account_id,
            stripe_payouts_enabled
          )
        `)
        .eq('id', session.mechanic_id)
        .single()

      // Fallback to profiles table (Supabase auth system) if not found in mechanics
      const { data: profile } = !mechanic ? await supabaseAdmin
        .from('profiles')
        .select('stripe_account_id, stripe_payouts_enabled, full_name')
        .eq('id', session.mechanic_id)
        .single() : { data: null }

      if (mechanic) {
        // Use smart payment routing for mechanics (handles workshop-affiliated vs independent)
        const paymentDestination = getSessionPaymentDestination(mechanic)

        if (paymentDestination.accountId && mechanic.stripe_payouts_enabled) {
          // Create Stripe transfer to correct destination (mechanic OR workshop)
          const transfer = await stripe.transfers.create({
            amount: mechanicEarningsCents,
            currency: 'usd',
            destination: paymentDestination.accountId,
            description: `Session ${sessionId} - ${session.type} (${session.plan}) - ${paymentDestination.payeeName}`,
            metadata: {
              session_id: sessionId,
              mechanic_id: session.mechanic_id,
              plan: session.plan,
              session_type: session.type,
              payee_type: paymentDestination.type,
              mechanic_type: paymentDestination.context.mechanic_type,
              workshop_id: paymentDestination.context.workshop_id || '',
            },
          })

          payoutMetadata = {
            ...payoutMetadata,
            status: 'transferred',
            transfer_id: transfer.id,
            destination_account: paymentDestination.accountId,
            transferred_at: now,
            mechanic_name: mechanic.name,
            payee_type: paymentDestination.type,
            payee_name: paymentDestination.payeeName,
            mechanic_type: paymentDestination.context.mechanic_type,
          }

          console.log(
            `[end session] Stripe transfer created: ${transfer.id} for ${mechanicEarningsCents / 100} USD to ${paymentDestination.payeeName} (${paymentDestination.type})`
          )
        } else {
          payoutMetadata = {
            ...payoutMetadata,
            status: 'pending_stripe_connection',
            message: `${paymentDestination.payeeName} needs to complete Stripe Connect onboarding`,
          }

          console.warn(`⚠️ ${paymentDestination.payeeName} not connected to Stripe - payout pending`)
        }
      } else if (profile?.stripe_account_id && profile.stripe_payouts_enabled) {
        // Fallback: profile-based mechanic (legacy auth system)
        const transfer = await stripe.transfers.create({
          amount: mechanicEarningsCents,
          currency: 'usd',
          destination: profile.stripe_account_id,
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
          destination_account: profile.stripe_account_id,
          transferred_at: now,
          mechanic_name: profile.full_name || 'Mechanic',
        }

        console.log(
          `[end session] Stripe transfer created (profile): ${transfer.id} for ${mechanicEarningsCents / 100} USD`
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
  if (final_status === 'completed' && started && planPrice > 0) {
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

  // Update session metadata with payout information (status already set by semantic function)
  const existingMetadata = (updatedSession?.metadata || {}) as Record<string, any>
  const metadataUpdate = {
    updated_at: now,
    metadata: {
      ...existingMetadata,
      payout: payoutMetadata,
    },
  }

  // Update only metadata (status already set by semantic function)
  const { error: metadataError } = sessionTable === 'sessions'
    ? await supabaseAdmin
        .from('sessions')
        .update(metadataUpdate)
        .eq('id', sessionId)
    : await supabaseAdmin
        .from('diagnostic_sessions')
        .update(metadataUpdate)
        .eq('id', sessionId)

  if (metadataError) {
    console.warn(`[end session] Failed to update payout metadata:`, metadataError)
    // Don't fail the request - this is non-critical
  }

  console.log(`[end session] Session ${sessionId} ended with status: ${final_status}`)

  // Log session end with correct semantic status
  const logEvent = final_status === 'completed' ? 'session.completed' : 'session.cancelled'
  const logMessage = final_status === 'completed'
    ? `Session ${sessionId} completed (${duration_seconds}s)`
    : `Session ${sessionId} cancelled (pre-start or insufficient duration)`

  await logInfo(logEvent, logMessage, {
    sessionId,
    customerId: session.customer_user_id,
    mechanicId: session.mechanic_id,
    metadata: {
      final_status,
      started,
      duration_seconds,
      duration_minutes: durationMinutes,
      payout_status: payoutMetadata.status,
      ended_by: isCustomer ? 'customer' : 'mechanic',
    },
  })

  // Additional event already logged by semantic function, but log payout info
  await supabaseAdmin.from('session_events').insert({
    session_id: sessionId,
    event_type: 'ended', // Using 'ended' as event type
    user_id: session.mechanic_id,
    mechanic_id: session.mechanic_id,
    metadata: {
      payout_processed: true,
      payout_status: payoutMetadata.status,
      amount_cents: mechanicEarningsCents,
      final_status,
      duration_minutes: durationMinutes
    }
  })

  // Generate session summary (async, non-blocking) - only for completed sessions
  if (final_status === 'completed' && started && durationMinutes > 0) {
    const { createSessionSummary } = await import('@/lib/session/summaryGenerator')
    createSessionSummary(sessionId, session.type as 'chat' | 'video')
      .then((success) => {
        if (success) {
          console.log(`[end session] ✓ Summary generated for session ${sessionId}`)
        }
      })
      .catch((err) => {
        console.error('[end session] Summary generation failed:', err)
      })
  }

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

  // CRITICAL FIX: Create notifications for both participants with correct semantic type
  const notifications = []
  const notificationType = final_status === 'completed' ? 'session_completed' : 'session_cancelled'

  if (session.customer_user_id) {
    notifications.push({
      user_id: session.customer_user_id,
      type: notificationType,
      payload: {
        session_id: sessionId,
        session_type: session.type,
        ended_by: isCustomer ? 'customer' : 'mechanic',
        duration_minutes: durationMinutes,
        final_status,
        started
      }
    })
  }

  if (session.mechanic_id && session.mechanic_id !== session.customer_user_id) {
    notifications.push({
      user_id: session.mechanic_id,
      type: notificationType,
      payload: {
        session_id: sessionId,
        session_type: session.type,
        ended_by: isMechanic ? 'mechanic' : 'customer',
        duration_minutes: durationMinutes,
        final_status,
        started
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

  // Broadcast session ended event with correct semantic status
  // IMPORTANT: Chat uses 'session-{id}', Video uses 'session:{id}'
  try {
    const channelName = session.type === 'chat'
      ? `session-${sessionId}`
      : `session:${sessionId}`

    await supabaseAdmin.channel(channelName).send({
      type: 'broadcast',
      event: 'session:ended',
      payload: {
        sessionId,
        status: final_status,
        ended_at: now,
        duration_minutes: durationMinutes,
        duration_seconds,
        started,
        endedBy: isCustomer ? 'customer' : 'mechanic',
      },
    })
    console.log(`[end session] Broadcast sent to ${channelName} with status: ${final_status}`)

    // ✅ CRITICAL FIX: Also broadcast to active-sessions-updates channel
    // This ensures ActiveSessionsManager immediately removes the session from display
    await supabaseAdmin.channel('active-sessions-updates').send({
      type: 'broadcast',
      event: 'session_completed', // Event name stays same for UI compatibility
      payload: {
        session_id: sessionId,
        status: final_status,
        ended_at: now,
        duration_minutes: durationMinutes,
        started,
      },
    })
    console.log(`[end session] ✓ Broadcast sent to active-sessions-updates channel with status: ${final_status}`)
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

  // CRITICAL FIX: Mark the session_request with the correct semantic status
  // completed if session started and was billable, cancelled if pre-start or too short
  if (session.mechanic_id && session.customer_user_id) {
    const requestStatus = final_status === 'completed' ? 'completed' : 'cancelled'

    // First try: Match by parent_session_id (most precise)
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('session_requests')
      .update({
        status: requestStatus,
      })
      .eq('parent_session_id', sessionId)
      .select()

    if (updateError) {
      console.error(`[end session] Failed to update session_request:`, updateError)
    } else if (updatedRequest && updatedRequest.length > 0) {
      console.log(`[end session] Marked session_request ${updatedRequest[0].id} as ${requestStatus} (via parent_session_id)`)
    } else {
      // FALLBACK: If parent_session_id didn't match (null or not set), try matching by customer + mechanic + status
      console.warn(`[end session] No session_request found with parent_session_id ${sessionId}, trying fallback...`)

      const { data: fallbackRequest, error: fallbackError } = await supabaseAdmin
        .from('session_requests')
        .update({
          status: requestStatus,
        })
        .eq('customer_id', session.customer_user_id)
        .eq('mechanic_id', session.mechanic_id)
        .in('status', ['pending', 'accepted']) // Only update active requests
        .order('created_at', { ascending: false }) // Get most recent
        .limit(1)
        .select()

      if (fallbackError) {
        console.error(`[end session] Fallback update failed:`, fallbackError)
      } else if (fallbackRequest && fallbackRequest.length > 0) {
        console.log(`[end session] ✓ Marked session_request ${fallbackRequest[0].id} as ${requestStatus} (via fallback)`)
      } else {
        console.warn(`[end session] No matching session_request found for customer ${session.customer_user_id} and mechanic ${session.mechanic_id}`)
      }
    }
  }

  // Build response with correct semantic status
  const responseMessage = final_status === 'completed'
    ? 'Session completed successfully'
    : 'Session cancelled (did not start or insufficient duration)'

  const responseData = {
    success: true,
    message: responseMessage,
    session: {
      id: sessionId,
      status: final_status,
      ended_at: now,
      duration_minutes: durationMinutes,
      duration_seconds,
      started,
    },
    payout: final_status === 'completed' ? payoutMetadata : { status: 'no_payout', message: 'Session cancelled before completion' },
    semantic_result: {
      final_status,
      started,
      duration_seconds,
      message
    }
  }

  // Always return JSON for API calls
  return NextResponse.json(responseData)
}

