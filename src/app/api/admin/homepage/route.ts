import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdminAPI } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/homepage
 * Returns all homepage configuration sections (active and inactive)
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAdminAPI(req)
  if (authResult.error) return authResult.error
  const { supabaseAdmin, admin } = authResult

  try {
    const { data: sections, error } = await supabaseAdmin
      .from('homepage_config')
      .select('*, updated_by_profile:profiles!homepage_config_updated_by_fkey(full_name, email)')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[GET /api/admin/homepage] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch homepage config' }, { status: 500 })
    }

    return NextResponse.json({ sections: sections || [] })
  } catch (error) {
    console.error('[GET /api/admin/homepage] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/homepage
 * Create new homepage section
 *
 * Body:
 * {
 *   section_key: string (unique identifier),
 *   section_name: string (display name),
 *   section_value: object (JSON configuration),
 *   is_active?: boolean,
 *   display_order?: number
 * }
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAPI(request)
  if (authResult.error) return authResult.error
  const { supabaseAdmin, admin } = authResult

  try {
    const body = await request.json()
    const {
      section_key,
      section_name,
      section_value,
      is_active,
      display_order
    } = body

    // Validation
    if (!section_key || typeof section_key !== 'string') {
      return NextResponse.json(
        { error: 'section_key is required and must be a string' },
        { status: 400 }
      )
    }

    if (!section_name || typeof section_name !== 'string') {
      return NextResponse.json(
        { error: 'section_name is required and must be a string' },
        { status: 400 }
      )
    }

    if (!section_value || typeof section_value !== 'object') {
      return NextResponse.json(
        { error: 'section_value is required and must be an object' },
        { status: 400 }
      )
    }

    // Check for duplicate section_key
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('homepage_config')
      .select('id')
      .eq('section_key', section_key)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: `Section with key '${section_key}' already exists` },
        { status: 409 }
      )
    }

    const insertData = {
      section_key,
      section_name,
      section_value,
      is_active: is_active !== undefined ? is_active : true,
      display_order: display_order !== undefined ? display_order : 0,
      updated_by: admin.user?.id
    }

    const { data: newSection, error: insertError } = await supabaseAdmin
      .from('homepage_config')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('[POST /api/admin/homepage] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create section' }, { status: 500 })
    }

    console.log(`[POST /api/admin/homepage] Created by admin ${admin.user?.id}:`, newSection)

    return NextResponse.json(newSection, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/homepage] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
