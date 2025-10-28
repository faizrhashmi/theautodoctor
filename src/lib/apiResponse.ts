/**
 * Standardized API Response Utilities
 * Phase 2: Error Handling & Logging
 *
 * Provides consistent response formatting across all API endpoints
 */

import { NextResponse } from 'next/server'
import { logger } from './logger'

/**
 * Standard API error codes
 */
export const ApiErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const

export type ApiErrorCode = (typeof ApiErrorCodes)[keyof typeof ApiErrorCodes]

/**
 * Success response
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse<{ success: true; data: T }> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  )
}

/**
 * Error response with logging
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown
): NextResponse<{ success: false; error: { code: string; message: string; details?: unknown } }> {
  // Log error for monitoring
  if (status >= 500) {
    logger.error(`API Error: ${code}`, new Error(message), { details })
  } else if (status >= 400) {
    logger.warn(`API Error: ${code} - ${message}`, { details })
  }

  const response = {
    success: false as const,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  }

  return NextResponse.json(response, { status })
}

/**
 * Helper: Bad request (400)
 */
export function apiBadRequest(message: string, details?: unknown) {
  return apiError(ApiErrorCodes.BAD_REQUEST, message, 400, details)
}

/**
 * Helper: Unauthorized (401)
 */
export function apiUnauthorized(message = 'Authentication required') {
  return apiError(ApiErrorCodes.UNAUTHORIZED, message, 401)
}

/**
 * Helper: Forbidden (403)
 */
export function apiForbidden(message = 'Access denied') {
  return apiError(ApiErrorCodes.FORBIDDEN, message, 403)
}

/**
 * Helper: Not found (404)
 */
export function apiNotFound(resource: string) {
  return apiError(ApiErrorCodes.NOT_FOUND, `${resource} not found`, 404)
}

/**
 * Helper: Conflict (409)
 */
export function apiConflict(message: string, details?: unknown) {
  return apiError(ApiErrorCodes.CONFLICT, message, 409, details)
}

/**
 * Helper: Validation error (422)
 */
export function apiValidationError(message: string, errors?: Record<string, string[]>) {
  return apiError(ApiErrorCodes.VALIDATION_ERROR, message, 422, { errors })
}

/**
 * Helper: Rate limit exceeded (429)
 */
export function apiRateLimitExceeded(retryAfter?: number) {
  const response = apiError(
    ApiErrorCodes.RATE_LIMIT_EXCEEDED,
    'Too many requests. Please try again later.',
    429,
    retryAfter ? { retryAfter } : undefined
  )

  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString())
  }

  return response
}

/**
 * Helper: Internal server error (500)
 */
export function apiInternalError(message = 'An unexpected error occurred', error?: Error) {
  // Log the actual error with stack trace
  if (error) {
    logger.error('Internal server error', error)
  }

  // Return generic message to client (don't leak implementation details)
  return apiError(
    ApiErrorCodes.INTERNAL_ERROR,
    process.env.NODE_ENV === 'development' ? message : 'An unexpected error occurred',
    500
  )
}

/**
 * Helper: Database error (500)
 */
export function apiDatabaseError(error?: Error) {
  if (error) {
    logger.error('Database error', error)
  }

  return apiError(
    ApiErrorCodes.DATABASE_ERROR,
    'A database error occurred. Please try again.',
    500
  )
}

/**
 * Helper: External service error (502)
 */
export function apiExternalServiceError(service: string, error?: Error) {
  if (error) {
    logger.error(`External service error: ${service}`, error)
  }

  return apiError(
    ApiErrorCodes.EXTERNAL_SERVICE_ERROR,
    `The ${service} service is currently unavailable. Please try again later.`,
    502
  )
}

/**
 * Wrap API handler with error catching and logging
 */
export function withErrorHandling(
  handler: (req: Request, context?: unknown) => Promise<NextResponse>
) {
  return async (req: Request, context?: unknown): Promise<NextResponse> => {
    try {
      return await handler(req, context)
    } catch (error) {
      // Log the error
      logger.error('Unhandled API error', error as Error, {
        url: req.url,
        method: req.method,
      })

      // Return generic error response
      return apiInternalError(
        error instanceof Error ? error.message : 'An unexpected error occurred',
        error instanceof Error ? error : undefined
      )
    }
  }
}

/**
 * Check required fields in request body
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  body: T,
  requiredFields: (keyof T)[]
): { valid: true } | { valid: false; response: NextResponse } {
  const missing = requiredFields.filter((field) => !body[field])

  if (missing.length > 0) {
    return {
      valid: false,
      response: apiValidationError(
        'Missing required fields',
        { missing: missing.map(String) }
      ),
    }
  }

  return { valid: true }
}
