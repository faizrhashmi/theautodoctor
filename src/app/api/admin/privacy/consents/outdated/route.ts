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

    // Get outdated consent versions from database view
    const { data: outdated, error: outdatedError } = await supabase
      .from('outdated_consent_versions')
      .select('*')
      .eq('needs_update', true)
      .order('granted_at', { ascending: true })

    if (outdatedError) {
      console.error('Error fetching outdated consents:', outdatedError)
      return NextResponse.json(
        { error: 'Failed to fetch outdated consent versions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      outdated: outdated || [],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Outdated consents API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
