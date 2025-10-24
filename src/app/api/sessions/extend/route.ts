/**
 * SHIM: Forward to canonical /api/session/extend
 *
 * This route exists for backwards compatibility and route normalization.
 * All extend requests are handled by the canonical endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Forward to canonical route
    const body = await req.json()

    const canonicalUrl = new URL('/api/session/extend', req.url)

    const response = await fetch(canonicalUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward auth cookies
        cookie: req.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[sessions/extend] Error forwarding to canonical:', error)
    return NextResponse.json(
      { error: 'Failed to process extension request' },
      { status: 500 }
    )
  }
}
