import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    // Get all session requests
    const { data: allRequests, error: allError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (allError) {
      console.error('Error fetching all requests:', allError)
      return NextResponse.json({ error: allError.message }, { status: 500 })
    }

    // Get pending requests with null mechanic_id
    const { data: pendingRequests, error: pendingError } = await supabaseAdmin
      .from('session_requests')
      .select('*')
      .eq('status', 'pending')
      .is('mechanic_id', null)
      .order('created_at', { ascending: true })

    if (pendingError) {
      console.error('Error fetching pending requests:', pendingError)
      return NextResponse.json({ error: pendingError.message }, { status: 500 })
    }

    return NextResponse.json({
      summary: {
        totalRequests: allRequests?.length || 0,
        pendingWithNullMechanic: pendingRequests?.length || 0,
      },
      allRequests: allRequests || [],
      pendingRequests: pendingRequests || [],
    })
  } catch (error) {
    console.error('Unexpected error in debug endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
