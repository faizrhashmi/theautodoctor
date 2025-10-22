// src/middleware.ts
import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const CUSTOMER_PROTECTED_PREFIXES = [
  '/customer/dashboard',
  '/customer/schedule',
  '/dashboard',
  '/session',
  '/video',
  '/chat',
]

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
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

  if (matchesPrefix(pathname, '/admin')) {
    if (!user) {
      const loginUrl = new URL('/admin/login', request.url)
      const next = pathname === '/admin' ? '/admin/intakes' : pathname
      loginUrl.searchParams.set('next', next)
      return NextResponse.redirect(loginUrl)
    }

    return response
  }

  const requiresCustomerAuth = CUSTOMER_PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))

  if (!requiresCustomerAuth) {
    return response
  }

  if (!user) {
    const loginUrl = new URL('/customer/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
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
    '/admin/:path*',
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