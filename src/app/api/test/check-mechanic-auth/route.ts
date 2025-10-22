import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('aad_mech')?.value

    if (!token) {
      return NextResponse.json({
        authenticated: false,
        message: 'No aad_mech cookie found',
        allCookies: cookieStore.getAll().map(c => c.name)
      })
    }

    const { data: session } = await supabaseAdmin
      .from('mechanic_sessions')
      .select('mechanic_id, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: 'Session not found or expired',
        hasToken: true
      })
    }

    const isExpired = new Date(session.expires_at) < new Date()

    const { data: mechanic } = await supabaseAdmin
      .from('mechanics')
      .select('id, name, email')
      .eq('id', session.mechanic_id)
      .maybeSingle()

    return NextResponse.json({
      authenticated: !!mechanic,
      mechanic: mechanic,
      sessionExpired: isExpired,
      expiresAt: session.expires_at
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
