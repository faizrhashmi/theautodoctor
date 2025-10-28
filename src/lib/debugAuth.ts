/**
 * Debug/Test Endpoint Authorization
 *
 * This module provides security for debug and test endpoints.
 * In production, these endpoints should ONLY be accessible to admins.
 * In development, they can be accessed freely for testing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface DebugAuthResult {
  authorized: boolean
  userId?: string
  error?: string
}

/**
 * Verify that the user is authorized to access debug/test endpoints.
 *
 * Rules:
 * - In production: Only admins can access
 * - In development: Open access for testing
 * - Always log access attempts for security monitoring
 */
export async function verifyDebugAccess(req: NextRequest): Promise<DebugAuthResult> {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const endpoint = new URL(req.url).pathname

  // In development, allow access but log it
  if (isDevelopment) {
    console.log(`[DEBUG AUTH] Development mode - allowing access to: ${endpoint}`)
    return { authorized: true }
  }

  // In production, require admin authentication
  console.log(`[DEBUG AUTH] Production mode - verifying admin access for: ${endpoint}`)

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.warn(`[DEBUG AUTH] Unauthorized access attempt to: ${endpoint} - No authentication`)
    return {
      authorized: false,
      error: 'Authentication required. Debug endpoints are restricted in production.'
    }
  }

  // Verify user is an admin
  if (!supabaseAdmin) {
    console.error('[DEBUG AUTH] Supabase admin client not configured')
    return {
      authorized: false,
      error: 'Server configuration error'
    }
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    console.warn(`[DEBUG AUTH] Unauthorized access attempt to: ${endpoint} - Profile not found for user: ${user.id}`)
    return {
      authorized: false,
      error: 'Access denied. Debug endpoints require admin privileges.'
    }
  }

  if (profile.role !== 'admin') {
    console.warn(
      `[SECURITY] Non-admin user ${profile.email} (${user.id}) attempted to access debug endpoint: ${endpoint}`,
      { role: profile.role }
    )
    return {
      authorized: false,
      error: 'Access denied. Debug endpoints require admin privileges.'
    }
  }

  // Log admin access for security monitoring
  console.log(`[DEBUG AUTH] ✅ Admin ${profile.email} accessing: ${endpoint}`)

  return {
    authorized: true,
    userId: user.id
  }
}

/**
 * Middleware wrapper for debug/test endpoints.
 * Use this to protect your debug routes:
 *
 * @example
 * ```typescript
 * import { withDebugAuth } from '@/lib/debugAuth'
 *
 * async function handler(req: NextRequest) {
 *   // Your debug endpoint logic here
 *   return NextResponse.json({ data: 'debug info' })
 * }
 *
 * export const GET = withDebugAuth(handler)
 * export const POST = withDebugAuth(handler)
 * ```
 */
export function withDebugAuth(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async function (req: NextRequest, ...args: any[]): Promise<NextResponse> {
    const authResult = await verifyDebugAccess(req)

    if (!authResult.authorized) {
      return NextResponse.json(
        {
          error: authResult.error || 'Unauthorized',
          message: 'Debug and test endpoints are restricted in production. Please use the admin panel or contact support.'
        },
        { status: 403 }
      )
    }

    // User is authorized, proceed with the handler
    return handler(req, ...args)
  }
}
