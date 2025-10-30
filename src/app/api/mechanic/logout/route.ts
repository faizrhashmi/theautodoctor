import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    console.log('[mechanic-logout] Signing out mechanic...')

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[mechanic-logout] Error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('[mechanic-logout] Sign out successful, clearing cookies...')

    // Create JSON response with cookie clearing
    const response = NextResponse.json({ success: true })

    // Clear ALL Supabase auth cookies - iterate through all request cookies
    // and delete any that look like Supabase auth cookies
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token',
      // Supabase SSR cookies (pattern: sb-<project-ref>-auth-token)
    ]

    // Get all cookies from the request
    req.cookies.getAll().forEach((cookie) => {
      // Clear any cookie that starts with 'sb-' (Supabase cookies)
      if (cookie.name.startsWith('sb-')) {
        console.log('[mechanic-logout] Clearing cookie:', cookie.name)
        response.cookies.set({
          name: cookie.name,
          value: '',
          maxAge: 0,
          path: '/',
          domain: undefined,
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        })
      }
    })

    // Also clear any hardcoded known cookie names
    cookiesToClear.forEach((name) => {
      response.cookies.set({
        name,
        value: '',
        maxAge: 0,
        path: '/',
        domain: undefined,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    })

    console.log('[mechanic-logout] All cookies cleared, returning success')

    return response
  } catch (error: any) {
    console.error('[mechanic-logout] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
