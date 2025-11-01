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

    // Get workshop compliance summary from database view
    const { data: workshops, error: workshopsError } = await supabase
      .from('workshop_compliance_summary')
      .select('*')
      .order('insurance_expiry_date', { ascending: true, nullsFirst: false })

    if (workshopsError) {
      console.error('Error fetching workshop compliance:', workshopsError)
      return NextResponse.json(
        { error: 'Failed to fetch workshop compliance data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      workshops: workshops || [],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Workshop compliance API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
