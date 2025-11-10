/**
 * Relaxed Session Authentication
 *
 * This module provides a more lenient authentication approach for session operations
 * that don't rely solely on Supabase auth cookies. It's designed specifically for
 * operations like ending a session where auth cookie propagation can be unreliable.
 *
 * Security Model:
 * - Primary: Try Supabase auth (standard method)
 * - Fallback: Validate session exists and has participants
 * - Allow operation if session is valid and in proper state
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface RelaxedSessionParticipant {
  userId: string | null  // Null if we can't determine from auth
  sessionId: string
  role: 'customer' | 'mechanic' | 'unknown'
  mechanicId?: string
  source: 'supabase_auth' | 'session_participants' | 'fallback'
}

/**
 * Relaxed authentication for session operations
 *
 * This function tries multiple approaches to authenticate:
 * 1. Standard Supabase auth (primary)
 * 2. Session participants validation (fallback)
 * 3. Basic session existence check (last resort)
 *
 * @param req - Next.js request object
 * @param sessionId - The session ID to validate
 * @returns Participant data or error response
 */
export async function requireSessionParticipantRelaxed(
  req: NextRequest,
  sessionId: string
): Promise<
  | { data: RelaxedSessionParticipant; error: null }
  | { data: null; error: NextResponse }
> {
  console.log(`[Relaxed Auth] Attempting auth for session ${sessionId}`)

  // ============================================================================
  // APPROACH 1: Try Standard Supabase Auth (PREFERRED)
  // ============================================================================

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (user && !authError) {
    console.log(`[Relaxed Auth] ✓ Supabase auth successful for user ${user.id}`)

    // Fetch session to validate
    const { data: sessionsData } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_user_id, mechanic_id')
      .eq('id', sessionId)
      .maybeSingle()

    let session: any = null
    if (sessionsData) {
      session = sessionsData
    } else {
      // Try diagnostic_sessions
      const { data: diagnosticData } = await supabaseAdmin
        .from('diagnostic_sessions')
        .select('id, customer_id as customer_user_id, mechanic_id')
        .eq('id', sessionId)
        .maybeSingle()

      if (diagnosticData) {
        session = diagnosticData
      }
    }

    if (!session) {
      console.error(`[Relaxed Auth] Session ${sessionId} not found`)
      return {
        data: null,
        error: NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        ),
      }
    }

    // Check if user is customer
    if (session.customer_user_id === user.id) {
      console.log(`[Relaxed Auth] ✓ User is customer (via Supabase auth)`)
      return {
        data: {
          userId: user.id,
          sessionId: session.id,
          role: 'customer',
          source: 'supabase_auth',
        },
        error: null,
      }
    }

    // Check if user is mechanic
    // IMPORTANT: sessions.mechanic_id references auth.users(id), not mechanics.id
    if (session.mechanic_id === user.id) {
      console.log(`[Relaxed Auth] ✓ User is mechanic (via Supabase auth - direct match)`)

      // Get mechanic profile for additional info
      const { data: mechanic } = await supabaseAdmin
        .from('mechanics')
        .select('id, user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      return {
        data: {
          userId: user.id,
          sessionId: session.id,
          role: 'mechanic',
          mechanicId: mechanic?.id,
          source: 'supabase_auth',
        },
        error: null,
      }
    }

    console.warn(`[Relaxed Auth] User ${user.id} authenticated but not a participant`)
    // Don't fail yet, try fallback methods
  } else {
    console.log(`[Relaxed Auth] Supabase auth failed or no user:`, authError?.message || 'No user')
  }

  // ============================================================================
  // APPROACH 2: Validate via Session Participants Table (FALLBACK)
  // ============================================================================

  console.log(`[Relaxed Auth] Trying fallback: session_participants table`)

  // Fetch session
  const { data: sessionsData } = await supabaseAdmin
    .from('sessions')
    .select('id, status, customer_user_id, mechanic_id')
    .eq('id', sessionId)
    .maybeSingle()

  let session: any = null
  if (sessionsData) {
    session = sessionsData
  } else {
    // Try diagnostic_sessions
    const { data: diagnosticData } = await supabaseAdmin
      .from('diagnostic_sessions')
      .select('id, status, customer_id as customer_user_id, mechanic_id')
      .eq('id', sessionId)
      .maybeSingle()

    if (diagnosticData) {
      session = diagnosticData
    }
  }

  if (!session) {
    console.error(`[Relaxed Auth] Session ${sessionId} not found in fallback`)
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      ),
    }
  }

  // Check session_participants table
  const { data: participants, error: participantsError } = await supabaseAdmin
    .from('session_participants')
    .select('user_id, role')
    .eq('session_id', sessionId)

  if (participantsError) {
    console.error(`[Relaxed Auth] Error fetching participants:`, participantsError)
  }

  console.log(`[Relaxed Auth] Session participants count: ${participants?.length || 0}`)

  // If session has participants, it's valid
  if (participants && participants.length > 0) {
    console.log(`[Relaxed Auth] ✓ Session has ${participants.length} participant(s)`)

    // Try to determine role from session data
    let role: 'customer' | 'mechanic' | 'unknown' = 'unknown'
    let userId: string | null = null
    let mechanicId: string | undefined = undefined

    // If we have user from earlier auth attempt, match them
    if (user) {
      const participant = participants.find(p => p.user_id === user.id)
      if (participant) {
        role = participant.role as 'customer' | 'mechanic'
        userId = user.id

        if (role === 'mechanic' && session.mechanic_id) {
          mechanicId = session.mechanic_id
        }

        console.log(`[Relaxed Auth] ✓ Matched user to participant role: ${role}`)
      }
    }

    // If still unknown, default to customer if they have customer_user_id
    if (role === 'unknown' && session.customer_user_id) {
      role = 'customer'
      userId = session.customer_user_id
      console.log(`[Relaxed Auth] ℹ️ Defaulting to customer role`)
    }

    // Last resort: use mechanic if present
    if (role === 'unknown' && session.mechanic_id) {
      role = 'mechanic'
      mechanicId = session.mechanic_id
      // Try to get mechanic user_id
      const { data: mechanic } = await supabaseAdmin
        .from('mechanics')
        .select('user_id')
        .eq('id', session.mechanic_id)
        .maybeSingle()

      if (mechanic) {
        userId = mechanic.user_id
      }
      console.log(`[Relaxed Auth] ℹ️ Defaulting to mechanic role`)
    }

    return {
      data: {
        userId,
        sessionId: session.id,
        role,
        mechanicId,
        source: 'session_participants',
      },
      error: null,
    }
  }

  // ============================================================================
  // APPROACH 3: Basic Session Existence (LAST RESORT)
  // ============================================================================

  console.log(`[Relaxed Auth] Trying last resort: basic session validation`)

  // If session exists and is in a valid state, allow the operation
  const validStatuses = ['pending', 'waiting', 'live', 'scheduled']
  if (validStatuses.includes(session.status)) {
    console.warn(`[Relaxed Auth] ⚠️ Allowing operation based on session existence (no participants found)`)

    // Default to customer role
    return {
      data: {
        userId: session.customer_user_id || null,
        sessionId: session.id,
        role: 'customer',
        source: 'fallback',
      },
      error: null,
    }
  }

  // ============================================================================
  // COMPLETE FAILURE
  // ============================================================================

  console.error(`[Relaxed Auth] ❌ All auth methods failed for session ${sessionId}`)
  return {
    data: null,
    error: NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Could not verify session access',
        sessionId,
      },
      { status: 403 }
    ),
  }
}
