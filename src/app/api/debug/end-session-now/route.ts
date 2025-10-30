import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/debug/end-session-now?sessionId=xxx
 *
 * Actually call the end session endpoint and show the full response
 * This bypasses the frontend to see exactly what's happening
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 })
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    sessionId,
  }

  try {
    // Get cookies from request
    const cookies = req.cookies.getAll()
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    // Make POST request to actual endpoint with cookies
    const response = await fetch(`${SUPABASE_URL.replace('/rest/v1', '')}/api/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: {
        'Cookie': cookieString,
        'Content-Type': 'application/json',
      },
    })

    const responseText = await response.text()
    let responseData: any

    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }

    results.endpointResponse = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseData,
    }

    if (!response.ok) {
      results.error = 'End session failed'
      results.details = {
        status: response.status,
        message: responseData?.error || responseData,
      }
    } else {
      results.success = true
      results.message = '✅ Session ended successfully'
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error: any) {
    console.error('[end-session-now] Error:', error)
    return NextResponse.json({
      error: 'Failed to call end endpoint',
      message: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}

/**
 * GET /api/debug/end-session-now?sessionId=xxx
 *
 * Check session requests for a mechanic
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mechanicEmail = searchParams.get('mechanicEmail') || 'workshop.mechanic@test.com'

  try {
    // Create server client with cookies
    const supabaseAsUser = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    // Check auth
    const { data: { user } } = await supabaseAsUser.auth.getUser()

    // Try to get session requests as mechanic
    const response = await fetch(`http://localhost:3000/api/mechanics/requests`, {
      headers: {
        Cookie: req.cookies.getAll().map(c => `${c.name}=${c.value}`).join('; '),
      },
    })

    const requestsData = await response.json()

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      mechanicEmail,
      authenticated: !!user,
      user_email: user?.email || null,
      requestsEndpointResponse: {
        status: response.status,
        ok: response.ok,
        data: requestsData,
      },
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}
