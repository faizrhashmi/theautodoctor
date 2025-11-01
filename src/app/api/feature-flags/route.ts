import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/feature-flags
 * Public endpoint to check enabled feature flags
 *
 * Query params:
 * - flag: specific flag_key to check (optional)
 *
 * Examples:
 * - GET /api/feature-flags → Returns all enabled flags
 * - GET /api/feature-flags?flag=rfq_system → Returns {enabled: true/false, ...}
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const flagKey = searchParams.get('flag')

    // If specific flag requested
    if (flagKey) {
      const { data: flag, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('flag_key', flagKey)
        .eq('is_enabled', true)
        .single()

      if (error || !flag) {
        return NextResponse.json(
          {
            flag_key: flagKey,
            enabled: false,
            message: 'Feature not found or disabled'
          },
          { status: 200 } // Return 200, not 404, for disabled features
        )
      }

      return NextResponse.json({
        flag_key: flag.flag_key,
        flag_name: flag.flag_name,
        description: flag.description,
        enabled: flag.is_enabled,
        enabled_for_roles: flag.enabled_for_roles,
        metadata: flag.metadata
      })
    }

    // Otherwise return all enabled flags
    const { data: flags, error } = await supabase
      .from('feature_flags')
      .select('flag_key, flag_name, description, enabled_for_roles, metadata')
      .eq('is_enabled', true)
      .order('flag_key', { ascending: true })

    if (error) {
      console.error('[GET /api/feature-flags] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch feature flags' }, { status: 500 })
    }

    return NextResponse.json({ flags: flags || [] })
  } catch (error) {
    console.error('[GET /api/feature-flags] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
