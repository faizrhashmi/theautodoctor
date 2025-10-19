// src/middleware.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Protect /admin/* pages using a simple cookie ("admin" === "1").
 * - Redirects unauthenticated users to /admin/login on the SAME host.
 * - Preserves the original path in ?next= for post-login return.
 * - Never reads process.env (Edge-safe).
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const pathname = url.pathname

  // allow the login & logout pages through without checks
  const isLoginPage = pathname.startsWith('/admin/login')
  const isLogoutPage = pathname.startsWith('/admin/logout')
  if (isLoginPage || isLogoutPage) {
    return NextResponse.next()
  }

  // read the admin cookie
  const isAdmin = req.cookies.get('admin')?.value === '1'
  if (isAdmin) {
    return NextResponse.next()
  }

  // Build a redirect URL that uses the REAL host (no localhost:10000)
  // Prefer forwarded headers if present; otherwise use req.nextUrl.origin.
  const xfHost = req.headers.get('x-forwarded-host')
  const xfProto = req.headers.get('x-forwarded-proto') || 'https'
  const origin =
    xfHost ? `${xfProto}://${xfHost}` : url.origin

  const redirectUrl = new URL('/admin/login', origin)

  // Preserve original destination for post-login return
  const returnTo = pathname + (url.search || '')
  redirectUrl.searchParams.set('next', returnTo)

  return NextResponse.redirect(redirectUrl)
}

// Run only on /admin/* pages (not on API routes, _next assets, etc.)
export const config = {
  matcher: ['/admin/:path*'],
}
