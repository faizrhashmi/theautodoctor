/**
 * G1: SESSION TIMELINE API
 *
 * GET /api/admin/sessions/[id]/timeline
 *
 * Returns a complete timeline for a session including:
 * - All structured logs
 * - Status changes
 * - Payment events
 * - Refunds and claims
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = params.id

  try {
    // 1. Fetch session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // 2. Fetch all logs for this session
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('session_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (logsError) {
      console.error('[timeline] Error fetching logs:', logsError)
    }

    // 3. Fetch payment intents
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payment_intents')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (paymentsError) {
      console.error('[timeline] Error fetching payments:', paymentsError)
    }

    // 4. Fetch refunds
    const { data: refunds, error: refundsError } = await supabaseAdmin
      .from('refunds')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (refundsError) {
      console.error('[timeline] Error fetching refunds:', refundsError)
    }

    // 5. Fetch satisfaction claims
    const { data: claims, error: claimsError } = await supabaseAdmin
      .from('satisfaction_claims')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (claimsError) {
      console.error('[timeline] Error fetching claims:', claimsError)
    }

    // 6. Merge all events into a unified timeline
    const timeline: any[] = []

    // Add logs
    if (logs) {
      logs.forEach((log) => {
        timeline.push({
          type: 'log',
          timestamp: log.created_at,
          level: log.level,
          event: log.event,
          message: log.message,
          metadata: log.metadata,
          data: log,
        })
      })
    }

    // Add status changes (derived from session data)
    if (session.created_at) {
      timeline.push({
        type: 'status_change',
        timestamp: session.created_at,
        status: 'created',
        message: 'Session created',
      })
    }

    if (session.started_at) {
      timeline.push({
        type: 'status_change',
        timestamp: session.started_at,
        status: 'live',
        message: 'Session started',
      })
    }

    if (session.ended_at) {
      timeline.push({
        type: 'status_change',
        timestamp: session.ended_at,
        status: session.status,
        message: `Session ended (${session.status})`,
      })
    }

    // Add payment events
    if (payments) {
      payments.forEach((payment) => {
        timeline.push({
          type: 'payment',
          timestamp: payment.created_at,
          event: payment.status,
          message: `Payment ${payment.status}: ${payment.amount_cents / 100} ${payment.currency}`,
          data: payment,
        })
      })
    }

    // Add refund events
    if (refunds) {
      refunds.forEach((refund) => {
        timeline.push({
          type: 'refund',
          timestamp: refund.created_at,
          event: refund.status,
          message: `Refund ${refund.status}: ${refund.amount_cents / 100} ${refund.currency} (${refund.reason})`,
          data: refund,
        })
      })
    }

    // Add claim events
    if (claims) {
      claims.forEach((claim) => {
        timeline.push({
          type: 'claim',
          timestamp: claim.created_at,
          event: claim.status,
          message: `Satisfaction claim ${claim.status}`,
          data: claim,
        })
      })
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return NextResponse.json({
      session,
      timeline,
      stats: {
        total_events: timeline.length,
        logs: logs?.length || 0,
        payments: payments?.length || 0,
        refunds: refunds?.length || 0,
        claims: claims?.length || 0,
      },
    })
  } catch (error: any) {
    console.error('[timeline] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch timeline',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
