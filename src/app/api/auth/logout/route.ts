import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/auth/logout
 *
 * Logs out the user and clears all session cookies
 */
export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        response.cookies.set({ name, value: '', ...options, maxAge: 0 })
      },
    },
  })

  try {
    // Sign out from Supabase (this clears auth cookies)
    await supabase.auth.signOut()

    // CLEANED UP: Removed aad_mech cookie (deprecated old mechanic auth)
    // Also manually clear any Supabase cookies
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token',
    ]

    cookiesToClear.forEach(cookieName => {
      response.cookies.set({
        name: cookieName,
        value: '',
        maxAge: 0,
        path: '/',
      })
    })

    console.log('[auth/logout] User logged out successfully')
    return response
  } catch (error) {
    console.error('[auth/logout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}
