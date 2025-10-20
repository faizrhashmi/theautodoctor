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
  const { pathname } = request.nextUrl

  // Allow static assets immediately
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next()
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

  if (!user.email_confirmed_at) {
    return NextResponse.redirect(new URL('/customer/verify-email', request.url))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email_verified')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role && profile.role !== 'customer') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (profile?.email_verified === false) {
    return NextResponse.redirect(new URL('/customer/verify-email', request.url))
  }

  return response
}

export const config = {
  matcher: [
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