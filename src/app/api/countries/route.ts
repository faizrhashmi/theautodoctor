/**
 * GET /api/countries
 * Returns all supported countries
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('supported_countries')
      .select('*')
      .eq('is_active', true)
      .order('country_name', { ascending: true })

    if (error) {
      console.error('[Countries API] Error fetching countries:', error)
      return NextResponse.json(
        { error: 'Failed to fetch countries' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('[Countries API] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
