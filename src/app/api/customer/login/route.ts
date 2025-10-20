import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Create response object to set cookies
    const response = NextResponse.json({ success: true })

    // Create Supabase client with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('[login] Auth error:', error)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Login failed' },
        { status: 401 }
      )
    }

    // Check if user is a customer (use admin client to bypass RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, account_status, is_18_plus, waiver_accepted')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      console.error('[login] Profile query error:', profileError)
    }

    if (!profile) {
      console.error('[login] Profile not found for user:', data.user.id)
      return NextResponse.json(
        { error: 'Profile not found. Please contact support.' },
        { status: 404 }
      )
    }

    if (profile.role !== 'customer') {
      return NextResponse.json(
        { error: 'This login is for customers only' },
        { status: 403 }
      )
    }

    if (profile.account_status === 'suspended') {
      return NextResponse.json(
        { error: 'Your account has been suspended. Please contact support.' },
        { status: 403 }
      )
    }

    if (!profile.is_18_plus || !profile.waiver_accepted) {
      return NextResponse.json(
        { error: 'Your account requires age verification. Please contact support.' },
        { status: 403 }
      )
    }

    // Return response with cookies set
    return response
  } catch (error: any) {
    console.error('[login] Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
