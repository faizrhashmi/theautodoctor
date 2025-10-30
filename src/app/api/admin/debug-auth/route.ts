// Debug endpoint to check authentication configuration
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { requireAdminAPI } from '@/lib/auth/guards'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  // ✅ SECURITY: Require admin authentication for debug tools
  const authResult = await requireAdminAPI(request)
  if (authResult.error) return authResult.error

  const admin = authResult.data
  console.log(`[ADMIN DEBUG] ${admin.email} accessing auth debug tool`)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (request.headers.get('x-forwarded-proto') || 'https') + '://' +
    request.headers.get('host')

  const isProduction = process.env.NODE_ENV === 'production' ||
    baseUrl.startsWith('https') ||
    request.headers.get('x-forwarded-proto') === 'https'

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  const debug = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
      SUPABASE_URL_SET: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_KEY_SET: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    request: {
      baseUrl,
      isProduction,
      protocol: request.headers.get('x-forwarded-proto') || 'unknown',
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
    },
    cookies: {
      // Check for any Supabase auth cookies (they include the project ID)
      hasSupabaseAuthCookies: Array.from(request.cookies.getAll()).some(c =>
        c.name.includes('sb-') && c.name.includes('auth-token')
      ),
      hasSBAccessToken: !!request.cookies.get('sb-access-token')?.value,
      hasSBRefreshToken: !!request.cookies.get('sb-refresh-token')?.value,
      cookieNames: Array.from(request.cookies.getAll()).map(c => c.name),
    },
    auth: {
      userFound: !!user,
      userId: user?.id || null,
      userEmail: user?.email || null,
      userRole: user?.role || null,
    },
    recommendations: [] as string[],
  }

  // Add recommendations based on findings
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    debug.recommendations.push('Set NEXT_PUBLIC_APP_URL environment variable in production')
  }

  if (isProduction && !baseUrl.startsWith('https')) {
    debug.recommendations.push('Ensure your production URL uses HTTPS')
  }

  if (!debug.cookies.hasSupabaseAuthCookies) {
    debug.recommendations.push('No Supabase auth cookies found - login may not be persisting')
  }

  if (debug.auth.userFound && !debug.auth.userRole) {
    debug.recommendations.push('User authenticated but role not set - may need admin role assignment')
  }

  return NextResponse.json(debug, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}