import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { broadcastSessionRequest, toSessionRequest } from '@/lib/sessionRequests'
import type { SessionRequestRow } from '@/lib/sessionRequests'

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
  const supabase = getSupabaseServer()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: any
  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sessionType = payload?.sessionType
  const planCode = payload?.planCode
  const notes = typeof payload?.notes === 'string' && payload.notes.trim().length > 0 ? payload.notes.trim().slice(0, 1000) : null

  if (!SUPPORTED_SESSION_TYPES.has(sessionType)) {
    return NextResponse.json({ error: 'Unsupported session type' }, { status: 400 })
  }

  if (typeof planCode !== 'string' || planCode.trim().length === 0) {
    return NextResponse.json({ error: 'Plan code is required' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const customerName =
    profile?.full_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? 'Customer'

  const { data: inserted, error: insertError } = await supabase
    .from('session_requests')
    .insert({
      customer_id: user.id,
      session_type: sessionType,
      plan_code: planCode,
      notes,
      customer_name: customerName,
      customer_email: user.email ?? null,
    })
    .select()
    .single()

  if (insertError || !inserted) {
    console.error('Failed to create session request', insertError)
    return NextResponse.json({ error: 'Unable to create session request' }, { status: 500 })
  }

  void broadcastSessionRequest('new_request', {
    id: inserted.id,
    customerName: inserted.customer_name ?? 'Customer',
    sessionType: inserted.session_type,
    planCode: inserted.plan_code,
    createdAt: inserted.created_at,
  })
  void maybeEmailMechanics(inserted)

  return NextResponse.json({ request: toSessionRequest(inserted) }, { status: 201 })
}
