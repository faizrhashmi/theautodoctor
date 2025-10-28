// src/middleware.ts
/**
 * SECURITY: Route-level authentication and authorization
 *
 * This middleware enforces role-based access control for all protected routes.
 * It runs on EVERY matching request before the route handler.
 */
import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { validateRedirect } from '@/lib/security/redirects'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create admin client for privileged operations (bypasses RLS)
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// CRITICAL: Customer-only routes - mechanics and admins are blocked
// Note: /chat and /video are NOT included here because they're accessible by both customers AND mechanics
// These pages handle authentication for both roles based on session assignment
const CUSTOMER_PROTECTED_PREFIXES = [
  '/customer/dashboard',
  '/customer/schedule',
  '/dashboard',
  '/session',
  '/intake',
  '/waiver',
  '/onboarding/pricing',
]

// Public mechanic routes (login, signup, onboarding) - these DO NOT require authentication
const MECHANIC_PUBLIC_ROUTES = [
  '/mechanic/login',
  '/mechanic/signup',
  '/mechanic/onboarding',
]

// CRITICAL: All other /mechanic/* routes require authentication
// This is checked by verifying the presence of the aad_mech cookie

// Public workshop routes (login, signup) - these DO NOT require authentication
const WORKSHOP_PUBLIC_ROUTES = [
  '/workshop/login',
  '/workshop/signup',
]

// CRITICAL: All other /workshop/* routes require authentication
// This is checked via Supabase auth and organization membership

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function isPublicMechanicRoute(pathname: string): boolean {
  return MECHANIC_PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))
}

function isPublicWorkshopRoute(pathname: string): boolean {
  return WORKSHOP_PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))
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

  // Try to get user, but handle errors gracefully
  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.log('[MIDDLEWARE] Auth error:', error.message)

      // Clear ALL Supabase auth cookies on error
      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name.startsWith('sb-')) {
          console.log('[MIDDLEWARE] Clearing invalid cookie:', cookie.name)
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

      // Also clear known cookie names
      const knownCookies = ['sb-access-token', 'sb-refresh-token']
      knownCookies.forEach((name) => {
        response.cookies.set({
          name,
          value: '',
          maxAge: 0,
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        })
      })
    } else {
      user = data.user
    }
  } catch (error) {
    console.error('[MIDDLEWARE] Exception getting user:', error)
    // Clear cookies on exception too
    request.cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith('sb-')) {
        response.cookies.set({
          name: cookie.name,
          value: '',
          maxAge: 0,
          path: '/',
        })
      }
    })
  }

  // ==========================================================================
  // ADMIN ROUTE PROTECTION
  // ==========================================================================
  if (matchesPrefix(pathname, '/admin')) {
    // Allow access to login page without auth
    if (pathname === '/admin/login') {
      return response
    }

    console.log(`[MIDDLEWARE] 🔍 Admin route check for: ${pathname}`)
    console.log(`[MIDDLEWARE] User authenticated: ${!!user}`)

    if (!user) {
      console.log(`[MIDDLEWARE] ⚠️  No user found - redirecting to login`)
      const loginUrl = new URL('/admin/login', request.url)
      const next = pathname === '/admin' ? '/admin/intakes' : pathname
      loginUrl.searchParams.set('next', next)
      return NextResponse.redirect(loginUrl)
    }

    console.log(`[MIDDLEWARE] User ID: ${user.id}`)
    console.log(`[MIDDLEWARE] User email: ${user.email}`)

    // ✅ SECURITY FIX: Verify admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', user.id)
      .maybeSingle()

    console.log(`[MIDDLEWARE] Profile found: ${!!profile}`)
    console.log(`[MIDDLEWARE] Profile role: ${profile?.role || 'NONE'}`)

    if (profileError) {
      console.error(`[MIDDLEWARE] ❌ Profile fetch error:`, profileError)
    }

    if (!profile || profile.role !== 'admin') {
      console.warn(
        `[SECURITY] ❌ Non-admin user ${user.email} (${user.id}) attempted to access ${pathname}`,
        { hasProfile: !!profile, role: profile?.role }
      )
      // Redirect non-admins to home page
      console.log(`[MIDDLEWARE] 🔴 REDIRECTING TO HOMEPAGE`)
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Log admin access for security monitoring
    console.log(`[ADMIN] ✅ ${profile.full_name || profile.email} accessing ${pathname}`)

    return response
  }

  // ==========================================================================
  // MECHANIC ROUTE PROTECTION
  // ==========================================================================
  // All /mechanic/* routes require authentication EXCEPT public routes
  const isMechanicRoute = pathname.startsWith('/mechanic/')

  if (isMechanicRoute) {
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
  // WORKSHOP ROUTE PROTECTION
  // ==========================================================================
  // All /workshop/* routes require authentication EXCEPT public routes
  const isWorkshopRoute = pathname.startsWith('/workshop/')

  if (isWorkshopRoute) {
    // Skip public routes like login/signup
    if (isPublicWorkshopRoute(pathname)) {
      return response
    }

    console.log(`[MIDDLEWARE] 🔍 Workshop route check for: ${pathname}`)
    console.log(`[MIDDLEWARE] User authenticated: ${!!user}`)

    if (!user) {
      console.log(`[MIDDLEWARE] ⚠️  No user found - redirecting to login`)
      const loginUrl = new URL('/workshop/login', request.url)
      const safeRedirect = validateRedirect(pathname, '/workshop/dashboard')
      loginUrl.searchParams.set('next', safeRedirect)
      return NextResponse.redirect(loginUrl)
    }

    // Verify user is a workshop admin via organization membership
    // Use supabaseAdmin to bypass RLS policies that may cause recursion
    if (!supabaseAdmin) {
      console.error('[MIDDLEWARE] ❌ Supabase admin client not available')
      return NextResponse.redirect(new URL('/', request.url))
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('organization_members')
      .select(`
        id,
        role,
        status,
        organizations (
          organization_type,
          status
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    console.log(`[MIDDLEWARE] Membership query result:`, {
      found: !!membership,
      error: membershipError?.message,
      userId: user.id
    })

    const org = membership?.organizations as any

    if (!membership || !org || org.organization_type !== 'workshop') {
      console.warn(
        `[SECURITY] ❌ Non-workshop user ${user.email} (${user.id}) attempted to access ${pathname}`,
        { hasMembership: !!membership, hasOrg: !!org, orgType: org?.organization_type }
      )
      return NextResponse.redirect(new URL('/', request.url))
    }

    console.log(`[WORKSHOP] ✅ ${user.email} accessing ${pathname} (Role: ${membership.role})`)

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
    // Workshop routes
    '/workshop/:path*',
    // Customer routes
    '/customer/dashboard',
    '/customer/dashboard/:path*',
    '/customer/schedule',
    '/customer/schedule/:path*',
    '/dashboard/:path*',
    '/session/:path*',
    '/video/:path*',
    '/chat/:path*',
    '/diagnostic/:path*',
    // Intake and waiver routes (authentication required)
    '/intake/:path*',
    '/waiver/:path*',
    '/onboarding/pricing',
  ],
}