// src/middleware.ts
import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public/admin login paths and API routes
  const publicPaths = [
    '/admin/login',
    '/api/admin/login',
    '/customer', // Allow all customer routes (they have their own auth)
    '/api/customer', // Allow customer API routes
    '/_next',
    '/favicon.ico',
  ]

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Only guard /admin routes
  if (!pathname.startsWith('/admin')) {
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

  if (!user) {
    const loginUrl = new URL('/admin/login', request.url)
    // If trying to access /admin root, redirect to /admin/intakes after login
    const next = pathname === '/admin' ? '/admin/intakes' : pathname
    loginUrl.searchParams.set('next', next)
    return NextResponse.redirect(loginUrl)
  }

  // Optional: Check if user has admin role
  // TODO: Set up profiles table with admin roles
  // For now, allow any authenticated user to access admin panel

  /*
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  } catch (error) {
    console.error('Error checking profile:', error)
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }
  */

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}