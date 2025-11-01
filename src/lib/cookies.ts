/**
 * Cookie Management Utilities
 *
 * P0-7 FIX: Centralized cookie clearing to eliminate inconsistencies
 * and ensure proper cleanup across logout flows and error handling.
 *
 * SECURITY: Proper cookie clearing is critical for:
 * - Preventing session fixation attacks
 * - Ensuring complete logout
 * - Cleaning up after authentication errors
 *
 * @module lib/cookies
 */

import { NextResponse } from 'next/server'

export interface CookieConfig {
  path?: string
  httpOnly?: boolean
  sameSite?: 'lax' | 'strict' | 'none'
  secure?: boolean
}

/**
 * Get standard cookie configuration for the current environment
 *
 * @returns Cookie configuration object with environment-appropriate settings
 */
export function getStandardCookieConfig(): CookieConfig {
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
  }
}

/**
 * Clear all Supabase authentication cookies from a NextResponse
 *
 * This utility ensures consistent cookie clearing across:
 * - Logout endpoints
 * - Authentication error handlers
 * - Middleware security checks
 *
 * @param response - NextResponse to modify with cleared cookies
 * @returns The same NextResponse with cookies cleared
 *
 * @example
 * // In API route
 * const response = NextResponse.json({ success: true })
 * clearSupabaseAuthCookies(response)
 * return response
 *
 * @example
 * // In middleware
 * const response = NextResponse.next()
 * clearSupabaseAuthCookies(response)
 * return response
 */
export function clearSupabaseAuthCookies(response: NextResponse): NextResponse {
  const cookieConfig = getStandardCookieConfig()

  // Clear standard Supabase auth cookies
  const authCookies = ['sb-access-token', 'sb-refresh-token']

  authCookies.forEach((name) => {
    response.cookies.set({
      name,
      value: '',
      maxAge: 0,
      ...cookieConfig,
    })
  })

  return response
}

/**
 * Clear ALL Supabase cookies (including legacy/unknown ones) from a NextResponse
 *
 * Use this when you need to ensure complete cleanup, such as:
 * - Account deletion
 * - Security incident response
 * - Migration from old auth system
 *
 * @param response - NextResponse to modify
 * @param requestCookies - Request cookies to scan for Supabase cookies
 * @returns The same NextResponse with all Supabase cookies cleared
 *
 * @example
 * // In API route with request
 * const response = NextResponse.json({ success: true })
 * clearAllSupabaseCookies(response, request.cookies.getAll())
 * return response
 */
export function clearAllSupabaseCookies(
  response: NextResponse,
  requestCookies: Array<{ name: string; value: string }>
): NextResponse {
  const cookieConfig = getStandardCookieConfig()

  // First clear standard auth cookies
  clearSupabaseAuthCookies(response)

  // Then scan for and clear any other Supabase cookies
  const standardCookies = ['sb-access-token', 'sb-refresh-token']

  requestCookies.forEach((cookie) => {
    if (cookie.name.startsWith('sb-') && !standardCookies.includes(cookie.name)) {
      response.cookies.set({
        name: cookie.name,
        value: '',
        maxAge: 0,
        path: '/',
        // Note: Additional cookies may not need httpOnly/secure
      })
    }
  })

  return response
}

/**
 * Set a cookie with standard configuration
 *
 * @param response - NextResponse to modify
 * @param name - Cookie name
 * @param value - Cookie value
 * @param maxAge - Optional max age in seconds (defaults to 7 days)
 * @returns The same NextResponse with cookie set
 */
export function setStandardCookie(
  response: NextResponse,
  name: string,
  value: string,
  maxAge: number = 604800 // 7 days
): NextResponse {
  const cookieConfig = getStandardCookieConfig()

  response.cookies.set({
    name,
    value,
    maxAge,
    ...cookieConfig,
  })

  return response
}
