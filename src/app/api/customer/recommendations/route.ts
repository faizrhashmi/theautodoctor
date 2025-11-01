import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/customer/recommendations
 * Fetch customer's personalized recommendations
 * Query params:
 *   - type: 'vehicle' | 'mechanic' | 'all' (default: 'all')
 *   - status: 'active' | 'all' (default: 'active')
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'all'
    const statusFilter = searchParams.get('status') || 'active'

    const response: any = {}

    // Fetch vehicle recommendations
    if (type === 'vehicle' || type === 'all') {
      let vehicleQuery = supabase
        .from('vehicle_recommendations')
        .select(`
          *,
          vehicle:vehicles (
            id,
            year,
            make,
            model,
            vin,
            odometer
          )
        `)
        .eq('customer_id', user.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        vehicleQuery = vehicleQuery.eq('status', statusFilter)
      }

      const { data: vehicleRecs, error: vehicleError } = await vehicleQuery

      if (vehicleError) {
        console.error('[API] Error fetching vehicle recommendations:', vehicleError)
      } else {
        response.vehicle_recommendations = vehicleRecs || []
      }
    }

    // Fetch mechanic recommendations
    if (type === 'mechanic' || type === 'all') {
      const { data: mechanicRecs, error: mechanicError } = await supabase
        .from('mechanic_recommendations')
        .select(`
          *,
          mechanic:profiles!mechanic_recommendations_mechanic_id_fkey (
            id,
            full_name,
            email,
            avatar_url,
            specialties,
            bio
          )
        `)
        .eq('customer_id', user.id)
        .gte('expires_at', new Date().toISOString())
        .order('score', { ascending: false })
        .limit(5)

      if (mechanicError) {
        console.error('[API] Error fetching mechanic recommendations:', mechanicError)
      } else {
        response.mechanic_recommendations = mechanicRecs || []
      }
    }

    // Get summary counts
    const { count: activeVehicleCount } = await supabase
      .from('vehicle_recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', user.id)
      .eq('status', 'active')

    const { count: highPriorityCount } = await supabase
      .from('vehicle_recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', user.id)
      .eq('status', 'active')
      .in('priority', ['high', 'critical'])

    response.summary = {
      total_active_recommendations: activeVehicleCount || 0,
      high_priority_count: highPriorityCount || 0,
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[API] Error fetching recommendations:', error)
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 })
  }
}

/**
 * POST /api/customer/recommendations
 * Generate new recommendations for customer
 * Body: { vehicle_id?: string, force_regenerate?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { vehicle_id, force_regenerate } = body

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not available' }, { status: 500 })
    }

    let totalGenerated = 0

    if (vehicle_id) {
      // Generate recommendations for specific vehicle
      const { data: count, error: genError } = await supabaseAdmin.rpc('generate_vehicle_recommendations', {
        p_vehicle_id: vehicle_id,
      })

      if (genError) {
        return NextResponse.json(
          { error: 'Failed to generate recommendations', details: genError.message },
          { status: 500 }
        )
      }

      totalGenerated = count || 0
    } else {
      // Generate recommendations for all customer vehicles
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('customer_id', user.id)

      if (vehiclesError) {
        return NextResponse.json(
          { error: 'Failed to fetch vehicles', details: vehiclesError.message },
          { status: 500 }
        )
      }

      for (const vehicle of vehicles || []) {
        const { data: count } = await supabaseAdmin.rpc('generate_vehicle_recommendations', {
          p_vehicle_id: vehicle.id,
        })
        totalGenerated += count || 0
      }
    }

    return NextResponse.json({
      success: true,
      recommendations_generated: totalGenerated,
      message: `Generated ${totalGenerated} new recommendation${totalGenerated !== 1 ? 's' : ''}`,
    })
  } catch (error: any) {
    console.error('[API] Error generating recommendations:', error)
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 })
  }
}
