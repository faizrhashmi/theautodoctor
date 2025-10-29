import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: NextRequest) {
  try {
    const supabaseClient = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Fetch all vehicles for this customer
    const { data: vehicles, error: vehiclesError } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })

    if (vehiclesError) {
      console.error('Vehicles fetch error:', vehiclesError)
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 })
    }

    return NextResponse.json({
      vehicles: vehicles || [],
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseClient = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { make, model, year, vin, color, mileage, plate, nickname, is_primary } = body

    if (!make || !model || !year) {
      return NextResponse.json({ error: 'Make, model, and year are required' }, { status: 400 })
    }

    // If this is being set as primary, unset all other primary vehicles
    if (is_primary) {
      await supabaseClient
        .from('vehicles')
        .update({ is_primary: false })
        .eq('user_id', user.id)
    }

    // Use supabaseClient (with user auth context) instead of supabaseAdmin
    // This ensures auth.uid() in RLS policies works correctly
    const { data: vehicle, error: insertError } = await supabaseClient
      .from('vehicles')
      .insert({
        user_id: user.id,
        make,
        model,
        year,
        vin: vin || null,
        color: color || null,
        mileage: mileage || null,
        plate: plate || null,
        nickname: nickname || null,
        is_primary: is_primary || false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Vehicle insert error:', insertError)
      return NextResponse.json({ error: 'Failed to add vehicle' }, { status: 500 })
    }

    return NextResponse.json({ vehicle })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabaseClient = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const vehicleId = searchParams.get('id')

    if (!vehicleId) {
      return NextResponse.json({ error: 'Vehicle ID required' }, { status: 400 })
    }

    // Verify ownership
    const { data: vehicle } = await supabaseAdmin
      .from('vehicles')
      .select('user_id')
      .eq('id', vehicleId)
      .single()

    if (!vehicle || vehicle.user_id !== user.id) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('vehicles')
      .delete()
      .eq('id', vehicleId)

    if (deleteError) {
      console.error('Vehicle delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
