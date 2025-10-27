import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabaseServer'

/**
 * DEBUG ENDPOINT - Check authentication status
 * GET /api/debug/auth-status?sessionId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      sessionId,
    }

    // Get the session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json({
        error: 'Session not found',
        details: sessionError?.message
      }, { status: 404 })
    }

    results.session = {
      id: session.id,
      status: session.status,
      type: session.type,
      customer_user_id: session.customer_user_id,
      mechanic_id: session.mechanic_id,
      created_at: session.created_at,
    }

    // Check customer auth (Supabase)
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    results.customerAuth = {
      authenticated: !!user,
      userId: user?.id || null,
      email: user?.email || null,
      isCustomerForThisSession: user?.id === session.customer_user_id,
    }

    // Check mechanic auth (cookie)
    const cookieStore = cookies()
    const mechanicToken = cookieStore.get('aad_mech')?.value

    results.mechanicAuth = {
      hasCookie: !!mechanicToken,
      tokenPreview: mechanicToken ? mechanicToken.substring(0, 15) + '...' : null,
    }

    if (mechanicToken) {
      // Check if token is valid
      const { data: mechanicSession, error: tokenError } = await supabaseAdmin
        .from('mechanic_sessions')
        .select('mechanic_id, expires_at')
        .eq('token', mechanicToken)
        .maybeSingle()

      if (tokenError || !mechanicSession) {
        results.mechanicAuth.tokenValid = false
        results.mechanicAuth.tokenError = tokenError?.message || 'Token not found in database'
      } else {
        const isExpired = new Date(mechanicSession.expires_at) < new Date()
        results.mechanicAuth.tokenValid = !isExpired
        results.mechanicAuth.mechanicId = mechanicSession.mechanic_id
        results.mechanicAuth.expiresAt = mechanicSession.expires_at
        results.mechanicAuth.isExpired = isExpired
        results.mechanicAuth.isMechanicForThisSession = mechanicSession.mechanic_id === session.mechanic_id

        // Get mechanic details
        if (!isExpired) {
          const { data: mechanic } = await supabaseAdmin
            .from('mechanics')
            .select('id, name, email')
            .eq('id', mechanicSession.mechanic_id)
            .maybeSingle()

          results.mechanicAuth.mechanicDetails = mechanic
        }
      }
    } else {
      results.mechanicAuth.tokenValid = false
      results.mechanicAuth.reason = 'No mechanic cookie found'
    }

    // Determine expected role
    if (user?.id === session.customer_user_id) {
      results.expectedRole = 'customer'
    } else if (results.mechanicAuth.isMechanicForThisSession) {
      results.expectedRole = 'mechanic'
    } else {
      results.expectedRole = 'unknown - not authorized for this session'
    }

    // Recommendations
    const recommendations: string[] = []

    if (!results.customerAuth.authenticated && !results.mechanicAuth.hasCookie) {
      recommendations.push('Not authenticated as either customer or mechanic')
    }

    if (results.mechanicAuth.hasCookie && !results.mechanicAuth.tokenValid) {
      recommendations.push('Mechanic cookie exists but is invalid/expired - re-login at /mechanic/login')
    }

    if (results.mechanicAuth.tokenValid && !results.mechanicAuth.isMechanicForThisSession) {
      recommendations.push('Authenticated as a mechanic, but not the mechanic assigned to this session')
    }

    if (results.customerAuth.authenticated && !results.customerAuth.isCustomerForThisSession) {
      recommendations.push('Authenticated as a customer, but not the customer who created this session')
    }

    if (recommendations.length === 0) {
      recommendations.push('Authentication looks correct!')
    }

    results.recommendations = recommendations

    return NextResponse.json(results)

  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
