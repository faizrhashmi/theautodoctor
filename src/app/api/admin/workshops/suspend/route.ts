import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
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

    const { organization_id, reason } = await req.json()

    if (!organization_id || !reason) {
      return NextResponse.json(
        { error: 'organization_id and reason are required' },
        { status: 400 }
      )
    }

    // Call suspend_workshop function
    const { data, error } = await supabase.rpc('suspend_workshop', {
      p_organization_id: organization_id,
      p_reason: reason,
      p_suspended_by: user.id,
    })

    if (error) {
      console.error('Error suspending workshop:', error)
      return NextResponse.json(
        { error: 'Failed to suspend workshop: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Workshop suspended successfully',
    })
  } catch (error) {
    console.error('Suspend workshop API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
