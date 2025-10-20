import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { broadcastSessionRequest, toSessionRequest } from '@/lib/sessionRequests'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = params.id
  if (!requestId || typeof requestId !== 'string') {
    return NextResponse.json({ error: 'Invalid request id' }, { status: 400 })
  }

  const supabase = getSupabaseServer()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'mechanic') {
    return NextResponse.json({ error: 'Mechanic access required' }, { status: 403 })
  }

  const now = new Date().toISOString()

  const { data: accepted, error: updateError } = await supabase
    .from('session_requests')
    .update({ mechanic_id: user.id, status: 'accepted', accepted_at: now })
    .eq('id', requestId)
    .eq('status', 'pending')
    .is('mechanic_id', null)
    .select()
    .maybeSingle()

  if (updateError) {
    console.error('Failed to accept session request', updateError)
    return NextResponse.json({ error: 'Unable to accept request' }, { status: 500 })
  }

  if (!accepted) {
    return NextResponse.json({ error: 'Request already claimed' }, { status: 409 })
  }

  void broadcastSessionRequest('request_accepted', {
    id: accepted.id,
    mechanicId: accepted.mechanic_id,
    mechanicName: profile?.full_name ?? user.email ?? 'Mechanic',
  })

  return NextResponse.json({ request: toSessionRequest(accepted) })
}
