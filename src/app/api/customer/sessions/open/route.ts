import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Returns the user's most recent *open* session (pending|waiting|live) regardless
 * of which column your schema uses to reference the user. Falls back to session_requests.
 */
export async function GET() {
  const supabase = createClient(cookies())
  const admin = supabaseAdmin

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ active: false, session: null })

  const ACTIVE = ['pending', 'waiting', 'live'] as const

  // --- Strategy 1: direct session ownership via multiple possible columns
  // (We OR across likely columns to avoid schema drift issues.)
  const orExpr = [
    `customer_id.eq.${user.id}`,
    `customer_user_id.eq.${user.id}`,
    `requester_id.eq.${user.id}`,
    `created_by.eq.${user.id}`
  ].join(',')

  const { data: s1 } = await admin
    .from('sessions')
    .select('id,type,status,plan,created_at,started_at,ended_at,scheduled_start')
    .or(orExpr)
    .is('ended_at', null)
    .in('status', ACTIVE)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (s1) {
    return NextResponse.json({
      active: true,
      session: {
        id: s1.id,
        type: s1.type,
        status: s1.status,
        plan: s1.plan,
        createdAt: s1.created_at,
        startedAt: s1.started_at,
        mechanicName: null,
        customerName: null
      },
      hasActiveSessions: true
    })
  }

  // --- Strategy 2 (fallback): resolve through session_requests if present
  // Pick the newest request still "open-ish", then hydrate its session.
  const { data: req } = await admin
    .from('session_requests')
    .select('session_id, status, user_id, created_at')
    .eq('user_id', user.id)
    .not('status', 'in', '("completed","cancelled")')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (req?.session_id) {
    const { data: s2 } = await admin
      .from('sessions')
      .select('id,type,status,plan,created_at,started_at,ended_at,scheduled_start')
      .eq('id', req.session_id)
      .is('ended_at', null)
      .in('status', ACTIVE)
      .maybeSingle()

    if (s2) {
      return NextResponse.json({
        active: true,
        session: {
          id: s2.id,
          type: s2.type,
          status: s2.status,
          plan: s2.plan,
          createdAt: s2.created_at,
          startedAt: s2.started_at,
          mechanicName: null,
          customerName: null
        },
        hasActiveSessions: true
      })
    }
  }

  return NextResponse.json({ active: false, session: null, hasActiveSessions: false })
}
