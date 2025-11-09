/**
 * Session RFQ Status API
 *
 * GET: Check if an RFQ has been created for this diagnostic session
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id
    const supabase = getSupabaseServer()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get mechanic profile
    const { data: mechanic, error: mechanicError } = await supabase
      .from('mechanics')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (mechanicError || !mechanic) {
      return NextResponse.json({ error: 'Mechanic profile not found' }, { status: 403 })
    }

    // Verify mechanic owns this session
    const { data: session, error: sessionError } = await supabase
      .from('diagnostic_sessions')
      .select('id, mechanic_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.mechanic_id !== mechanic.id) {
      return NextResponse.json({ error: 'Unauthorized - not your session' }, { status: 403 })
    }

    // Check if RFQ exists for this session
    const { data: rfq, error: rfqError } = await supabase
      .from('workshop_rfq_marketplace')
      .select('id, title, rfq_status, created_at, escalating_mechanic_id')
      .eq('diagnostic_session_id', sessionId)
      .eq('escalating_mechanic_id', mechanic.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (rfqError) {
      console.error('[RFQ Status] Error:', rfqError)
      return NextResponse.json({ error: 'Failed to check RFQ status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      has_rfq: !!rfq,
      rfq: rfq || null
    })

  } catch (error) {
    console.error('[RFQ Status] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
