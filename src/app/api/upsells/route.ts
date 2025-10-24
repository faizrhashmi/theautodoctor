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
 * GET /api/upsells?customerId=xxx
 * Get upsell recommendations for a customer
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active upsells (not dismissed or purchased)
    const { data: upsells, error } = await supabaseAdmin
      .from('upsell_recommendations')
      .select('*')
      .eq('customer_id', user.id)
      .is('dismissed_at', null)
      .is('purchased_at', null)
      .order('shown_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('[GET /api/upsells] Error fetching upsells:', error)
      return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
    }

    return NextResponse.json({
      upsells: upsells || [],
    })
  } catch (error) {
    console.error('[GET /api/upsells] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
