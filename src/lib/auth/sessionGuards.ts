/**
 * Session Participant Validation Guards
 *
 * These functions ensure that only authorized participants
 * (customer or mechanic) can access session endpoints.
 *
 * @module auth/sessionGuards
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface SessionParticipant {
  userId: string
  sessionId: string
  role: 'customer' | 'mechanic'
  mechanicId?: string
}

/**
 * Validates that the authenticated user is a participant in the specified session
 *
 * @param req - Next.js request object
 * @param sessionId - The session ID to validate against
 * @returns Session participant data or error response
 *
 * @example
 * export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
 *   const result = await requireSessionParticipant(req, params.id)
 *   if (result.error) return result.error
 *
 *   const participant = result.data
 *   // ... proceed with session access
 * }
 */
export async function requireSessionParticipant(
  req: NextRequest,
  sessionId: string
): Promise<
  | { data: SessionParticipant; error: null }
  | { data: null; error: NextResponse }
> {
  // Step 1: Authenticate user via Supabase Auth
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

  if (!user || authError) {
    console.warn(`[Session Guard] Unauthorized access attempt to session ${sessionId}:`, authError?.message)
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      ),
    }
  }

  // Step 2: Fetch session data
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('id, customer_id, mechanic_id')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError || !session) {
    console.error(`[Session Guard] Failed to fetch session ${sessionId}:`, sessionError)
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      ),
    }
  }

  // Step 3: Check if user is customer participant
  if (session.customer_id === user.id) {
    console.log(`[Session Guard] Customer ${user.id} authorized for session ${sessionId}`)
    return {
      data: {
        userId: user.id,
        sessionId: session.id,
        role: 'customer',
      },
      error: null,
    }
  }

  // Step 4: Check if user is mechanic participant
  if (session.mechanic_id) {
    // Get mechanic record linked to this Supabase Auth user
    const { data: mechanic, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (mechanic && mechanic.id === session.mechanic_id) {
      console.log(`[Session Guard] Mechanic ${mechanic.id} authorized for session ${sessionId}`)
      return {
        data: {
          userId: user.id,
          sessionId: session.id,
          role: 'mechanic',
          mechanicId: mechanic.id,
        },
        error: null,
      }
    }
  }

  // Step 5: User is authenticated but not a participant
  console.warn(`[Session Guard] User ${user.id} attempted to access session ${sessionId} without authorization`)
  return {
    data: null,
    error: NextResponse.json(
      { error: 'Forbidden - You are not a participant in this session' },
      { status: 403 }
    ),
  }
}
