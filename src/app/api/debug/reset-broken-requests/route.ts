import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'

async function getHandler() {
  try {
    // Find any session_requests that have a mechanic_id that doesn't exist in mechanics table
    // or requests that are in a broken state (accepted but no mechanic in sessions)

    // Get all session_requests
    const { data: allRequests, error: fetchError } = await supabaseAdmin
      .from('session_requests')
      .select('id, customer_id, status, mechanic_id, created_at')
      .in('status', ['pending', 'accepted'])

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const broken: any[] = []
    const fixed: any[] = []

    for (const request of allRequests || []) {
      // Check if mechanic_id exists in mechanics table
      if (request.mechanic_id) {
        const { data: mechanic } = await supabaseAdmin
          .from('mechanics')
          .select('id')
          .eq('id', request.mechanic_id)
          .maybeSingle()

        if (!mechanic) {
          // Broken reference - reset to pending
          broken.push(request)

          const { error: resetError } = await supabaseAdmin
            .from('session_requests')
            .update({
              status: 'pending',
              mechanic_id: null,
              accepted_at: null
            })
            .eq('id', request.id)

          if (!resetError) {
            fixed.push(request)
          }
        }
      }
    }

    return NextResponse.json({
      message: `Found ${broken.length} broken request(s), fixed ${fixed.length}`,
      broken,
      fixed,
      total: allRequests?.length || 0
    })
  } catch (error: any) {
    console.error('[reset-broken-requests] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Apply debug authentication wrapper
export const GET = withDebugAuth(getHandler)
