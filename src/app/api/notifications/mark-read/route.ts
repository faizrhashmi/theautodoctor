import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/notifications/mark-read
 *
 * Marks notifications as read
 *
 * Body: { ids: string[] } - Array of notification IDs to mark as read
 *       OR { markAll: true } - Mark all notifications as read
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user using server-side client
    const supabaseClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { ids, markAll } = body

    if (!markAll && (!ids || !Array.isArray(ids) || ids.length === 0)) {
      return NextResponse.json(
        { error: 'Invalid request: provide ids array or markAll: true' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Mark notifications as read
    let query = supabaseAdmin
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', user.id)
      .is('read_at', null) // Only update unread notifications

    if (!markAll) {
      query = query.in('id', ids)
    }

    const { error: updateError, count } = await query.select()

    if (updateError) {
      console.error('[Mark Read] Error updating notifications:', updateError)
      return NextResponse.json(
        { error: 'Failed to mark notifications as read' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      marked: count || 0,
      message: `Marked ${count || 0} notification(s) as read`
    })

  } catch (error: any) {
    console.error('[Mark Read API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
