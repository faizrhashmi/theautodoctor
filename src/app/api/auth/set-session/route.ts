import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { access_token, refresh_token } = body || {}

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
    }

    console.log('[set-session] Setting session with tokens')

    const res = NextResponse.json({ ok: true })

    const isProduction = process.env.NODE_ENV === 'production'

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          const value = req.cookies.get(name)?.value
          console.log('[set-session] Reading cookie:', name, value ? 'PRESENT' : 'MISSING')
          return value
        },
        set(name: string, value: string, options: any) {
          console.log('[set-session] Setting cookie:', name)

          // Convert Supabase cookie options to Next.js format
          const cookieOptions = {
            name,
            value,
            path: options.path || '/',
            httpOnly: options.httpOnly !== false, // Default to true
            sameSite: (options.sameSite || 'lax') as 'strict' | 'lax' | 'none',
            secure: options.secure !== false ? isProduction : false, // Default to true in production
            maxAge: options.maxAge || 604800, // 7 days default
          }

          res.cookies.set(cookieOptions)
        },
        remove(name: string, options: any) {
          console.log('[set-session] Removing cookie:', name)

          res.cookies.set({
            name,
            value: '',
            path: options.path || '/',
            httpOnly: options.httpOnly !== false,
            sameSite: (options.sameSite || 'lax') as 'strict' | 'lax' | 'none',
            secure: options.secure !== false ? isProduction : false,
            maxAge: 0
          })
        },
      },
    })

    // Set the session server-side which will cause the helper to set the auth cookies
    const { error, data } = await supabase.auth.setSession({ access_token, refresh_token })

    if (error) {
      console.error('[set-session] supabase.auth.setSession error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (data.session) {
      console.log('[set-session] ✅ Session set successfully for user:', data.session.user.email)
    } else {
      console.warn('[set-session] ⚠️  Session set but no session data returned')
    }

    return res
  } catch (err: any) {
    console.error('[set-session] error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
