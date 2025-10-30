import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/debug/fix-session-participants?sessionId=xxx
 *
 * Adds missing participants to a session that has mechanic_id and customer_user_id
 * but no entries in session_participants table.
 *
 * This fixes old sessions created before the participant fix was implemented.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    console.log(`[FIX-PARTICIPANTS] Fixing session ${sessionId}`)

    // Get session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, mechanic_id, customer_user_id, status, type')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({
        error: 'Session not found',
        details: sessionError?.message
      }, { status: 404 })
    }

    // Check current participants
    const { data: existingParticipants } = await supabaseAdmin
      .from('session_participants')
      .select('user_id, role')
      .eq('session_id', sessionId)

    const hasCustomer = existingParticipants?.some(p => p.role === 'customer')
    const hasMechanic = existingParticipants?.some(p => p.role === 'mechanic')

    const results = {
      sessionId: session.id,
      status: session.status,
      type: session.type,
      existingParticipants: existingParticipants?.length || 0,
      actions: [] as string[],
    }

    // Add customer if missing
    if (!hasCustomer && session.customer_user_id) {
      const { error: customerError } = await supabaseAdmin
        .from('session_participants')
        .upsert(
          {
            session_id: sessionId,
            user_id: session.customer_user_id,
            role: 'customer',
          },
          { onConflict: 'session_id,user_id' }
        )

      if (customerError) {
        console.error('[FIX-PARTICIPANTS] Failed to add customer:', customerError)
        results.actions.push(`❌ Failed to add customer: ${customerError.message}`)
      } else {
        console.log('[FIX-PARTICIPANTS] ✓ Added customer as participant')
        results.actions.push('✅ Added customer as participant')
      }
    } else if (hasCustomer) {
      results.actions.push('ℹ️ Customer already a participant')
    } else {
      results.actions.push('⚠️ No customer_user_id on session')
    }

    // Add mechanic if missing
    if (!hasMechanic && session.mechanic_id) {
      const { error: mechanicError } = await supabaseAdmin
        .from('session_participants')
        .upsert(
          {
            session_id: sessionId,
            user_id: session.mechanic_id,
            role: 'mechanic',
          },
          { onConflict: 'session_id,user_id' }
        )

      if (mechanicError) {
        console.error('[FIX-PARTICIPANTS] Failed to add mechanic:', mechanicError)
        results.actions.push(`❌ Failed to add mechanic: ${mechanicError.message}`)
      } else {
        console.log('[FIX-PARTICIPANTS] ✓ Added mechanic as participant')
        results.actions.push('✅ Added mechanic as participant')
      }
    } else if (hasMechanic) {
      results.actions.push('ℹ️ Mechanic already a participant')
    } else {
      results.actions.push('⚠️ No mechanic_id on session')
    }

    // Get updated participants count
    const { data: finalParticipants } = await supabaseAdmin
      .from('session_participants')
      .select('user_id, role')
      .eq('session_id', sessionId)

    return NextResponse.json({
      success: true,
      ...results,
      finalParticipants: finalParticipants?.length || 0,
      participants: finalParticipants,
    })
  } catch (error: any) {
    console.error('[FIX-PARTICIPANTS] Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
