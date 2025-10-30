import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Get a completed session with its request
    const sessionId = '1ae55168-3b0c-484a-82ae-433ccc8b5dcd' // From above data

    const { data: session, error: sessError } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_user_id, mechanic_id, status')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessError || !session) {
      return NextResponse.json({ error: 'Session not found', details: sessError }, { status: 404 })
    }

    // Get the request
    const { data: request, error: reqError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('parent_session_id', sessionId)
      .maybeSingle()

    if (reqError || !request) {
      return NextResponse.json({ error: 'Request not found', details: reqError }, { status: 404 })
    }

    // Test the query that end/route.ts uses
    console.log('[TEST] Testing update query with:')
    console.log('[TEST] customer_id:', session.customer_user_id)
    console.log('[TEST] mechanic_id:', session.mechanic_id)
    console.log('[TEST] Request customer_id:', request.customer_id)
    console.log('[TEST] Request mechanic_id:', request.mechanic_id)

    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('session_requests')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', session.customer_user_id)
      .eq('mechanic_id', session.mechanic_id)
      .in('status', ['pending', 'accepted', 'unattended'])
      .select()

    return NextResponse.json({
      session: {
        id: session.id,
        customer_user_id: session.customer_user_id,
        mechanic_id: session.mechanic_id,
        status: session.status,
      },
      request: {
        id: request.id,
        customer_id: request.customer_id,
        mechanic_id: request.mechanic_id,
        status: request.status,
        parent_session_id: request.parent_session_id,
      },
      match_check: {
        customer_match: session.customer_user_id === request.customer_id,
        mechanic_match: session.mechanic_id === request.mechanic_id,
      },
      update_result: {
        rows_updated: updateResult?.length || 0,
        error: updateError?.message || null,
        updated_requests: updateResult,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
