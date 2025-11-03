import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/notifications/clear-read
 *
 * Deletes all read notifications for the authenticated user
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

    // Delete all read notifications for this user
    const { error: deleteError, data } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .not('read_at', 'is', null) // Only delete read notifications
      .select()

    if (deleteError) {
      console.error('[Clear Read] Error deleting notifications:', deleteError)
      return NextResponse.json(
        { error: 'Failed to clear read notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      cleared: data?.length || 0,
      message: `Cleared ${data?.length || 0} read notification(s)`
    })

  } catch (error: any) {
    console.error('[Clear Read API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
