import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function createClient() {
  const cookieStore = cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

/**
 * POST /api/follow-up
 * Create a follow-up request for a previous session
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { parentSessionId, followUpType, description } = body

    // Validate input
    if (!parentSessionId || typeof parentSessionId !== 'string') {
      return NextResponse.json({ error: 'Parent session ID is required' }, { status: 400 })
    }

    if (!followUpType || !['quick_question', 'mini_extension', 'new_issue'].includes(followUpType)) {
      return NextResponse.json(
        { error: 'Invalid follow-up type. Must be: quick_question, mini_extension, or new_issue' },
        { status: 400 }
      )
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    // Check if follow-up is allowed using database function
    const { data: canCreateResult, error: checkError } = await supabaseAdmin.rpc(
      'can_create_follow_up',
      {
        p_parent_session_id: parentSessionId,
        p_customer_id: user.id,
      }
    )

    if (checkError) {
      console.error('[POST /api/follow-up] Error checking eligibility:', checkError)
      return NextResponse.json({ error: 'Failed to verify eligibility' }, { status: 500 })
    }

    if (!canCreateResult) {
      return NextResponse.json(
        {
          error:
            'Cannot create follow-up. Possible reasons: session not found, not your session, session not completed, too many follow-ups (max 3), or session ended more than 30 days ago',
        },
        { status: 400 }
      )
    }

    // Create follow-up request using database function
    const { data: requestId, error: createError } = await supabaseAdmin.rpc(
      'create_follow_up_request',
      {
        p_parent_session_id: parentSessionId,
        p_customer_id: user.id,
        p_follow_up_type: followUpType,
        p_description: description.trim(),
        p_metadata: {
          created_via: 'api',
          user_agent: req.headers.get('user-agent') || 'unknown',
        },
      }
    )

    if (createError) {
      console.error('[POST /api/follow-up] Error creating follow-up:', createError)
      return NextResponse.json({ error: 'Failed to create follow-up request' }, { status: 500 })
    }

    // Get the created request
    const { data: request } = await supabaseAdmin
      .from('session_requests')
      .select(
        `
        id,
        description,
        status,
        created_at,
        follow_up_type,
        parent_session_id
      `
      )
      .eq('id', requestId)
      .single()

    return NextResponse.json({
      success: true,
      request,
      message: 'Follow-up request created successfully',
    })
  } catch (error) {
    console.error('[POST /api/follow-up] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/follow-up?sessionId=xxx
 * Get follow-up requests for a session
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Verify user owns the session
    const { data: session } = await supabaseAdmin
      .from('sessions')
      .select('customer_user_id')
      .eq('id', sessionId)
      .single()

    if (!session || session.customer_user_id !== user.id) {
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 403 })
    }

    // Get follow-up requests
    const { data: followUps, error } = await supabaseAdmin
      .from('session_requests')
      .select(
        `
        id,
        description,
        status,
        created_at,
        follow_up_type,
        parent_session_id
      `
      )
      .eq('parent_session_id', sessionId)
      .eq('is_follow_up', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET /api/follow-up] Error fetching follow-ups:', error)
      return NextResponse.json({ error: 'Failed to fetch follow-ups' }, { status: 500 })
    }

    return NextResponse.json({
      followUps: followUps || [],
    })
  } catch (error) {
    console.error('[GET /api/follow-up] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
