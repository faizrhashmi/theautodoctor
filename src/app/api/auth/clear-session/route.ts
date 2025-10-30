import { NextRequest, NextResponse } from 'next/server'

/**
 * Emergency endpoint to clear all authentication cookies
 * Use this when users get stuck with stale sessions
 */
export async function GET(req: NextRequest) {
  console.log('[clear-session] Clearing all authentication cookies...')

  // Redirect to homepage
  const redirectUrl = new URL('/', req.nextUrl.origin)
  const response = NextResponse.redirect(redirectUrl, 303)

  // Clear ALL Supabase cookies
  req.cookies.getAll().forEach((cookie) => {
    if (cookie.name.startsWith('sb-')) {
      console.log('[clear-session] Clearing cookie:', cookie.name)
      response.cookies.set({
        name: cookie.name,
        value: '',
        maxAge: 0,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    }
  })

  // CLEANED UP: Removed aad_mech cookie clearing (deprecated old mechanic auth)
  // All auth now handled by Supabase cookies (cleared above)

  console.log('[clear-session] All cookies cleared')

  return response
}
