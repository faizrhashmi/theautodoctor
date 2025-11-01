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

    // Get consent statistics from database view
    const { data: statistics, error: statsError } = await supabase
      .from('consent_statistics')
      .select('*')
      .order('consent_type')

    if (statsError) {
      console.error('Error fetching consent statistics:', statsError)
      return NextResponse.json(
        { error: 'Failed to fetch consent statistics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      statistics: statistics || [],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Consent statistics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
