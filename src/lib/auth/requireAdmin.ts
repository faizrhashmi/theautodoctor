import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

interface AuthResult {
  authorized: boolean
  response?: NextResponse
  user?: any
  profile?: any
}

/**
 * Server-side admin authentication middleware
 * Use in all admin API routes to verify admin role
 *
 * @example
 * export async function GET(req: NextRequest) {
 *   const auth = await requireAdmin(req)
 *   if (!auth.authorized) return auth.response!
 *
 *   // Your admin logic here
 * }
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )

  // Check if user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.warn('[SECURITY] Unauthenticated admin API access attempt')
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized - Please log in as an admin' },
        { status: 401 }
      ),
    }
  }

  // Check if user has admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[SECURITY] Error fetching profile:', profileError)
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Authentication error' },
        { status: 500 }
      ),
    }
  }

  if (!profile || profile.role !== 'admin') {
    console.warn(`[SECURITY] Non-admin user ${user.email} (${user.id}) attempted to access admin API`)
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
    }
  }

  // Success - user is authenticated admin
  console.log(`[ADMIN] ${profile.full_name || profile.email} accessing admin API`)

  return {
    authorized: true,
    user,
    profile,
  }
}

/**
 * For use in Server Components (not API routes)
 * Redirects unauthorized users instead of returning JSON
 */
export async function requireAdminServerComponent() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { authorized: false, user: null, profile: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    console.warn(`[SECURITY] Non-admin ${user.email} attempted to access admin page`)
    return { authorized: false, user, profile: null }
  }

  return { authorized: true, user, profile }
}

/**
 * Lightweight check - just verify admin role exists
 * Use when you don't need user details
 */
export async function isAdmin(request: NextRequest): Promise<boolean> {
  const auth = await requireAdmin(request)
  return auth.authorized
}
