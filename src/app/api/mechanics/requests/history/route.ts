import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

async function getMechanicFromCookie(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('aad_mech')?.value

  if (!token) return null

  const { data: session } = await supabaseAdmin
    .from('mechanic_sessions')
    .select('mechanic_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!session) return null

  const { data: mechanic } = await supabaseAdmin
    .from('mechanics')
    .select('id, name, email')
    .eq('id', session.mechanic_id)
    .maybeSingle()

  return mechanic
}

export async function GET(req: NextRequest) {
  const mechanic = await getMechanicFromCookie(req)

  if (!mechanic) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch request history (accepted and cancelled requests)
  const { data: history, error } = await supabaseAdmin
    .from('session_requests')
    .select('*')
    .eq('mechanic_id', mechanic.id)
    .in('status', ['accepted', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Failed to fetch request history', error)
    return NextResponse.json({ error: 'Unable to fetch history' }, { status: 500 })
  }

  return NextResponse.json({ history: history || [] })
}
