// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

export async function GET(req: NextRequest) {
  try {
    // Create Supabase client with auth
    const supabaseClient = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })

    // Get authenticated user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return bad('Authentication required', 401)
    }

    // Get intake_id from query params
    const searchParams = req.nextUrl.searchParams
    const intakeId = searchParams.get('intake_id')

    if (!intakeId) {
      return bad('Intake ID is required')
    }

    if (supabaseAdmin) {
      // Check if intake exists
      const { data: intake, error: intakeError } = await supabaseAdmin
        .from('intakes')
        .select('id, email, plan')
        .eq('id', intakeId)
        .single()

      if (intakeError || !intake) {
        return NextResponse.json({
          signed: false,
          exists: false,
          error: 'Intake not found',
        }, { status: 404 })
      }

      // Check if waiver already signed
      const { data: waiver, error: waiverError } = await supabaseAdmin
        .from('waiver_signatures')
        .select('id, signed_at, is_valid')
        .eq('intake_id', intakeId)
        .eq('user_id', user.id)
        .eq('is_valid', true)
        .single()

      if (waiver) {
        // Waiver already signed, determine where to redirect
        let redirectUrl = '/thank-you'

        const plan = intake.plan || 'trial'

        if (plan === 'trial' || plan === 'free' || plan === 'trial-free') {
          // Free plans go to thank you
          const thankYouUrl = new URL('/thank-you', req.nextUrl.origin)
          thankYouUrl.searchParams.set('plan', plan)
          thankYouUrl.searchParams.set('intake_id', intakeId)
          redirectUrl = `${thankYouUrl.pathname}${thankYouUrl.search}`
        } else {
          // Paid plans need checkout
          redirectUrl = `/api/checkout/create-session?plan=${encodeURIComponent(plan)}&intake_id=${encodeURIComponent(intakeId)}`
        }

        return NextResponse.json({
          signed: true,
          waiverId: waiver.id,
          signedAt: waiver.signed_at,
          redirect: redirectUrl,
        })
      }

      // Not signed yet
      return NextResponse.json({
        signed: false,
        exists: true,
        plan: intake.plan,
      })
    }

    // Fallback for local development
    return NextResponse.json({
      signed: false,
      exists: true,
      plan: 'trial',
    })
  } catch (error: any) {
    console.error('[waiver/check] Error:', error)
    return bad('Internal server error', 500)
  }
}
