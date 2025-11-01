import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/feature-flags
 * Get all feature flags (admin view)
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

    console.info('[admin/feature-flags] list flags', {
      admin: admin.email ?? admin.user?.id ?? 'unknown',
    })

    const { data: flags, error } = await supabaseAdmin
      .from('feature_flags')
      .select('*')
      .order('flag_key', { ascending: true })

    if (error) {
      console.error('[GET /api/admin/feature-flags] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch feature flags' }, { status: 500 })
    }

    return NextResponse.json({ flags })
  } catch (error) {
    console.error('[GET /api/admin/feature-flags] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/feature-flags
 * Create a new feature flag
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminAPI(request)
    if (authResult.error) return authResult.error

    const admin = authResult.data
    const body = await request.json()

    console.info('[admin/feature-flags] create flag', {
      admin: admin.email ?? admin.user?.id ?? 'unknown',
      flag_key: body.flag_key,
    })

    const {
      flag_key,
      flag_name,
      description,
      is_enabled,
      enabled_for_roles,
      rollout_percentage,
      metadata
    } = body

    // Validation
    if (!flag_key || !flag_name) {
      return NextResponse.json(
        { error: 'Missing required fields: flag_key, flag_name' },
        { status: 400 }
      )
    }

    // Check for duplicate
    const { data: existing } = await supabaseAdmin
      .from('feature_flags')
      .select('id')
      .eq('flag_key', flag_key)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A feature flag with this key already exists' },
        { status: 409 }
      )
    }

    const { data: newFlag, error } = await supabaseAdmin
      .from('feature_flags')
      .insert({
        flag_key,
        flag_name,
        description: description || null,
        is_enabled: is_enabled !== undefined ? is_enabled : false,
        enabled_for_roles: enabled_for_roles || ['admin'],
        rollout_percentage: rollout_percentage || 100,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/admin/feature-flags] Database error:', error)
      return NextResponse.json({ error: 'Failed to create feature flag' }, { status: 500 })
    }

    return NextResponse.json({ flag: newFlag }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/feature-flags] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
