import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/customer/favorites
 *
 * Get customer's favorite mechanics/workshops
 */
export async function GET(req: NextRequest) {
  try {
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(req)
    if (authResult.error) return authResult.error

    const customer = authResult.data
    console.log(`[CUSTOMER] ${customer.email} fetching favorites`)

    // Get favorites with provider details
    const { data: favorites, error } = await supabaseAdmin
      .from('customer_favorites')
      .select(`
        id,
        mechanic_id,
        workshop_id,
        total_services,
        total_spent,
        last_service_at,
        added_at,
        mechanics!customer_favorites_mechanic_id_fkey (
          id,
          full_name,
          email
        ),
        organizations!customer_favorites_workshop_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('customer_id', customer.id)
      .order('last_service_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('Error fetching favorites:', error)
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      )
    }

    // Format response
    const formattedFavorites = favorites.map((fav: any) => {
      const isMechanic = !!fav.mechanic_id
      return {
        id: fav.id,
        provider_id: isMechanic ? fav.mechanic_id : fav.workshop_id,
        provider_name: isMechanic
          ? fav.mechanics?.full_name || 'Unknown Mechanic'
          : fav.organizations?.name || 'Unknown Workshop',
        provider_type: isMechanic ? 'independent' : 'workshop',
        total_services: fav.total_services,
        total_spent: fav.total_spent,
        last_service_at: fav.last_service_at,
        added_at: fav.added_at
      }
    })

    return NextResponse.json(formattedFavorites)

  } catch (error: any) {
    console.error('Error in GET favorites:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch favorites' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/customer/favorites
 *
 * Add a mechanic/workshop to favorites
 *
 * Body:
 * {
 *   provider_id: string,
 *   provider_type: 'workshop' | 'independent'
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // ✅ SECURITY: Require customer authentication
    const authResult = await requireCustomerAPI(req)
    if (authResult.error) return authResult.error

    const customer = authResult.data
    console.log(`[CUSTOMER] ${customer.email} adding favorite`)

    const body = await req.json()

    const {
      provider_id,
      provider_type
    } = body

    // Validate required fields
    if (!provider_id || !provider_type) {
      return NextResponse.json(
        { error: 'provider_id and provider_type are required' },
        { status: 400 }
      )
    }

    if (!['workshop', 'independent'].includes(provider_type)) {
      return NextResponse.json(
        { error: 'provider_type must be "workshop" or "independent"' },
        { status: 400 }
      )
    }

    // Check if already favorited
    const { data: existing } = await supabaseAdmin
      .from('customer_favorites')
      .select('id')
      .eq('customer_id', customer.id)
      .eq(provider_type === 'workshop' ? 'workshop_id' : 'mechanic_id', provider_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'This provider is already in your favorites' },
        { status: 400 }
      )
    }

    // Add to favorites
    const { data: favorite, error: insertError } = await supabaseAdmin
      .from('customer_favorites')
      .insert({
        customer_id: customer.id,
        mechanic_id: provider_type === 'independent' ? provider_id : null,
        workshop_id: provider_type === 'workshop' ? provider_id : null,
        total_services: 0,
        total_spent: 0
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding favorite:', insertError)
      return NextResponse.json(
        { error: 'Failed to add favorite' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      favorite_id: favorite.id,
      message: 'Provider added to favorites'
    })

  } catch (error: any) {
    console.error('Error in POST favorites:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add favorite' },
      { status: 500 }
    )
  }
}
