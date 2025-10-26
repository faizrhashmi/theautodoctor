/**
 * GET /api/brands
 * Returns all active brand specializations
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('brand_specializations')
      .select('*')
      .eq('active', true)
      .order('brand_name', { ascending: true })

    if (error) {
      console.error('[Brands API] Error fetching brands:', error)
      return NextResponse.json(
        { error: 'Failed to fetch brands' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('[Brands API] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
