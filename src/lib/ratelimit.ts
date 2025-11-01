/**
 * Rate Limiting Utility
 *
 * Uses Upstash Redis for distributed rate limiting across serverless functions.
 * Protects authentication endpoints from brute force attacks.
 *
 * IMPORTANT: Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.
 * Free tier at upstash.com provides 10,000 requests/day.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Create Redis client (reused across all rate limiters)
let redis: Redis | null = null

function getRedisClient(): Redis {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    console.warn(
      '[RateLimit] Upstash Redis credentials not configured. ' +
      'Rate limiting will be DISABLED. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
    )
    throw new Error('Redis credentials not configured')
  }

  redis = new Redis({
    url,
    token,
  })

  return redis
}

/**
 * Login rate limiter
 *
 * Limit: 5 login attempts per 15 minutes per email
 * Use case: Prevents brute force password attacks
 */
export const loginRateLimiter = (() => {
  try {
    return new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: true,
      prefix: 'ratelimit:login',
    })
  } catch (error) {
    return null
  }
})()

/**
 * Signup rate limiter
 *
 * Limit: 3 signups per hour per IP address
 * Use case: Prevents spam account creation
 */
export const signupRateLimiter = (() => {
  try {
    return new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
      prefix: 'ratelimit:signup',
    })
  } catch (error) {
    return null
  }
})()

/**
 * Password reset rate limiter
 *
 * Limit: 3 password resets per hour per email
 * Use case: Prevents password reset spam
 */
export const passwordResetRateLimiter = (() => {
  try {
    return new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(3, '1 h'),
      analytics: true,
      prefix: 'ratelimit:password-reset',
    })
  } catch (error) {
    return null
  }
})()

/**
 * Document upload rate limiter
 *
 * Limit: 10 document uploads per hour per user
 * Use case: Prevents document spam during mechanic signup
 */
export const documentUploadRateLimiter = (() => {
  try {
    return new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      analytics: true,
      prefix: 'ratelimit:document-upload',
    })
  } catch (error) {
    return null
  }
})()

/**
 * General API rate limiter
 *
 * Limit: 100 requests per minute per IP
 * Use case: General API protection
 */
export const apiRateLimiter = (() => {
  try {
    return new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  } catch (error) {
    return null
  }
})()

/**
 * Helper: Check rate limit and return user-friendly error
 *
 * @param identifier - Unique identifier to rate limit (email, IP, user ID, etc.)
 * @param limiter - The rate limiter to use
 * @returns { allowed: boolean, error?: string, retryAfter?: Date }
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null
): Promise<{
  allowed: boolean
  error?: string
  retryAfter?: Date
  limit?: number
  remaining?: number
}> {
  // If rate limiter not configured, allow request (development mode)
  if (!limiter) {
    return { allowed: true }
  }

  try {
    const { success, limit, reset, remaining } = await limiter.limit(identifier)

    if (!success) {
      const resetDate = new Date(reset)
      const minutesRemaining = Math.ceil((resetDate.getTime() - Date.now()) / 1000 / 60)

      return {
        allowed: false,
        error: `Too many attempts. Please try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`,
        retryAfter: resetDate,
        limit,
        remaining: 0
      }
    }

    return {
      allowed: true,
      limit,
      remaining
    }
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error)

    // P0-2 FIX: Fail closed in production to prevent brute force attacks
    // In development, fail open for easier testing
    const isProduction = process.env.NODE_ENV === 'production'

    if (isProduction) {
      return {
        allowed: false,
        error: 'Rate limiting service temporarily unavailable. Please try again in a moment.',
      }
    }

    // In development, allow request but log the error
    console.warn('[RateLimit] DEVELOPMENT MODE: Allowing request despite rate limit error')
    return { allowed: true }
  }
}

/**
 * Helper: Get client IP address from request
 *
 * @param req - Next.js request object
 * @returns IP address or 'unknown'
 */
export function getClientIP(req: Request): string {
  // Try various headers (depends on deployment environment)
  const headers = req.headers

  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = headers.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }

  const cfIP = headers.get('cf-connecting-ip') // Cloudflare
  if (cfIP) {
    return cfIP.trim()
  }

  return 'unknown'
}

/**
 * Helper: Format rate limit headers for HTTP response
 *
 * @param limit - Max requests allowed
 * @param remaining - Requests remaining
 * @param reset - Unix timestamp when limit resets
 * @returns Headers object
 */
export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  reset: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
  }
}
