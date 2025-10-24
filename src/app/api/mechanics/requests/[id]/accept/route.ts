import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const requestId = params.id

  // Assign the request to the current mechanic if it's still unassigned & pending
  const { error } = await supabase
    .from('session_requests')
    .update({ mechanic_id: user.id, status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', requestId)
    .is('mechanic_id', null)
    .in('status', ['pending','unattended'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
