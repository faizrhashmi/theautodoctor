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
      // Get waiver for this intake and user
      const { data: waiver, error } = await supabaseAdmin
        .from('waiver_signatures')
        .select('*')
        .eq('intake_id', intakeId)
        .eq('user_id', user.id)
        .single()

      if (error || !waiver) {
        return NextResponse.json({
          found: false,
          error: 'Waiver not found',
        }, { status: 404 })
      }

      // Return waiver data (without signature_data for security unless explicitly requested)
      const includeSignature = searchParams.get('include_signature') === 'true'

      return NextResponse.json({
        found: true,
        waiver: {
          id: waiver.id,
          signed_at: waiver.signed_at,
          waiver_version: waiver.waiver_version,
          full_name: waiver.full_name,
          email: waiver.email,
          is_valid: waiver.is_valid,
          ...(includeSignature && { signature_data: waiver.signature_data }),
        },
      })
    }

    // Fallback for local development
    return NextResponse.json({
      found: false,
      error: 'Local mode - no waiver data',
    }, { status: 404 })
  } catch (error: any) {
    console.error('[waiver/get] Error:', error)
    return bad('Internal server error', 500)
  }
}
