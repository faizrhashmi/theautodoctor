import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getRedirectFromQuery } from '@/lib/security/redirects'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // SECURITY: Validate redirect URL to prevent open redirects
  const next = getRedirectFromQuery(requestUrl.searchParams, 'next', '/customer/dashboard')

  // Use the configured app URL or fallback to request origin
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin

  if (code) {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Update profile with user metadata
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const fullName = (user?.user_metadata?.full_name as string | undefined) ?? null
        const phone = (user?.user_metadata?.phone as string | undefined) ?? null
        const vehicle = (user?.user_metadata?.vehicle_hint as string | undefined) ?? null
        const dateOfBirth = (user?.user_metadata?.date_of_birth as string | undefined) ?? null

        // Call profile API
        await fetch(`${baseUrl}/api/customer/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, phone, vehicle, dateOfBirth }),
        }).catch((err) => {
          console.error('Profile update failed:', err)
        })
      }

      // Successfully confirmed email, redirect to dashboard
      return NextResponse.redirect(new URL(next, baseUrl))
    } else {
      console.error('Auth callback error:', error)
      // Redirect to error page
      return NextResponse.redirect(new URL(`/auth/confirm?error=${encodeURIComponent(error.message)}`, baseUrl))
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/signup', baseUrl))
}
