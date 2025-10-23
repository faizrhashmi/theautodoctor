// @ts-nocheck
// src/app/api/admin/errors/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || undefined
    const source = searchParams.get('source') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('admin_errors')
      .select('*', { count: 'exact' })
      .order('last_seen', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (source) {
      query = query.eq('source', source)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      errors: data || [],
      total: count || 0,
    })
  } catch (error: any) {
    console.error('Error fetching errors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch errors', message: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { error_type, error_message, error_stack, source, metadata } = body

    // Check if similar error exists
    const { data: existing } = await supabase
      .from('admin_errors')
      .select('*')
      .eq('error_type', error_type)
      .eq('error_message', error_message)
      .eq('source', source)
      .single()

    if (existing) {
      // Update existing error
      const { data, error } = await supabase
        .from('admin_errors')
        .update({
          occurrence_count: existing.occurrence_count + 1,
          last_seen: new Date().toISOString(),
          metadata: { ...(existing.metadata as any || {}), ...metadata },
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    } else {
      // Create new error
      const { data, error } = await supabase
        .from('admin_errors')
        .insert({
          error_type,
          error_message,
          error_stack,
          source,
          metadata: metadata || {},
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }
  } catch (error: any) {
    console.error('Error creating/updating error:', error)
    return NextResponse.json(
      { error: 'Failed to create/update error', message: error.message },
      { status: 500 }
    )
  }
}
