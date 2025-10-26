/**
 * POST /api/matching/find-mechanics
 * Find and rank mechanics based on customer requirements
 */

import { NextRequest, NextResponse } from 'next/server'
import { findMatchingMechanics, type MatchingCriteria } from '@/lib/mechanicMatching'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const criteria: MatchingCriteria = {
      requestType: body.requestType || 'general',
      requestedBrand: body.requestedBrand,
      extractedKeywords: body.extractedKeywords || [],
      customerLocation: body.customerLocation,
      urgency: body.urgency || 'scheduled'
    }

    // Validate request type
    if (!['general', 'brand_specialist'].includes(criteria.requestType)) {
      return NextResponse.json(
        { error: 'Invalid request type. Must be "general" or "brand_specialist"' },
        { status: 400 }
      )
    }

    // Validate brand specialist requests have a brand
    if (criteria.requestType === 'brand_specialist' && !criteria.requestedBrand) {
      return NextResponse.json(
        { error: 'Brand is required for brand specialist requests' },
        { status: 400 }
      )
    }

    // Find matching mechanics
    const matches = await findMatchingMechanics(criteria)

    return NextResponse.json({
      matches,
      totalFound: matches.length,
      criteria
    })
  } catch (error: any) {
    console.error('[Matching API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to find matching mechanics' },
      { status: 500 }
    )
  }
}
