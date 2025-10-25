// @ts-nocheck
// src/app/api/admin/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    // Support JSON, form data, and URL-encoded data
    const contentType = request.headers.get('content-type') || ''
    let email: string
    let password: string
    let redirectTo: string
    let isJsonRequest = false

    if (contentType.includes('application/json')) {
      // Handle JSON data from client-side fetch
      const data = await request.json()
      email = data.email
      password = data.password
      redirectTo = data.redirect || '/admin'
      isJsonRequest = true
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Handle URL-encoded data
      const text = await request.text()
      const params = new URLSearchParams(text)
      email = params.get('email') as string
      password = params.get('password') as string
      redirectTo = params.get('redirect') as string || '/admin'
    } else {
      // Handle form data from HTML form
      const formData = await request.formData()
      email = formData.get('email') as string
      password = formData.get('password') as string
      redirectTo = formData.get('redirect') as string || '/admin'
    }

    console.log('Login attempt:', { email, redirectTo, isJsonRequest })

    // Validate input
    if (!email || !password) {
      if (isJsonRequest) {
        return NextResponse.json(
          { success: false, error: 'Email and password are required.' },
          { status: 400 }
        )
      }
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
        (request.headers.get('x-forwarded-proto') || 'https') + '://' +
        request.headers.get('host')
      const url = new URL('/admin/login', baseUrl)
      url.searchParams.set('error', encodeURIComponent('Email and password are required.'))
      return NextResponse.redirect(url, { status: 303 })
    }

    // Use NEXT_PUBLIC_APP_URL if available, otherwise construct from request headers
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (request.headers.get('x-forwarded-proto') || 'https') + '://' +
      request.headers.get('host')

    // Determine if we're in production (HTTPS)
    const isProduction = process.env.NODE_ENV === 'production' ||
      baseUrl.startsWith('https') ||
      request.headers.get('x-forwarded-proto') === 'https'

    // Create response based on request type
    let response: NextResponse

    if (isJsonRequest) {
      // For JSON requests, prepare a JSON response
      response = NextResponse.json({ success: true, redirect: redirectTo })
    } else {
      // For form submissions, prepare a redirect response
      response = NextResponse.redirect(new URL(redirectTo, baseUrl), { status: 303 })
    }

    // Create Supabase client with cookie handling
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
          response.cookies.set({ name, value, ...cookieOptions })
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
          response.cookies.set({ name, value: '', ...cookieOptions })
        },
      },
    })

    // Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      console.error('Supabase auth error:', error.message)

      if (isJsonRequest) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 401 }
        )
      }

      const url = new URL('/admin/login', baseUrl)
      url.searchParams.set('error', encodeURIComponent(error.message))
      return NextResponse.redirect(url, { status: 303 })
    }

    // Verify the session was created
    if (!data.session) {
      console.error('No session created after successful login')

      if (isJsonRequest) {
        return NextResponse.json(
          { success: false, error: 'Session creation failed. Please try again.' },
          { status: 500 }
        )
      }

      const url = new URL('/admin/login', baseUrl)
      url.searchParams.set('error', encodeURIComponent('Session creation failed. Please try again.'))
      return NextResponse.redirect(url, { status: 303 })
    }

    console.log('Login successful:', {
      userId: data.user?.id,
      email: data.user?.email,
      redirectTo,
      isJsonRequest
    })

    // Return the appropriate response
    return response

  } catch (error) {
    console.error('POST /api/admin/login error:', error)

    // For JSON requests, return JSON error
    if (request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Login failed. Please try again.' },
        { status: 500 }
      )
    }

    // For form submissions, redirect with error
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (request.headers.get('x-forwarded-proto') || 'https') + '://' +
      request.headers.get('host')
    const url = new URL('/admin/login', baseUrl)
    url.searchParams.set('error', encodeURIComponent('Login failed'))
    return NextResponse.redirect(url, { status: 303 })
  }
}