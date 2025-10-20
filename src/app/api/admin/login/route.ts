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

    // Prepare a redirect response (we'll return this on success)
    const successRedirect = NextResponse.redirect(new URL(redirectTo, request.url), { status: 303 })

    // Attach cookies to the response so Supabase can set the auth cookie
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          successRedirect.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          successRedirect.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    })

    if (!email || !password) {
      const url = new URL('/admin/login', request.url)
      url.searchParams.set('error', encodeURIComponent('Email and password are required.'))
      return NextResponse.redirect(url, { status: 303 })
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      console.error('Supabase auth error:', error.message)
      const url = new URL('/admin/login', request.url)
      url.searchParams.set('error', encodeURIComponent(error.message))
      return NextResponse.redirect(url, { status: 303 })
    }

    console.log('Login successful, redirecting to:', redirectTo)
    return successRedirect

  } catch (error) {
    console.error('POST /api/admin/login error:', error)
    const url = new URL('/admin/login', request.url)
    url.searchParams.set('error', encodeURIComponent('Login failed'))
    return NextResponse.redirect(url, { status: 303 })
  }
}