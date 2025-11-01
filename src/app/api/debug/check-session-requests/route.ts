import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { withDebugAuth } from '@/lib/debugAuth'


export const dynamic = 'force-dynamic'

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mechanicId = searchParams.get('mechanicId')

    // Get ALL session requests (no filters) to see what's in the database
    const { data: allRequests, error: allError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (allError) {
      return NextResponse.json({ error: allError.message }, { status: 500 })
    }

    // Get pending requests specifically
    const { data: pendingRequests, error: pendingError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (pendingError) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 })
    }

    // If mechanicId provided, check that specific mechanic's requests
    let mechanicSpecific = null
    if (mechanicId) {
      const { data, error } = await supabaseAdmin
        .from('session_requests')
        .select('*')
        .eq('mechanic_id', mechanicId)
        .order('created_at', { ascending: false })

      mechanicSpecific = { data, error: error?.message }
    }

    return NextResponse.json({
      summary: {
        totalRequests: allRequests?.length || 0,
        pendingRequests: pendingRequests?.length || 0,
        byStatus: allRequests?.reduce((acc, req) => {
          acc[req.status] = (acc[req.status] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {},
      },
      allRequests: allRequests?.map(r => ({
        id: r.id,
        status: r.status,
        customer_id: r.customer_id,
        mechanic_id: r.mechanic_id,
        session_type: r.session_type,
        created_at: r.created_at,
        accepted_at: r.accepted_at,
      })),
      pendingRequests: pendingRequests?.map(r => ({
        id: r.id,
        customer_id: r.customer_id,
        mechanic_id: r.mechanic_id,
        session_type: r.session_type,
        created_at: r.created_at,
      })),
      mechanicSpecific,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// P0-1 FIX: Protect debug endpoint with authentication
export const GET = withDebugAuth(getHandler)
