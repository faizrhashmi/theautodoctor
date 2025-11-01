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

    // Get all data breaches
    const { data: breaches, error: breachesError } = await supabase
      .from('data_breach_log')
      .select('*')
      .order('discovered_at', { ascending: false })

    if (breachesError) {
      console.error('Error fetching breaches:', breachesError)
      return NextResponse.json(
        { error: 'Failed to fetch breach data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      breaches: breaches || [],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Breaches API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
