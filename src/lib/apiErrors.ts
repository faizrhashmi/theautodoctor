/**
 * Unified API Error Handling Utilities
 * Provides consistent error message extraction across the application
 */

/**
 * Extract error message from various error formats
 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error

  if (error && typeof error === 'object') {
    // Check for common error properties
    if ('error' in error && typeof (error as any).error === 'string') {
      return (error as any).error
    }
    if ('message' in error && typeof (error as any).message === 'string') {
      return (error as any).message
    }
    if ('msg' in error && typeof (error as any).msg === 'string') {
      return (error as any).msg
    }
  }

  return 'An unexpected error occurred'
}

/**
 * Handle API response errors
 * Extracts error message from Response object
 */
export async function handleApiError(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get('content-type')

    if (contentType?.includes('application/json')) {
      const data = await response.json()
      return extractErrorMessage(data)
    } else {
      const text = await response.text()
      return text || `Request failed with status ${response.status}`
    }
  } catch {
    return `Request failed with status ${response.status}`
  }
}

/**
 * Format error for user display
 * Adds context to error messages
 */
export function formatUserError(action: string, error: string): string {
  return `${action}: ${error}`
}

/**
 * Log error for debugging
 * Consistent error logging format
 */
export function logError(context: string, error: unknown, additionalData?: any): void {
  console.error(`[${context}] Error:`, error)
  if (additionalData) {
    console.error(`[${context}] Additional data:`, additionalData)
  }
}
