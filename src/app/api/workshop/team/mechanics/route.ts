import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/workshop/team/mechanics
 * Get all mechanics in the workshop (for team management)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated workshop owner
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workshop ID from organization_members
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Workshop owner or admin access required' },
        { status: 403 }
      )
    }

    // Get all mechanics in this workshop (including owner/operators)
    const { data: mechanics, error } = await supabaseAdmin
      .from('mechanics')
      .select(`
        id,
        name,
        email,
        phone,
        years_of_experience,
        is_brand_specialist,
        brand_specializations,
        specialist_tier,
        red_seal_certified,
        account_status,
        account_type
      `)
      .eq('workshop_id', membership.organization_id)
      .order('is_brand_specialist', { ascending: false })
      .order('name')

    if (error) {
      console.error('[Workshop Team] Fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch team mechanics' },
        { status: 500 }
      )
    }

    return NextResponse.json({ mechanics: mechanics || [] })
  } catch (error: any) {
    console.error('[Workshop Team] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
