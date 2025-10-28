/**
 * Centralized logging utility
 * Phase 2: Error Handling & Logging
 *
 * Provides structured logging with different levels and automatic
 * error tracking integration for production environments.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack, name: error.name }
      : { error }

    this.log('error', message, { ...context, ...errorDetails })
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log('debug', message, context)
    }
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    }

    // In development: pretty print to console
    if (this.isDevelopment) {
      const colors = {
        info: '\x1b[36m',    // Cyan
        warn: '\x1b[33m',    // Yellow
        error: '\x1b[31m',   // Red
        debug: '\x1b[35m',   // Magenta
      }
      const reset = '\x1b[0m'
      const color = colors[level]

      console.log(`${color}[${level.toUpperCase()}]${reset} ${message}`)
      if (context && Object.keys(context).length > 0) {
        console.log(context)
      }
      return
    }

    // In production: structured JSON logging
    switch (level) {
      case 'error':
        console.error(JSON.stringify(logEntry))
        // TODO: Send to error tracking service (Sentry, etc.)
        break
      case 'warn':
        console.warn(JSON.stringify(logEntry))
        break
      case 'info':
        console.info(JSON.stringify(logEntry))
        break
      case 'debug':
        // Debug logs not shown in production
        break
    }
  }

  /**
   * Log API request
   */
  apiRequest(method: string, path: string, context?: LogContext): void {
    this.info(`API ${method} ${path}`, { type: 'api_request', ...context })
  }

  /**
   * Log API response
   */
  apiResponse(method: string, path: string, statusCode: number, duration: number, context?: LogContext): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    this.log(level, `API ${method} ${path} - ${statusCode} (${duration}ms)`, {
      type: 'api_response',
      statusCode,
      duration,
      ...context,
    })
  }

  /**
   * Log database query
   */
  dbQuery(query: string, duration?: number, context?: LogContext): void {
    this.debug('Database query', { type: 'db_query', query, duration, ...context })
  }

  /**
   * Log authentication event
   */
  auth(event: string, userId?: string, context?: LogContext): void {
    this.info(`Auth: ${event}`, { type: 'auth', userId, ...context })
  }

  /**
   * Log security event
   */
  security(event: string, context?: LogContext): void {
    this.warn(`Security: ${event}`, { type: 'security', ...context })
  }
}

// Export singleton instance
export const logger = new Logger()

// Export helper function for API route timing
export function createApiLogger(req: Request) {
  const startTime = Date.now()
  const method = req.method
  const url = new URL(req.url)
  const path = url.pathname

  logger.apiRequest(method, path)

  return {
    success: (statusCode = 200, context?: LogContext) => {
      const duration = Date.now() - startTime
      logger.apiResponse(method, path, statusCode, duration, context)
    },
    error: (statusCode: number, error: Error | unknown, context?: LogContext) => {
      const duration = Date.now() - startTime
      logger.error(`API ${method} ${path} - ${statusCode} (${duration}ms)`, error, context)
    },
  }
}
