/**
 * GET /api/customer/mechanics/favorites
 * Get customer's favorite mechanics with detailed information
 *
 * POST /api/customer/mechanics/favorites
 * Add a mechanic to favorites
 *
 * DELETE /api/customer/mechanics/favorites
 * Remove a mechanic from favorites
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get customer's favorites with detailed mechanic information
    const { data: favorites, error } = await supabase
      .from('customer_favorites')
      .select(`
        id,
        mechanic_id,
        added_at,
        total_services,
        total_spent,
        last_service_at,
        mechanics (
          id,
          user_id,
          years_experience,
          rating,
          completed_sessions,
          red_seal_certified,
          brand_specializations,
          city,
          country,
          mechanic_type,
          workshop_id,
          workshop:organizations (
            name
          ),
          profiles:profiles!mechanics_user_id_fkey (
            full_name
          )
        )
      `)
      .eq('customer_id', user.id)
      .order('last_service_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('[favorites] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
    }

    // Transform data to match UI needs
    const transformedFavorites = favorites.map((fav: any) => {
      const mechanic = fav.mechanics

      return {
        id: fav.id,
        provider_id: fav.mechanic_id,
        mechanic_id: fav.mechanic_id,
        provider_name: mechanic?.profiles?.full_name || 'Unknown',
        provider_type: 'independent',
        created_at: fav.added_at,
        added_at: fav.added_at,
        total_services: fav.total_services || 0,
        total_spent: fav.total_spent || 0,
        last_service_at: fav.last_service_at,
        // Mechanic details
        years_experience: mechanic?.years_experience || 0,
        rating: mechanic?.rating || 0,
        completed_sessions: mechanic?.completed_sessions || 0,
        red_seal_certified: mechanic?.red_seal_certified || false,
        brand_specializations: mechanic?.brand_specializations || [],
        city: mechanic?.city,
        country: mechanic?.country,
        mechanic_type: mechanic?.mechanic_type,
        workshop_name: mechanic?.workshop?.name,
        // Presence status - Need to fetch separately
        is_online: false,
        presence_status: 'offline'
      }
    })

    return NextResponse.json({
      success: true,
      favorites: transformedFavorites,
      count: transformedFavorites.length
    })

  } catch (error: any) {
    console.error('[favorites] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mechanic_id, mechanic_name } = body

    if (!mechanic_id || !mechanic_name) {
      return NextResponse.json(
        { error: 'mechanic_id and mechanic_name are required' },
        { status: 400 }
      )
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from('customer_favorites')
      .select('id')
      .eq('customer_id', user.id)
      .eq('mechanic_id', mechanic_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Mechanic already in favorites' },
        { status: 400 }
      )
    }

    // Add to favorites
    const { data: favorite, error } = await supabase
      .from('customer_favorites')
      .insert({
        customer_id: user.id,
        mechanic_id: mechanic_id,
        total_services: 0,
        total_spent: 0
      })
      .select()
      .single()

    if (error) {
      console.error('[favorites] Add error:', error)
      return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      favorite,
      message: `${mechanic_name} added to favorites`
    })

  } catch (error: any) {
    console.error('[favorites] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mechanic_id = searchParams.get('mechanic_id')

    if (!mechanic_id) {
      return NextResponse.json(
        { error: 'mechanic_id query parameter is required' },
        { status: 400 }
      )
    }

    // Remove from favorites
    const { error } = await supabase
      .from('customer_favorites')
      .delete()
      .eq('customer_id', user.id)
      .eq('mechanic_id', mechanic_id)

    if (error) {
      console.error('[favorites] Delete error:', error)
      return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Removed from favorites'
    })

  } catch (error: any) {
    console.error('[favorites] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
