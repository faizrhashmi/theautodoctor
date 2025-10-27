import { NextRequest, NextResponse } from 'next/server'

/**
 * DEPRECATED ENDPOINT
 *
 * This endpoint has been deprecated in favor of the canonical accept endpoint.
 * Please use POST /api/mechanic/accept instead.
 *
 * This endpoint will redirect all requests to the new endpoint to maintain
 * backwards compatibility.
 *
 * @deprecated Use /api/mechanic/accept instead
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.warn('[DEPRECATED] /api/mechanics/requests/[id]/accept is deprecated. Use /api/mechanic/accept instead.')

  const requestId = params.id

  // Redirect to the canonical accept endpoint
  try {
    const body = JSON.stringify({ requestId })

    // Make internal request to new endpoint
    const response = await fetch(new URL('/api/mechanic/accept', req.nextUrl.origin), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.get('Cookie') || '',
      },
      body,
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.error('[DEPRECATED ENDPOINT] Error redirecting to new endpoint:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Please use /api/mechanic/accept endpoint instead',
        deprecated: true,
      },
      { status: 500 }
    )
  }
}
