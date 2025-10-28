// src/middleware.ts
/**
 * SECURITY: Route-level authentication and authorization
 *
 * This middleware enforces role-based access control for protected routes.
 * NOTE: Customer routes are protected by AuthGuard component, not middleware.
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
  
  // CRITICAL FIX: Use consistent cookie configuration with client-side
  const isProduction = process.env.NODE_ENV === 'production'
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction,
    maxAge: 604800, // 7 days - match client-side
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        const value = request.cookies.get(name)?.value
        console.log(`[MIDDLEWARE] Reading cookie: ${name}`, value ? 'PRESENT' : 'MISSING')
        return value
      },
      set(name: string, value: string) {
        console.log(`[MIDDLEWARE] Setting cookie: ${name}`)
        response.cookies.set({ 
          name, 
          value, 
          ...cookieOptions 
        })
      },
      remove(name: string) {
        console.log(`[MIDDLEWARE] Removing cookie: ${name}`)
        response.cookies.set({ 
          name, 
          value: '', 
          ...cookieOptions,
          maxAge: 0 
        })
      },
    },
  })

  // Try to get user, but handle errors gracefully
  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.log('[MIDDLEWARE] Auth error:', error.message)

      // Clear ALL Supabase auth cookies on error with consistent settings
      const authCookies = ['sb-access-token', 'sb-refresh-token']
      authCookies.forEach((name) => {
        console.log('[MIDDLEWARE] Clearing auth cookie:', name)
        response.cookies.set({
          name,
          value: '',
          maxAge: 0,
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: isProduction,
        })
      })

      // Also clear any other Supabase cookies
      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name.startsWith('sb-') && !authCookies.includes(cookie.name)) {
          console.log('[MIDDLEWARE] Clearing additional cookie:', cookie.name)
          response.cookies.set({
            name: cookie.name,
            value: '',
            maxAge: 0,
            path: '/',
          })
        }
      })
    } else {
      user = data.user
      if (user) {
        console.log(`[MIDDLEWARE] User authenticated: ${user.email}`)
      }
    }
  } catch (error) {
    console.error('[MIDDLEWARE] Exception getting user:', error)
    // Clear cookies on exception too with consistent settings
    const authCookies = ['sb-access-token', 'sb-refresh-token']
    authCookies.forEach((name) => {
      response.cookies.set({
        name,
        value: '',
        maxAge: 0,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
      })
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
  // CUSTOMER ROUTE PROTECTION - REMOVED
  // ==========================================================================
  // Customer routes are now protected by AuthGuard component, not middleware
  // This prevents the infinite redirect loop between middleware and AuthGuard
  // 
  // Customer routes that are now handled by AuthGuard:
  // - /customer/dashboard
  // - /customer/schedule  
  // - /dashboard
  // - /session
  // - /intake
  // - /waiver
  //
  // The AuthGuard component provides better user experience with:
  // - Loading states
  // - Clear error messages
  // - Client-side redirects without full page reloads

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
    // NOTE: Customer routes removed - protected by AuthGuard component
    // Video and chat routes (accessible by both customers and mechanics)
    '/video/:path*',
    '/chat/:path*',
    '/diagnostic/:path*',
    // Note: /onboarding/pricing removed - handles its own auth
  ],
}