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
import { supabaseAdmin } from '@/lib/supabaseAdmin'
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

    // Get customer's favorites (without joining mechanics - RLS would block that)
    const { data: favorites, error } = await supabase
      .from('customer_favorites')
      .select('id, mechanic_id, added_at, total_services, total_spent, last_service_at')
      .eq('customer_id', user.id)
      .order('last_service_at', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('[favorites] Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
    }

    if (!favorites || favorites.length === 0) {
      return NextResponse.json({
        success: true,
        favorites: [],
        count: 0
      })
    }

    // Use admin client to fetch mechanic details (RLS bypass needed)
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const mechanicIds = favorites.map(f => f.mechanic_id)

    const { data: mechanics, error: mechanicsError } = await supabaseAdmin
      .from('mechanics')
      .select(`
        id,
        user_id,
        years_of_experience,
        rating,
        completed_sessions,
        red_seal_certified,
        brand_specializations,
        city,
        country,
        currently_on_shift,
        shop_affiliation,
        workshop_id,
        organizations:workshop_id (name)
      `)
      .in('id', mechanicIds)

    if (mechanicsError) {
      console.error('[favorites] Error fetching mechanics:', mechanicsError)
    }

    // Fetch profiles for mechanic names
    const userIds = mechanics?.map(m => m.user_id).filter(Boolean) || []
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    // Create lookup maps
    const mechanicsMap = new Map(mechanics?.map(m => [m.id, m]) || [])
    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Transform data to match UI needs
    const transformedFavorites = favorites.map((fav: any) => {
      const mechanic = mechanicsMap.get(fav.mechanic_id)
      const profile = mechanic ? profilesMap.get(mechanic.user_id) : null

      return {
        id: fav.id,
        provider_id: fav.mechanic_id,
        mechanic_id: fav.mechanic_id,
        provider_name: profile?.full_name || 'Unknown',
        provider_type: 'independent',
        created_at: fav.added_at,
        added_at: fav.added_at,
        total_services: fav.total_services || 0,
        total_spent: fav.total_spent || 0,
        last_service_at: fav.last_service_at,
        // Mechanic details
        years_experience: mechanic?.years_of_experience || 0,
        rating: mechanic?.rating || 0,
        completed_sessions: mechanic?.completed_sessions || 0,
        red_seal_certified: mechanic?.red_seal_certified || false,
        brand_specializations: mechanic?.brand_specializations || [],
        city: mechanic?.city,
        country: mechanic?.country,
        workshop_name: (mechanic as any)?.organizations?.name || mechanic?.shop_affiliation,
        // Presence status
        is_online: mechanic?.currently_on_shift || false,
        presence_status: mechanic?.currently_on_shift ? 'online' : 'offline'
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

    // Verify mechanic exists - use admin client to bypass RLS
    // (RLS policies may prevent customers from directly querying mechanics table)
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { data: mechanicExists, error: mechanicCheckError } = await supabaseAdmin
      .from('mechanics')
      .select('id, user_id, name, email')
      .eq('id', mechanic_id)
      .maybeSingle()

    console.log(`[favorites] Mechanic check for ID ${mechanic_id}:`, {
      found: !!mechanicExists,
      data: mechanicExists,
      error: mechanicCheckError
    })

    if (!mechanicExists) {
      // Try to find by user_id to provide better error message
      const { data: mechanicByUserId } = await supabaseAdmin
        .from('mechanics')
        .select('id, user_id, name')
        .eq('user_id', mechanic_id)
        .maybeSingle()

      if (mechanicByUserId) {
        console.error(`[favorites] Found mechanic by user_id. Correct mechanic_id is: ${mechanicByUserId.id}`)
        return NextResponse.json(
          {
            error: `Wrong ID type provided. You sent user_id (${mechanic_id}) but need mechanic_id (${mechanicByUserId.id}).`,
            suggestion: `Use mechanic_id: "${mechanicByUserId.id}" instead`
          },
          { status: 400 }
        )
      }

      console.error(`[favorites] Mechanic not found by id or user_id: ${mechanic_id}`)
      return NextResponse.json(
        { error: `Mechanic with ID ${mechanic_id} not found in database.` },
        { status: 404 }
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
      console.error('[favorites] Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({
        error: 'Failed to add favorite',
        details: error.message,
        hint: error.hint
      }, { status: 500 })
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
