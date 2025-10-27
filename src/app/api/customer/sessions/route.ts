import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: NextRequest) {
  try {
    const supabaseClient = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Fetch all sessions for this customer
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        type,
        status,
        plan,
        created_at,
        ended_at,
        metadata
      `)
      .eq('customer_user_id', user.id)
      .order('created_at', { ascending: false })

    if (sessionsError) {
      console.error('Sessions fetch error:', sessionsError)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    // Get mechanic names for sessions that have mechanics assigned
    const sessionIds = sessions?.map(s => s.id) || []
    const { data: participants } = await supabaseAdmin
      .from('session_participants')
      .select('session_id, user_id, role')
      .in('session_id', sessionIds)
      .eq('role', 'mechanic')

    // Get mechanic profiles
    const mechanicIds = participants?.map(p => p.user_id) || []
    const { data: mechanics } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', mechanicIds)

    // Map mechanic names to sessions
    const mechanicsMap = new Map(mechanics?.map(m => [m.id, m.full_name]) || [])
    const participantsMap = new Map(participants?.map(p => [p.session_id, p.user_id]) || [])

    // Format sessions with mechanic names and pricing
    const formattedSessions = sessions?.map(session => {
      const mechanicId = participantsMap.get(session.id)
      const mechanicName = mechanicId ? mechanicsMap.get(mechanicId) : null

      // Determine price based on plan
      const priceMap: Record<string, number> = {
        free: 0,
        trial: 0,
        quick: 9.99,
        chat10: 9.99,
        standard: 29.99,
        video15: 29.99,
        diagnostic: 49.99,
      }

      return {
        id: session.id,
        type: session.type,
        status: session.status,
        mechanic_name: mechanicName || 'Waiting for assignment',
        plan: session.plan || 'free',
        created_at: session.created_at,
        completed_at: session.ended_at,
        price: priceMap[session.plan || 'free'] || 0,
      }
    }) || []

    return NextResponse.json({
      sessions: formattedSessions,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
