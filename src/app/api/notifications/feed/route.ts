import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/notifications/feed
 *
 * Fetches user's notifications (last 50, unread first)
 *
 * Query params:
 * - limit: number of notifications to fetch (default 50, max 100)
 *
 * Returns: { notifications: [...], unreadCount: number }
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const limitParam = searchParams.get('limit')
    const limit = Math.min(parseInt(limitParam || '50', 10), 100)

    // Fetch notifications (unread first, then recent)
    const { data: notifications, error: notificationsError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('read_at', { ascending: true, nullsFirst: true }) // Unread first
      .order('created_at', { ascending: false })
      .limit(limit)

    if (notificationsError) {
      console.error('[Notifications Feed] Error fetching notifications:', notificationsError)
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    // Count unread notifications
    const { count: unreadCount } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null)

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0
    })

  } catch (error: any) {
    console.error('[Notifications Feed API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
