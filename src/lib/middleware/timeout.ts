/**
 * Request Timeout Middleware
 * Phase 3: Stability & Performance
 *
 * Prevents long-running requests from hanging indefinitely
 */

import { NextResponse } from 'next/server'
import { logger } from '../logger'
import { apiError, ApiErrorCodes } from '../apiResponse'

/**
 * Wrap handler with timeout protection
 */
export function withTimeout(
  handler: (req: Request, context?: unknown) => Promise<NextResponse>,
  timeoutMs = 30000 // 30 seconds default
) {
  return async (req: Request, context?: unknown): Promise<NextResponse> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      // Create a promise that rejects on timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Request timeout'))
        })
      })

      // Race between handler and timeout
      const response = await Promise.race([
        handler(req, context),
        timeoutPromise
      ])

      clearTimeout(timeoutId)
      return response

    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.message === 'Request timeout') {
        logger.warn('Request timeout', {
          url: req.url,
          method: req.method,
          timeoutMs,
        })

        return apiError(
          ApiErrorCodes.INTERNAL_ERROR,
          'Request timed out. Please try again.',
          504
        )
      }

      throw error
    }
  }
}

/**
 * Timeout configurations for different endpoint types
 */
export const TimeoutConfig = {
  // Fast endpoints (should complete quickly)
  FAST: 5000, // 5 seconds

  // Standard endpoints (most API calls)
  STANDARD: 30000, // 30 seconds

  // Long-running operations (file uploads, complex queries)
  LONG: 120000, // 2 minutes

  // Webhooks (external service calls)
  WEBHOOK: 60000, // 1 minute
} as const
