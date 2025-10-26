/**
 * GET /api/service-keywords
 * Returns all active service keywords
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('service_keywords')
      .select('*')
      .eq('active', true)
      .order('category', { ascending: true })
      .order('keyword', { ascending: true })

    if (error) {
      console.error('[Service Keywords API] Error fetching keywords:', error)
      return NextResponse.json(
        { error: 'Failed to fetch service keywords' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('[Service Keywords API] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
