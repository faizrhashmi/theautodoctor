/**
 * GET /api/mechanics/available
 * Fetch available mechanics with real-time presence indicators
 * Supports filtering by location, specialization, and vehicle make
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseAdmin
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    const searchParams = req.nextUrl.searchParams

    // Extract query parameters
    const requestType = searchParams.get('request_type') as 'general' | 'brand_specialist' || 'general'
    const requestedBrand = searchParams.get('requested_brand')
    const customerCountry = searchParams.get('customer_country')
    const customerCity = searchParams.get('customer_city')
    const customerPostalCode = searchParams.get('customer_postal_code')
    const preferLocalMechanic = searchParams.get('prefer_local_mechanic') === 'true'
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // Base query - only approved mechanics who can accept sessions
    let query = supabase
      .from('mechanics')
      .select(`
        id,
        user_id,
        name,
        email,
        rating,
        years_of_experience,
        currently_on_shift,
        last_clock_in,
        is_brand_specialist,
        brand_specializations,
        service_keywords,
        country,
        city,
        postal_code,
        completed_sessions,
        red_seal_certified,
        profile_completion_score,
        certification_expiry_date,
        account_status,
        suspended_until,
        workshop_id,
        shop_affiliation,
        organizations:workshop_id (
          id,
          name
        )
      `)
      .eq('application_status', 'approved')
      .eq('account_status', 'active')
      .eq('can_accept_sessions', true)
      .gte('profile_completion_score', 80) // Only mechanics with 80%+ profile completion

    // Filter by request type
    if (requestType === 'brand_specialist') {
      // Only show brand specialists when specialist tab is selected
      query = query.eq('is_brand_specialist', true)
      // Note: We'll filter by specific brand in JavaScript if requestedBrand is provided
    }

    const { data: mechanics, error } = await query

    if (error) {
      console.error('[Available Mechanics] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch mechanics', details: error.message },
        { status: 500 }
      )
    }

    if (!mechanics || mechanics.length === 0) {
      return NextResponse.json({ mechanics: [] })
    }

    // Filter out mechanics with expired certifications (JavaScript filtering)
    let filteredMechanics = mechanics.filter(mechanic => {
      // If certification has expiry date, check it's not expired
      if (mechanic.certification_expiry_date) {
        const expiryDate = new Date(mechanic.certification_expiry_date)
        const now = new Date()
        if (expiryDate < now) {
          return false // Expired certification
        }
      }
      return true
    })

    // Filter brand specialists by brand match (JavaScript filtering)
    if (requestType === 'brand_specialist' && requestedBrand) {
      filteredMechanics = filteredMechanics.filter(mechanic => {
        if (!mechanic.brand_specializations || !Array.isArray(mechanic.brand_specializations)) {
          return false
        }
        return mechanic.brand_specializations.some((brand: string) =>
          brand.toLowerCase() === requestedBrand.toLowerCase()
        )
      })
    }

    // Score and rank mechanics
    const scoredMechanics = filteredMechanics.map(mechanic => {
      let score = 0
      const matchReasons: string[] = []

      // Availability score (highest priority) - use currently_on_shift as single source of truth
      if (mechanic.currently_on_shift) {
        score += 50
        matchReasons.push('Available now')
      } else {
        score += 20
      }

      // Location matching
      if (customerCountry && mechanic.country) {
        if (mechanic.country.toLowerCase() === customerCountry.toLowerCase()) {
          score += 25
          matchReasons.push(`Located in ${mechanic.country}`)

          // City match
          if (customerCity && mechanic.city) {
            if (mechanic.city.toLowerCase() === customerCity.toLowerCase()) {
              score += 35
              matchReasons.push(`Local to ${mechanic.city}`)
            }
          }

          // Postal code FSA match (first 3 characters)
          if (customerPostalCode && mechanic.postal_code) {
            const customerFSA = customerPostalCode.replace(/\s+/g, '').substring(0, 3).toUpperCase()
            const mechanicFSA = mechanic.postal_code.replace(/\s+/g, '').substring(0, 3).toUpperCase()

            if (customerFSA === mechanicFSA) {
              score += 40
              matchReasons.push(`Same area (${mechanicFSA})`)
            }
          }
        } else if (preferLocalMechanic) {
          // Different country - penalty
          score -= 20
        }
      }

      // Experience bonus
      const experience = mechanic.years_of_experience || 0
      if (experience >= 10) {
        score += 20
        matchReasons.push('10+ years experience')
      } else if (experience >= 5) {
        score += 10
        matchReasons.push('5+ years experience')
      }

      // Rating bonus
      const rating = mechanic.rating || 0
      if (rating >= 4.5) {
        score += 15
        matchReasons.push('Highly rated (4.5+)')
      } else if (rating >= 4.0) {
        score += 10
      }

      // Professional certification (Red Seal, Provincial, ASE, CPA, etc.)
      if (mechanic.red_seal_certified) {
        score += 10
        matchReasons.push('Professionally Certified')
      }

      // Brand specialist bonus
      if (requestType === 'brand_specialist' && mechanic.is_brand_specialist && requestedBrand) {
        score += 30
        matchReasons.push(`${requestedBrand} specialist`)
      }

      // Completed sessions bonus
      const completedSessions = mechanic.completed_sessions || 0
      if (completedSessions >= 50) {
        score += 12
        matchReasons.push('50+ sessions')
      } else if (completedSessions >= 20) {
        score += 8
      }

      // Calculate presence status based on currently_on_shift (single source of truth)
      let presenceStatus: 'online' | 'offline' | 'away' = 'offline'
      let lastSeenText = 'Offline'

      if (mechanic.currently_on_shift) {
        presenceStatus = 'online'
        lastSeenText = 'Available now'
      } else if (mechanic.last_clock_in) {
        const lastSeen = new Date(mechanic.last_clock_in)
        const minutesAgo = Math.floor((Date.now() - lastSeen.getTime()) / 60000)

        if (minutesAgo < 5) {
          presenceStatus = 'away'
          lastSeenText = 'Active recently'
        } else if (minutesAgo < 60) {
          lastSeenText = `${minutesAgo}m ago`
        } else if (minutesAgo < 1440) {
          lastSeenText = `${Math.floor(minutesAgo / 60)}h ago`
        } else {
          lastSeenText = 'Offline'
        }
      }

      // Get workshop name from organizations join or fallback to shop_affiliation
      const workshopName = (mechanic as any).organizations?.name || mechanic.shop_affiliation || null

      return {
        id: mechanic.id,
        userId: mechanic.user_id,
        name: mechanic.name || 'Mechanic',
        email: mechanic.email,
        rating: rating,
        yearsExperience: experience,
        isAvailable: mechanic.currently_on_shift, // Use currently_on_shift as single source of truth
        lastSeenAt: mechanic.last_clock_in,
        presenceStatus,
        lastSeenText,
        isBrandSpecialist: mechanic.is_brand_specialist || false,
        brandSpecializations: mechanic.brand_specializations || [],
        serviceKeywords: mechanic.service_keywords || [],
        country: mechanic.country,
        city: mechanic.city,
        postalCode: mechanic.postal_code,
        completedSessions: completedSessions,
        redSealCertified: mechanic.red_seal_certified || false,
        workshopName: workshopName,
        matchScore: score,
        matchReasons,
        profileCompletionScore: mechanic.profile_completion_score || 0
      }
    })

    // Sort by score (descending), then by availability, then by rating
    const sortedMechanics = scoredMechanics
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
        if (a.presenceStatus === 'online' && b.presenceStatus !== 'online') return -1
        if (b.presenceStatus === 'online' && a.presenceStatus !== 'online') return 1
        return b.rating - a.rating
      })
      .slice(0, limit)

    return NextResponse.json({
      mechanics: sortedMechanics,
      count: sortedMechanics.length,
      total: filteredMechanics.length
    })
  } catch (error) {
    console.error('[Available Mechanics] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
