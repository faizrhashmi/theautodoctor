import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { withDebugAuth } from '@/lib/debugAuth'

/**
 * DEBUG ENDPOINT - Check authentication status
 * GET /api/debug/auth-status?sessionId=xxx
 */
async function getHandler(req: NextRequest) {
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

    // CLEANED UP: Check mechanic auth (Supabase Auth - unified system)
    // Check if user is a mechanic
    results.mechanicAuth = {
      authenticated: false,
      mechanicId: null,
      isMechanicForThisSession: false,
    }

    if (user) {
      // Check if user is a mechanic by checking profile role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role === 'mechanic') {
        // Get mechanic record
        const { data: mechanic } = await supabaseAdmin
          .from('mechanics')
          .select('id, name, email')
          .eq('user_id', user.id)
          .maybeSingle()

        if (mechanic) {
          results.mechanicAuth = {
            authenticated: true,
            mechanicId: mechanic.id,
            mechanicDetails: mechanic,
            isMechanicForThisSession: mechanic.id === session.mechanic_id,
          }
        }
      }
    }

    // DEBUG: Also check old auth system (for debugging migration issues)
    const cookieStore = cookies()
    const mechanicToken = cookieStore.get('aad_mech')?.value

    if (mechanicToken) {
      results.mechanicAuth.oldAuthWarning = 'DEPRECATED: aad_mech cookie found - should be migrated to Supabase Auth'
      results.mechanicAuth.oldCookiePresent = true
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

    if (!results.customerAuth.authenticated && !results.mechanicAuth.authenticated) {
      recommendations.push('Not authenticated as either customer or mechanic')
    }

    if (results.mechanicAuth.oldCookiePresent) {
      recommendations.push('MIGRATION NEEDED: Old aad_mech cookie detected - user should re-login to migrate to Supabase Auth')
    }

    if (results.mechanicAuth.authenticated && !results.mechanicAuth.isMechanicForThisSession) {
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

// Apply debug authentication wrapper
export const GET = withDebugAuth(getHandler)
