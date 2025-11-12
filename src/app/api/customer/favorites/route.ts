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
          name,
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
          ? fav.mechanics?.name || 'Unknown Mechanic'
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
 * DEPRECATED: This endpoint is no longer supported
 * Please migrate to /api/customer/mechanics/favorites
 */
export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error: 'DEPRECATED: This endpoint is no longer supported',
      migration: {
        message: 'This route has been replaced with a more specific endpoint',
        newEndpoint: '/api/customer/mechanics/favorites',
        method: 'POST',
        requiredBody: {
          mechanic_id: 'string (UUID)',
          mechanic_name: 'string'
        },
        example: {
          mechanic_id: '123e4567-e89b-12d3-a456-426614174000',
          mechanic_name: 'John Smith'
        },
        documentation: 'See CRITICAL_FIXES_2025-11-12.md for full migration guide'
      }
    },
    { status: 410 } // 410 Gone - Resource permanently removed
  )
}
