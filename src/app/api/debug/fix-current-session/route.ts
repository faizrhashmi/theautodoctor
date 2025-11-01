import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'


/**
 * POST /api/debug/fix-current-session
 * Body: { sessionId: string }
 *
 * Fixes session_participants for a given session by ensuring:
 * 1. Customer user_id matches session.customer_user_id
 * 2. Mechanic user_id matches mechanics.user_id (not mechanic.id!)
 */
async function postHandler(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    console.log(`[FIX SESSION] Fixing participants for session ${sessionId}`)

    // Get session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_user_id, mechanic_id, status, type')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({
        error: 'Session not found',
        details: sessionError?.message
      }, { status: 404 })
    }

    const results: string[] = []

    // Get current participants
    const { data: currentParticipants } = await supabaseAdmin
      .from('session_participants')
      .select('user_id, role')
      .eq('session_id', sessionId)

    results.push(`Current participants: ${currentParticipants?.length || 0}`)
    currentParticipants?.forEach(p => {
      results.push(`  - ${p.role}: ${p.user_id}`)
    })

    // Delete all current participants (we'll recreate them correctly)
    const { error: deleteError } = await supabaseAdmin
      .from('session_participants')
      .delete()
      .eq('session_id', sessionId)

    if (deleteError) {
      results.push(`❌ Failed to delete old participants: ${deleteError.message}`)
    } else {
      results.push(`✅ Deleted old participants`)
    }

    // Add customer
    if (session.customer_user_id) {
      const { error: customerError } = await supabaseAdmin
        .from('session_participants')
        .insert({
          session_id: sessionId,
          user_id: session.customer_user_id,
          role: 'customer',
        })

      if (customerError) {
        results.push(`❌ Failed to add customer: ${customerError.message}`)
      } else {
        results.push(`✅ Added customer: ${session.customer_user_id}`)
      }
    }

    // Add mechanic (IMPORTANT: Use mechanics.user_id, not mechanic_id!)
    if (session.mechanic_id) {
      // Get mechanic's auth user_id
      const { data: mechanic, error: mechanicError } = await supabaseAdmin
        .from('mechanics')
        .select('id, user_id, name')
        .eq('id', session.mechanic_id)
        .maybeSingle()

      if (mechanicError || !mechanic) {
        results.push(`❌ Mechanic not found: ${mechanicError?.message}`)
      } else {
        results.push(`Found mechanic: ${mechanic.name} (mechanic.id=${mechanic.id}, user_id=${mechanic.user_id})`)

        if (!mechanic.user_id) {
          results.push(`❌ Mechanic has no user_id! Cannot add as participant.`)
        } else {
          const { error: participantError } = await supabaseAdmin
            .from('session_participants')
            .insert({
              session_id: sessionId,
              user_id: mechanic.user_id, // ← CRITICAL: Use user_id, not mechanic.id!
              role: 'mechanic',
            })

          if (participantError) {
            results.push(`❌ Failed to add mechanic: ${participantError.message}`)
          } else {
            results.push(`✅ Added mechanic: ${mechanic.user_id}`)
          }
        }
      }
    }

    // Get updated participants
    const { data: finalParticipants } = await supabaseAdmin
      .from('session_participants')
      .select('user_id, role')
      .eq('session_id', sessionId)

    results.push(`\nFinal participants: ${finalParticipants?.length || 0}`)
    finalParticipants?.forEach(p => {
      results.push(`  - ${p.role}: ${p.user_id}`)
    })

    return NextResponse.json({
      success: true,
      sessionId,
      session: {
        status: session.status,
        type: session.type,
        customer_user_id: session.customer_user_id,
        mechanic_id: session.mechanic_id,
      },
      log: results,
      participantsBefore: currentParticipants?.length || 0,
      participantsAfter: finalParticipants?.length || 0,
    })
  } catch (error: any) {
    console.error('[FIX SESSION] Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

// P0-1 FIX: Protect debug endpoint with authentication
export const POST = withDebugAuth(postHandler)
