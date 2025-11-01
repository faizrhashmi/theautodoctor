import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get pending data access requests from database view
    const { data: requests, error: requestsError } = await supabase
      .from('data_access_requests_pending')
      .select('*')
      .order('requested_at', { ascending: true })

    if (requestsError) {
      console.error('Error fetching data access requests:', requestsError)
      return NextResponse.json(
        { error: 'Failed to fetch data access requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      requests: requests || [],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Data access requests API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
