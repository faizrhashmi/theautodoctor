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

export async function POST(req: NextRequest) {
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

    // Parse request body
    let body: any
    try {
      body = await req.json()
    } catch {
      return bad('Invalid JSON')
    }

    const {
      intakeId,
      signatureData,
      fullName,
      ipAddress,
      userAgent,
      email,
      plan = 'trial',
    } = body

    // Validate required fields
    if (!intakeId) {
      return bad('Intake ID is required')
    }

    if (!signatureData || typeof signatureData !== 'string' || !signatureData.startsWith('data:image')) {
      return bad('Valid signature data is required')
    }

    if (!fullName || fullName.trim().length < 2) {
      return bad('Full name is required')
    }

    if (!email) {
      return bad('Email is required')
    }

    // Check if intake exists and belongs to user (or is accessible)
    if (supabaseAdmin) {
      const { data: intake, error: intakeError } = await supabaseAdmin
        .from('intakes')
        .select('id, email, plan')
        .eq('id', intakeId)
        .single()

      if (intakeError || !intake) {
        return bad('Invalid intake ID', 404)
      }

      // Verify email matches
      if (intake.email !== email) {
        return bad('Email does not match intake record', 403)
      }

      // Check if waiver already signed for this intake
      const { data: existingWaiver } = await supabaseAdmin
        .from('waiver_signatures')
        .select('id')
        .eq('intake_id', intakeId)
        .eq('user_id', user.id)
        .single()

      if (existingWaiver) {
        return bad('Waiver already signed for this intake', 409)
      }

      // Insert waiver signature
      const { data: newWaiver, error: insertError } = await supabaseAdmin
        .from('waiver_signatures')
        .insert({
          user_id: user.id,
          intake_id: intakeId,
          signature_data: signatureData,
          ip_address: ipAddress || null,
          user_agent: userAgent || null,
          full_name: fullName.trim(),
          email: email,
          waiver_version: '1.0',
          is_valid: true,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('[waiver] Insert error:', insertError)
        return bad('Failed to save waiver signature', 500)
      }

      // Determine redirect URL based on plan
      let redirectUrl = '/thank-you'

      if (plan === 'trial' || plan === 'free' || plan === 'trial-free') {
        // Free plans go directly to thank you page
        const thankYouUrl = new URL('/thank-you', req.nextUrl.origin)
        thankYouUrl.searchParams.set('plan', plan)
        thankYouUrl.searchParams.set('intake_id', intakeId)

        // CRITICAL FIX: Check if there's an existing session for this intake and pass it through
        // This prevents the "Start session now" button from redirecting to /signup
        const { data: existingSession } = await supabaseAdmin
          .from('sessions')
          .select('id')
          .eq('intake_id', intakeId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existingSession) {
          thankYouUrl.searchParams.set('session', existingSession.id)
          console.log('[waiver] Found session for intake:', existingSession.id)
        } else {
          console.warn('[waiver] No session found for intake:', intakeId)
        }

        redirectUrl = `${thankYouUrl.pathname}${thankYouUrl.search}`
      } else {
        // Paid plans need to go to checkout
        redirectUrl = `/api/checkout/create-session?plan=${encodeURIComponent(plan)}&intake_id=${encodeURIComponent(intakeId)}`
      }

      return NextResponse.json({
        success: true,
        waiverId: newWaiver.id,
        redirect: redirectUrl,
      })
    }

    // Fallback for local development without Supabase
    return NextResponse.json({
      success: true,
      waiverId: 'local-waiver',
      redirect: '/thank-you',
    })
  } catch (error: any) {
    console.error('[waiver/submit] Error:', error)
    return bad('Internal server error', 500)
  }
}
