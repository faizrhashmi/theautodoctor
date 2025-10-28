import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createServerClient } from '@supabase/ssr'
import { withDebugAuth } from '@/lib/debugAuth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getHandler(req: NextRequest) {
  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        error: 'Not authenticated',
        authError: authError?.message
      }, { status: 401 })
    }

    // Try client-side query (RLS enforced)
    const { data: clientData, error: clientError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)

    // Try admin query (bypasses RLS)
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)

    // Count all vehicles in database
    const { count: totalCount } = await supabaseAdmin
      .from('vehicles')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      clientQuery: {
        success: !clientError,
        error: clientError?.message || null,
        count: clientData?.length || 0,
        data: clientData
      },
      adminQuery: {
        success: !adminError,
        error: adminError?.message || null,
        count: adminData?.length || 0,
        data: adminData
      },
      totalVehiclesInDatabase: totalCount,
      diagnosis: {
        hasVehicles: (adminData?.length || 0) > 0,
        rlsBlocking: !clientError && clientData?.length === 0 && (adminData?.length || 0) > 0,
        authWorking: !!user,
        recommendation: !clientError && clientData?.length === 0 && (adminData?.length || 0) > 0
          ? 'RLS policy is blocking vehicle reads. Check Supabase RLS policies on vehicles table.'
          : clientError
          ? `Query error: ${clientError.message}`
          : clientData?.length === 0
          ? 'No vehicles found for this user'
          : 'Everything looks OK'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

// Apply debug authentication wrapper
export const GET = withDebugAuth(getHandler)
