import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Database } from '@/types/supabase'

export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(req)
    if (authResult.error) return authResult.error

    const customer = authResult.data
    console.log(`[CUSTOMER] ${customer.email} fetching vehicles`)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Fetch all vehicles for this customer
    const { data: vehicles, error: vehiclesError } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('user_id', customer.id)
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
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(req)
    if (authResult.error) return authResult.error

    const customer = authResult.data
    console.log(`[CUSTOMER] ${customer.email} adding vehicle`)

    const body = await req.json()
    const { make, model, year, vin, color, mileage, plate, nickname, is_primary } = body

    if (!make || !model || !year) {
      return NextResponse.json({ error: 'Make, model, and year are required' }, { status: 400 })
    }

    // If this is being set as primary, unset all other primary vehicles
    if (is_primary) {
      const { error: updateError } = await supabaseAdmin
        .from('vehicles')
        .update({ is_primary: false })
        .eq('user_id', customer.id)

      if (updateError) {
        console.error('Update primary vehicles error:', updateError)
      }
    }

    // Insert the new vehicle
    const { data: vehicle, error: insertError } = await supabaseAdmin
      .from('vehicles')
      .insert({
        user_id: customer.id,
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
      return NextResponse.json({ 
        error: 'Failed to add vehicle: ' + insertError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ vehicle })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(req)
    if (authResult.error) return authResult.error

    const customer = authResult.data
    console.log(`[CUSTOMER] ${customer.email} deleting vehicle`)

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

    if (!vehicle || vehicle.user_id !== customer.id) {
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