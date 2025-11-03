import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { toSessionRequest } from '@/lib/sessionRequests'
import type { SessionRequestRow } from '@/lib/sessionRequests'
import { broadcastSessionRequest } from '@/lib/realtimeChannels'

const SUPPORTED_SESSION_TYPES = new Set<SessionRequestRow['session_type']>(['chat', 'video', 'diagnostic'])

async function maybeEmailMechanics(row: SessionRequestRow) {
  if (row.notification_sent_at) return

  const apiKey = process.env.RESEND_API_KEY
  const recipients = process.env.REQUEST_ALERT_RECIPIENTS
  if (!apiKey || !recipients) return

  const to = recipients
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)

  if (to.length === 0) return

  try {
    const resend = new Resend(apiKey)
    const sessionLabel =
      row.plan_code === 'chat10'
        ? 'Quick Chat'
        : row.session_type === 'video'
        ? 'Video Session'
        : row.session_type === 'diagnostic'
        ? 'Diagnostic Session'
        : 'Session'
    const previewText = `${row.customer_name ?? 'A customer'} requested a ${sessionLabel}`

    await resend.emails.send({
      from: process.env.REQUEST_ALERT_FROM_EMAIL ?? 'Auto Doctor <notifications@theautodoctor.com>',
      to,
      subject: `New ${sessionLabel} request waiting`,
      text: [
        previewText,
        '',
        `Requested at: ${new Date(row.created_at).toLocaleString('en-US', { timeZone: 'UTC' })} UTC`,
        `Customer: ${row.customer_name ?? 'Customer'}`,
        row.customer_email ? `Email: ${row.customer_email}` : null,
        `Plan code: ${row.plan_code}`,
        '',
        'Sign in to the mechanic dashboard to accept the request.',
      ]
        .filter(Boolean)
        .join('\n'),
    })

    await supabaseAdmin
      .from('session_requests')
      .update({ notification_sent_at: new Date().toISOString() })
      .eq('id', row.id)
  } catch (error) {
    console.error('Failed to send mechanic alert email', error)
  }
}

export async function POST(request: NextRequest) {
  console.log('[CREATE REQUEST] 🎯 Starting request creation...')

  const supabase = getSupabaseServer()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.log('[CREATE REQUEST] ❌ Unauthorized - no user found')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[CREATE REQUEST] ✓ User authenticated:', user.id)

  let payload: any
  try {
    payload = await request.json()
  } catch (error) {
    console.log('[CREATE REQUEST] ❌ Invalid JSON body')
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sessionType = payload?.sessionType
  const planCode = payload?.planCode
  const notes = typeof payload?.notes === 'string' && payload.notes.trim().length > 0 ? payload.notes.trim().slice(0, 1000) : null

  console.log('[CREATE REQUEST] Payload:', { sessionType, planCode, hasNotes: !!notes })

  if (!SUPPORTED_SESSION_TYPES.has(sessionType)) {
    console.log('[CREATE REQUEST] ❌ Unsupported session type:', sessionType)
    return NextResponse.json({ error: 'Unsupported session type' }, { status: 400 })
  }

  if (typeof planCode !== 'string' || planCode.trim().length === 0) {
    console.log('[CREATE REQUEST] ❌ Plan code required')
    return NextResponse.json({ error: 'Plan code is required' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const customerName =
    profile?.full_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? 'Customer'

  console.log('[CREATE REQUEST] Customer name:', customerName)

  // Set expiration time (15 minutes from now)
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + 15)

  console.log('[CREATE REQUEST] 📝 Inserting into database...')

  const { data: inserted, error: insertError } = await supabase
    .from('session_requests')
    .insert({
      customer_id: user.id,
      session_type: sessionType,
      plan_code: planCode,
      notes,
      customer_name: customerName,
      customer_email: user.email ?? null,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (insertError || !inserted) {
    console.error('[CREATE REQUEST] ❌ Failed to create session request:', insertError)
    return NextResponse.json({ error: 'Unable to create session request' }, { status: 500 })
  }

  console.log('[CREATE REQUEST] ✓ Session request created:', inserted.id)

  // Create notification for customer - use 'request_submitted' not 'request_created'
  // 'request_created' is for mechanics receiving new requests
  try {
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'request_submitted',
        payload: {
          request_id: inserted.id,
          session_type: sessionType,
          plan_code: planCode
        }
      })
    console.log('[CREATE REQUEST] ✓ Created request_submitted notification for customer')
  } catch (notifError) {
    console.warn('[CREATE REQUEST] Failed to create notification:', notifError)
  }

  // CRITICAL: Add delay before broadcasting to allow database replication
  // Supabase connection pooler needs time to propagate the write
  await new Promise(resolve => setTimeout(resolve, 3000))
  console.log('[CREATE REQUEST] ⏱️ Waited 3s for database replication')

  console.log('[CREATE REQUEST] 📡 Broadcasting to mechanics...')
  void broadcastSessionRequest('new_request', {
    request: inserted,
  })

  console.log('[CREATE REQUEST] 📧 Sending email notification...')
  void maybeEmailMechanics(inserted)

  console.log('[CREATE REQUEST] 🎉 Request creation complete!', inserted.id)
  return NextResponse.json({ request: toSessionRequest(inserted) }, { status: 201 })
}
