// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(_request: NextRequest) {
  // ✅ SECURITY: Require admin authentication
  const authResult = await requireAdminAPI(_request)
  if (authResult.error) return authResult.error

    const admin = authResult.data

  try {

    // Get session counts (using admin client)
    const [liveCount, waitingCount, completedCount, totalRevenue] = await Promise.all([
      supabaseAdmin
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'live'),
      supabaseAdmin
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting'),
      supabaseAdmin
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabaseAdmin.from('sessions').select('metadata').eq('status', 'completed'),
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
