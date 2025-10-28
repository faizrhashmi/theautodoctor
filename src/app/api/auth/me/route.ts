import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: NextRequest) {
  try {
    console.log('[auth/me] Checking server authentication...')
    
    // Create Supabase client with auth
    const supabaseClient = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          const cookie = req.cookies.get(name)?.value
          console.log(`[auth/me] Cookie ${name}:`, cookie ? 'PRESENT' : 'MISSING')
          return cookie
        },
        set() {},
        remove() {},
      },
    })

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    console.log('[auth/me] Auth check result:', {
      user: user?.email,
      error: authError?.message,
      hasUser: !!user
    })

    if (authError) {
      console.error('[auth/me] Auth error:', authError)
      return NextResponse.json({ 
        error: 'Authentication failed',
        details: authError.message 
      }, { status: 401 })
    }

    if (!user) {
      console.log('[auth/me] No user found in session')
      return NextResponse.json({ 
        error: 'Not authenticated',
        user: null 
      }, { status: 401 })
    }

    console.log('[auth/me] User authenticated:', user.email)
    
    // Get profile info if admin client is available
    let profileData = null
    if (supabaseAdmin) {
      try {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('full_name, phone, role')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('[auth/me] Profile fetch error:', profileError)
        } else {
          profileData = profile
          console.log('[auth/me] Profile found:', profile)
        }
      } catch (profileError) {
        console.error('[auth/me] Profile error:', profileError)
      }
    }

    // Return user data including profile info
    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        name: profileData?.full_name || '',
        phone: profileData?.phone || '',
        role: profileData?.role || 'customer',
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
      },
      authenticated: true,
      timestamp: new Date().toISOString()
    }

    console.log('[auth/me] Returning user data:', responseData.user.email)
    return NextResponse.json(responseData)
    
  } catch (error) {
    console.error('[auth/me] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}