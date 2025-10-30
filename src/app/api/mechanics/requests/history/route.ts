import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireMechanicAPI } from '@/lib/auth/guards'

export async function GET(req: NextRequest) {
  // ✅ SECURITY: Require mechanic authentication
  const authResult = await requireMechanicAPI(req)
  if (authResult.error) return authResult.error

  const mechanic = authResult.data

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
