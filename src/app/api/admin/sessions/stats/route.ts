// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session counts
    const [liveCount, waitingCount, completedCount, totalRevenue] = await Promise.all([
      supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'live'),
      supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting'),
      supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabase.from('sessions').select('metadata').eq('status', 'completed'),
    ])

    const revenue = totalRevenue.data?.reduce((sum: number, session: any) => {
      const amount = session.metadata?.amount || 0
      return sum + (typeof amount === 'number' ? amount : 0)
    }, 0) || 0

    return NextResponse.json({
      live: liveCount.count || 0,
      waiting: waitingCount.count || 0,
      completed: completedCount.count || 0,
      revenue: revenue / 100, // Convert cents to dollars
    })
  } catch (error: any) {
    console.error('Error fetching session stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch session stats' },
      { status: 500 }
    )
  }
}
