import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/homepage
 * Public endpoint to fetch active homepage configuration
 *
 * Query params:
 * - section: specific section_key to fetch (optional)
 *
 * Examples:
 * - GET /api/homepage → Returns all active sections
 * - GET /api/homepage?section=hero_section → Returns only hero section config
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const sectionKey = searchParams.get('section')

    // If specific section requested
    if (sectionKey) {
      const { data: section, error } = await supabase
        .from('homepage_config')
        .select('section_key, section_name, section_value, display_order')
        .eq('section_key', sectionKey)
        .eq('is_active', true)
        .single()

      if (error || !section) {
        return NextResponse.json(
          {
            section_key: sectionKey,
            found: false,
            message: 'Section not found or inactive'
          },
          { status: 404 }
        )
      }

      return NextResponse.json({
        section_key: section.section_key,
        section_name: section.section_name,
        config: section.section_value,
        display_order: section.display_order
      })
    }

    // Otherwise return all active sections
    const { data: sections, error } = await supabase
      .from('homepage_config')
      .select('section_key, section_name, section_value, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[GET /api/homepage] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch homepage config' }, { status: 500 })
    }

    // Transform into easier-to-consume format
    const sectionsMap = (sections || []).reduce((acc: any, section: any) => {
      acc[section.section_key] = {
        name: section.section_name,
        config: section.section_value,
        display_order: section.display_order
      }
      return acc
    }, {})

    return NextResponse.json({
      sections: sections || [],
      sectionsMap: sectionsMap
    })
  } catch (error) {
    console.error('[GET /api/homepage] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
