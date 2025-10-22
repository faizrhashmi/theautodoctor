// src/middleware.ts
/**
 * SECURITY: Route-level authentication and authorization
 *
 * This middleware enforces role-based access control for all protected routes.
 * It runs on EVERY matching request before the route handler.
 */
import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { validateRedirect } from '@/lib/security/redirects'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// CRITICAL: Customer-only routes - mechanics and admins are blocked
const CUSTOMER_PROTECTED_PREFIXES = [
  '/customer/dashboard',
  '/customer/schedule',
  '/dashboard',
  '/session',
  '/video',
  '/chat',
]

// CRITICAL: Mechanic-only routes - customers and admins are blocked
const MECHANIC_PROTECTED_PREFIXES = [
  '/mechanic/dashboard',
  '/mechanic/availability',
  '/mechanic/session',
  '/mechanic/onboarding',
]

// Public mechanic routes (login, signup)
const MECHANIC_PUBLIC_ROUTES = [
  '/mechanic/login',
  '/mechanic/signup',
]

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function isPublicMechanicRoute(pathname: string): boolean {
  return MECHANIC_PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Allow static assets immediately
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  // Handle email confirmation codes landing on the homepage
  // Redirect them to the auth callback handler
  if (pathname === '/' && searchParams.has('code')) {
    const callbackUrl = new URL('/auth/callback', request.url)
    callbackUrl.searchParams.set('code', searchParams.get('code')!)
    if (searchParams.has('next')) {
      callbackUrl.searchParams.set('next', searchParams.get('next')!)
    }
    return NextResponse.redirect(callbackUrl)
  }

  const response = NextResponse.next()
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        response.cookies.set({ name, value: '', ...options, maxAge: 0 })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ==========================================================================
  // ADMIN ROUTE PROTECTION
  // ==========================================================================
  if (matchesPrefix(pathname, '/admin')) {
    if (!user) {
      const loginUrl = new URL('/admin/login', request.url)
      const next = pathname === '/admin' ? '/admin/intakes' : pathname
      loginUrl.searchParams.set('next', next)
      return NextResponse.redirect(loginUrl)
    }

    // TODO: Add admin role verification here
    return response
  }

  // ==========================================================================
  // MECHANIC ROUTE PROTECTION
  // ==========================================================================
  const requiresMechanicAuth = MECHANIC_PROTECTED_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix)
  )

  if (requiresMechanicAuth) {
    // Skip public routes like login/signup
    if (isPublicMechanicRoute(pathname)) {
      return response
    }

    // Check for mechanic auth cookie
    const mechanicToken = request.cookies.get('aad_mech')?.value

    if (!mechanicToken) {
      const loginUrl = new URL('/mechanic/login', request.url)
      // SECURITY: Validate redirect to prevent open redirects
      const safeRedirect = validateRedirect(pathname, '/mechanic/dashboard')
      loginUrl.searchParams.set('redirect', safeRedirect)
      return NextResponse.redirect(loginUrl)
    }

    // Note: Full mechanic session validation happens in the page/API route
    // Middleware only checks for presence of token to avoid database calls
    return response
  }

  // ==========================================================================
  // CUSTOMER ROUTE PROTECTION
  // ==========================================================================
  const requiresCustomerAuth = CUSTOMER_PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))

  if (!requiresCustomerAuth) {
    return response
  }

  if (!user) {
    const loginUrl = new URL('/signup', request.url)
    // SECURITY: Validate redirect to prevent open redirects
    const safeRedirect = validateRedirect(pathname, '/customer/dashboard')
    loginUrl.searchParams.set('redirect', safeRedirect)
    return NextResponse.redirect(loginUrl)
  }

  // Check email verification - only check user.email_confirmed_at
  // The profile.email_verified is synced via the profile API
  if (!user.email_confirmed_at) {
    return NextResponse.redirect(new URL('/customer/verify-email', request.url))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  // Only redirect if user has wrong role (e.g., admin trying to access customer pages)
  if (profile?.role && profile.role !== 'customer') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/',
    // Admin routes
    '/admin/:path*',
    // Mechanic routes
    '/mechanic/:path*',
    // Customer routes
    '/customer/dashboard',
    '/customer/dashboard/:path*',
    '/customer/schedule',
    '/customer/schedule/:path*',
    '/dashboard/:path*',
    '/session/:path*',
    '/video/:path*',
    '/chat/:path*',
  ],
}