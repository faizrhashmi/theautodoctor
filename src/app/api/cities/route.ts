/**
 * GET /api/cities?country=CA
 * Returns cities for a specific country
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const countryCode = searchParams.get('country')

    if (!countryCode) {
      return NextResponse.json(
        { error: 'Country code is required (e.g., ?country=CA)' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('major_cities')
      .select('*')
      .eq('country_code', countryCode.toUpperCase())
      .eq('is_active', true)
      .order('city_name', { ascending: true })

    if (error) {
      console.error('[Cities API] Error fetching cities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch cities' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('[Cities API] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
