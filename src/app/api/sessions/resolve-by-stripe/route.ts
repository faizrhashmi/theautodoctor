import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  const stripeSessionId = req.nextUrl.searchParams.get('stripe_session_id')
  if (!stripeSessionId) {
    return NextResponse.json({ error: 'Missing stripe_session_id' }, { status: 400 })
  }

  const supabase = getSupabaseServer()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('sessions')
    .select('id, type, plan')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({
    sessionId: data.id,
    type: data.type,
    plan: data.plan,
  })
}
