/**
 * POST /api/keywords/extract
 * Extract service keywords from customer description
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractKeywordsFromDescription } from '@/lib/mechanicMatching'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description } = body

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required and must be a string' },
        { status: 400 }
      )
    }

    if (description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters' },
        { status: 400 }
      )
    }

    // Extract keywords
    const keywords = extractKeywordsFromDescription(description)

    return NextResponse.json({
      keywords,
      description: description.substring(0, 200), // Return truncated for logging
      count: keywords.length
    })
  } catch (error: any) {
    console.error('[Keyword Extraction API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to extract keywords' },
      { status: 500 }
    )
  }
}
