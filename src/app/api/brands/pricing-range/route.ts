import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/brands/pricing-range
 *
 * Returns the min and max specialist premium pricing from brand_specializations table
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      console.error('[pricing-range] Supabase admin client not available')
      return NextResponse.json({ min: 15, max: 50 }, { status: 200 })
    }

    const { data, error } = await supabaseAdmin
      .from('brand_specializations')
      .select('specialist_premium')
      .not('specialist_premium', 'is', null)
      .order('specialist_premium', { ascending: true })

    if (error) {
      console.error('[pricing-range] Database error:', error)
      // Return default range on error
      return NextResponse.json({ min: 15, max: 50 }, { status: 200 })
    }

    if (!data || data.length === 0) {
      // No data, return defaults
      return NextResponse.json({ min: 15, max: 50 }, { status: 200 })
    }

    const premiums = data.map(d => d.specialist_premium).filter(p => p !== null) as number[]

    const min = Math.min(...premiums)
    const max = Math.max(...premiums)

    return NextResponse.json({ min, max }, { status: 200 })

  } catch (error: any) {
    console.error('[pricing-range] Error:', error)
    // Return defaults on any error
    return NextResponse.json({ min: 15, max: 50 }, { status: 200 })
  }
}
