/**
 * Smart Mechanic Matching Algorithm
 * Matches customers with mechanics based on request type, keywords, and availability
 */

import { createClient } from '@/lib/supabase/server'

export interface MatchingCriteria {
  requestType: 'general' | 'brand_specialist'
  requestedBrand?: string
  extractedKeywords: string[]
  customerCountry?: string
  customerCity?: string
  preferLocalMechanic?: boolean
  urgency?: 'immediate' | 'scheduled'
}

export interface MechanicMatch {
  mechanicId: string
  mechanicName: string
  profilePhoto: string | null
  matchScore: number
  matchReasons: string[]
  availability: 'online' | 'offline'
  yearsExperience: number
  rating: number
  isBrandSpecialist: boolean
  brandSpecializations: string[]
  serviceKeywords: string[]
  country: string | null
  city: string | null
  isLocalMatch: boolean
}

/**
 * Find and score mechanics based on customer requirements
 * Returns top 10 matches sorted by score
 */
export async function findMatchingMechanics(
  criteria: MatchingCriteria
): Promise<MechanicMatch[]> {
  const supabase = await createClient()

  // Step 1: Base query - only mechanics who can accept sessions
  let query = supabase
    .from('mechanics')
    .select('*')
    .eq('can_accept_sessions', true)
    .eq('status', 'approved')

  // Step 2: Filter by request type
  if (criteria.requestType === 'brand_specialist') {
    if (!criteria.requestedBrand) {
      throw new Error('Brand must be specified for specialist request')
    }

    // Only brand specialists with matching brand
    query = query
      .eq('is_brand_specialist', true)
      .contains('brand_specializations', [criteria.requestedBrand])
  }
  // For general requests, include ALL mechanics (both general and specialists)
  // Specialists can handle general requests too!

  const { data: mechanics, error } = await query

  if (error) {
    console.error('[Matching] Error fetching mechanics:', error)
    throw new Error('Failed to fetch mechanics')
  }

  if (!mechanics || mechanics.length === 0) {
    return []
  }

  // Step 3: Score each mechanic
  const scoredMechanics: MechanicMatch[] = mechanics.map(mechanic => {
    let score = 0
    const matchReasons: string[] = []

    // Base score for availability (highest priority)
    if (mechanic.is_available) {
      score += 50
      matchReasons.push('Available now')
    } else {
      score += 20
      matchReasons.push('Available soon')
    }

    // Keyword matching - critical for service quality
    if (criteria.extractedKeywords.length > 0 && mechanic.service_keywords) {
      const keywordMatches = criteria.extractedKeywords.filter(keyword =>
        mechanic.service_keywords?.some((mk: string) =>
          mk.toLowerCase().includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(mk.toLowerCase())
        )
      )

      if (keywordMatches.length > 0) {
        const keywordScore = keywordMatches.length * 15
        score += keywordScore
        matchReasons.push(`Expert in: ${keywordMatches.join(', ')}`)
      }
    }

    // Brand specialist bonus (if applicable to request type)
    if (criteria.requestType === 'brand_specialist' && mechanic.is_brand_specialist) {
      score += 30
      matchReasons.push(`${criteria.requestedBrand} specialist`)
    }

    // Experience bonus
    const experience = mechanic.years_of_experience || 0
    if (experience >= 10) {
      score += 20
      matchReasons.push('10+ years experience')
    } else if (experience >= 5) {
      score += 10
      matchReasons.push('5+ years experience')
    } else if (experience >= 2) {
      score += 5
    }

    // Rating bonus
    const rating = mechanic.rating || 0
    if (rating >= 4.5) {
      score += 15
      matchReasons.push('Highly rated (4.5+)')
    } else if (rating >= 4.0) {
      score += 10
      matchReasons.push('Well rated (4.0+)')
    } else if (rating >= 3.5) {
      score += 5
    }

    // Red Seal certification
    if (mechanic.red_seal_certified) {
      score += 10
      matchReasons.push('Red Seal Certified')
    }

    // Profile completion bonus (higher completion = more reliable)
    const completionScore = mechanic.profile_completion_score || 0
    if (completionScore >= 95) {
      score += 8
      matchReasons.push('Complete profile')
    } else if (completionScore >= 90) {
      score += 5
    }

    // Completed sessions bonus (experienced with platform)
    const completedSessions = mechanic.completed_sessions || 0
    if (completedSessions >= 50) {
      score += 12
      matchReasons.push('50+ sessions completed')
    } else if (completedSessions >= 20) {
      score += 8
      matchReasons.push('20+ sessions completed')
    } else if (completedSessions >= 5) {
      score += 4
    }

    // Location matching
    let isLocalMatch = false
    if (criteria.customerCountry && mechanic.country) {
      // Same country bonus
      if (mechanic.country.toLowerCase() === criteria.customerCountry.toLowerCase()) {
        score += 25
        matchReasons.push(`Located in ${mechanic.country}`)

        // Same city bonus (if customer prefers local)
        if (criteria.customerCity && mechanic.city &&
            criteria.preferLocalMechanic !== false) {
          if (mechanic.city.toLowerCase() === criteria.customerCity.toLowerCase()) {
            score += 35
            matchReasons.push(`Local to ${mechanic.city}`)
            isLocalMatch = true
          }
        }
      } else {
        // Different country - significant penalty if customer prefers local
        if (criteria.preferLocalMechanic !== false) {
          score -= 20
        }
      }
    }

    return {
      mechanicId: mechanic.id,
      mechanicName: mechanic.name || 'Mechanic',
      profilePhoto: null, // TODO: Add profile photo field to mechanics table
      matchScore: score,
      matchReasons,
      availability: mechanic.is_available ? 'online' : 'offline',
      yearsExperience: experience,
      rating,
      isBrandSpecialist: mechanic.is_brand_specialist || false,
      brandSpecializations: mechanic.brand_specializations || [],
      serviceKeywords: mechanic.service_keywords || [],
      country: mechanic.country,
      city: mechanic.city,
      isLocalMatch
    }
  })

  // Step 4: Sort by score (highest first) and return top 10
  return scoredMechanics
    .sort((a, b) => {
      // Primary sort: by score (descending)
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore
      }
      // Secondary sort: online first
      if (a.availability === 'online' && b.availability !== 'online') return -1
      if (b.availability === 'online' && a.availability !== 'online') return 1
      // Tertiary sort: by rating (descending)
      return b.rating - a.rating
    })
    .slice(0, 10)
}

/**
 * Extract keywords from customer description using simple pattern matching
 * Can be enhanced with NLP in the future
 */
export function extractKeywordsFromDescription(description: string): string[] {
  if (!description || description.trim().length === 0) {
    return []
  }

  const text = description.toLowerCase()
  const keywords: string[] = []

  // Common service patterns
  const servicePatterns = [
    // Installation
    { pattern: /backup camera|rear.?view camera|reversing camera/, keyword: 'backup camera installation' },
    { pattern: /dash ?cam|dashboard camera/, keyword: 'dashcam installation' },
    { pattern: /remote start|remote starter/, keyword: 'remote starter installation' },
    { pattern: /audio|radio|stereo|speaker/, keyword: 'audio system installation' },
    { pattern: /gps.?tracker|tracking.?device/, keyword: 'GPS tracker installation' },
    { pattern: /alarm|security.?system/, keyword: 'alarm system installation' },

    // Diagnostics
    { pattern: /check.?engine|engine.?light|cel/, keyword: 'check engine light' },
    { pattern: /abs.?light|abs.?warning/, keyword: 'ABS warning' },
    { pattern: /airbag.?light|srs.?light/, keyword: 'airbag light' },
    { pattern: /transmission.?(?:diagnostic|issue|problem)/, keyword: 'transmission diagnostic' },
    { pattern: /electrical.?(?:diagnostic|issue|problem)/, keyword: 'electrical diagnostic' },
    { pattern: /engine.?(?:diagnostic|issue|problem|noise)/, keyword: 'engine diagnostic' },
    { pattern: /hvac|air.?conditioning|heater|ac/, keyword: 'HVAC diagnostic' },
    { pattern: /battery|won't.?start|no.?start/, keyword: 'battery diagnostic' },

    // Repairs
    { pattern: /brake.?(?:repair|fix|issue|problem|noise)/, keyword: 'brake repair' },
    { pattern: /suspension|shock|strut/, keyword: 'suspension repair' },
    { pattern: /engine.?repair/, keyword: 'engine repair' },
    { pattern: /transmission.?repair/, keyword: 'transmission repair' },
    { pattern: /steering|power.?steering/, keyword: 'steering repair' },
    { pattern: /exhaust|muffler|catalytic/, keyword: 'exhaust repair' },
    { pattern: /cooling|radiator|overheating/, keyword: 'cooling system repair' },
    { pattern: /fuel.?system/, keyword: 'fuel system repair' },

    // Maintenance
    { pattern: /oil.?change/, keyword: 'oil change' },
    { pattern: /tire.?rotation|rotate.?tires/, keyword: 'tire rotation' },
    { pattern: /brake.?pad|brake.?replacement/, keyword: 'brake pad replacement' },
    { pattern: /timing.?belt/, keyword: 'timing belt replacement' },
    { pattern: /air.?filter/, keyword: 'air filter replacement' },
    { pattern: /spark.?plug/, keyword: 'spark plug replacement' },
    { pattern: /coolant.?flush/, keyword: 'coolant flush' },
    { pattern: /transmission.?fluid/, keyword: 'transmission fluid change' },

    // Brand-specific
    { pattern: /bmw.?(?:coding|programming|diagnostic)/, keyword: 'BMW coding' },
    { pattern: /tesla.?(?:diagnostic|issue|problem)/, keyword: 'Tesla diagnostics' },
    { pattern: /mercedes.?(?:star|diagnostic)/, keyword: 'Mercedes STAR diagnostic' },
    { pattern: /audi.?(?:vcds|diagnostic)/, keyword: 'Audi VCDS diagnostic' },
    { pattern: /porsche.?(?:diagnostic|piwis)/, keyword: 'Porsche diagnostic' }
  ]

  for (const { pattern, keyword } of servicePatterns) {
    if (pattern.test(text)) {
      keywords.push(keyword)
    }
  }

  // Remove duplicates
  return [...new Set(keywords)]
}

/**
 * Get pricing for a request type
 */
export async function getPricingForRequest(
  requestType: 'general' | 'brand_specialist',
  duration: number = 30
): Promise<{ price: number; tierName: string; description: string } | null> {
  const supabase = await createClient()

  const mechanicType = requestType === 'brand_specialist' ? 'brand_specialist' : 'general'

  const { data, error } = await supabase
    .from('pricing_tiers')
    .select('*')
    .eq('mechanic_type', mechanicType)
    .eq('duration_minutes', duration)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    console.error('[Pricing] Error fetching pricing:', error)
    return null
  }

  return {
    price: data.base_price_cents / 100, // Convert cents to dollars
    tierName: data.tier_name,
    description: data.description
  }
}
