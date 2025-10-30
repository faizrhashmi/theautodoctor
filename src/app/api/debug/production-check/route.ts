import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Get environment info
    const env = {
      nodeEnv: process.env.NODE_ENV,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      renderEnv: process.env.RENDER ? 'true' : 'false',
    }

    // Test database connection
    const { data: requests, error } = await supabaseAdmin
      .from('session_requests')
      .select('id, status, created_at')
      .limit(10)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({
        environment: env,
        database: {
          connected: false,
          error: error.message
        }
      })
    }

    // Count by status
    const { data: allRequests } = await supabaseAdmin
      .from('session_requests')
      .select('status')

    const statusCounts = (allRequests || []).reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      environment: env,
      database: {
        connected: true,
        totalRequests: allRequests?.length || 0,
        statusBreakdown: statusCounts,
        recentRequests: requests?.map(r => ({
          id: r.id.substring(0, 8),
          status: r.status,
          created: r.created_at
        }))
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
