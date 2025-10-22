import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Emergency endpoint to force-cancel a specific stuck session
 *
 * Usage: POST /api/debug/force-cancel-session
 * Body: { "sessionId": "c35420d9-88ce-4fb0-a7c4-9b10a580ba3d" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    console.log(`[force-cancel] Cancelling session: ${sessionId}`)

    // Cancel the session
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('[force-cancel] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[force-cancel] Successfully cancelled session ${sessionId}`)

    return NextResponse.json({
      success: true,
      message: `Session ${sessionId} cancelled`,
      session: data,
    })
  } catch (error: any) {
    console.error('[force-cancel] Exception:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * GET endpoint to check session status
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ session: data })
}
