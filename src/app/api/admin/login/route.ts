// @ts-nocheck
// src/app/api/admin/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    // Parse as form data since that's what the HTML form sends
    const formData = await request.formData()
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    // Redirect to the actual admin intakes page that exists
    const redirectTo = formData.get('redirect') as string || '/admin/intakes'

    console.log('Login attempt:', { email, redirectTo })

    // Use NEXT_PUBLIC_APP_URL if available, otherwise construct from request headers
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (request.headers.get('x-forwarded-proto') || 'https') + '://' +
      request.headers.get('host')

    // Prepare a redirect response with proper URL
    const successRedirect = NextResponse.redirect(new URL(redirectTo, baseUrl), { status: 303 })

    // Determine if we're in production (HTTPS)
    const isProduction = process.env.NODE_ENV === 'production' ||
      baseUrl.startsWith('https') ||
      request.headers.get('x-forwarded-proto') === 'https'

    // Attach cookies to the response so Supabase can set the auth cookie
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Ensure proper cookie settings for production
          const cookieOptions = {
            ...options,
            sameSite: 'lax' as const,
            secure: isProduction, // Set secure flag in production
            httpOnly: true,
            path: '/',
            // Set domain to work with both www and non-www
            domain: isProduction ? '.askautodoctor.com' : undefined
          }
          successRedirect.cookies.set({ name, value, ...cookieOptions })
        },
        remove(name: string, options: any) {
          const cookieOptions = {
            ...options,
            sameSite: 'lax' as const,
            secure: isProduction,
            httpOnly: true,
            path: '/',
            maxAge: 0,
            // Set domain to work with both www and non-www
            domain: isProduction ? '.askautodoctor.com' : undefined
          }
          successRedirect.cookies.set({ name, value: '', ...cookieOptions })
        },
      },
    })

    if (!email || !password) {
      const url = new URL('/admin/login', baseUrl)
      url.searchParams.set('error', encodeURIComponent('Email and password are required.'))
      return NextResponse.redirect(url, { status: 303 })
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      console.error('Supabase auth error:', error.message)
      const url = new URL('/admin/login', baseUrl)
      url.searchParams.set('error', encodeURIComponent(error.message))
      return NextResponse.redirect(url, { status: 303 })
    }

    // Verify the session was created
    if (!data.session) {
      console.error('No session created after successful login')
      const url = new URL('/admin/login', baseUrl)
      url.searchParams.set('error', encodeURIComponent('Session creation failed. Please try again.'))
      return NextResponse.redirect(url, { status: 303 })
    }

    console.log('Login successful, redirecting to:', redirectTo)
    console.log('Session created:', { userId: data.user?.id, email: data.user?.email })

    // Add a small delay to ensure cookies are set
    await new Promise(resolve => setTimeout(resolve, 100))

    return successRedirect

  } catch (error) {
    console.error('POST /api/admin/login error:', error)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (request.headers.get('x-forwarded-proto') || 'https') + '://' +
      request.headers.get('host')
    const url = new URL('/admin/login', baseUrl)
    url.searchParams.set('error', encodeURIComponent('Login failed'))
    return NextResponse.redirect(url, { status: 303 })
  }
}