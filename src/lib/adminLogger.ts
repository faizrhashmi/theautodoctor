// @ts-nocheck
// src/lib/adminLogger.ts
import { createClient } from '@supabase/supabase-js'

// Log levels
export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

// Log sources
export type LogSource = 'api' | 'auth' | 'session' | 'payment' | 'database' | 'system' | 'cleanup' | 'livekit' | 'email'

// Structured log metadata
export interface LogMetadata {
  userId?: string
  sessionId?: string
  requestId?: string
  errorStack?: string
  duration?: number
  statusCode?: number
  method?: string
  path?: string
  ip?: string
  userAgent?: string
  [key: string]: any
}

// Log entry structure
export interface LogEntry {
  id?: string
  level: LogLevel
  source: LogSource
  message: string
  metadata?: LogMetadata
  timestamp?: string
  created_at?: string
}

class AdminLogger {
  private supabase: ReturnType<typeof createClient> | null = null
  private consoleEnabled = true
  private dbLoggingEnabled = true

  constructor() {
    // Initialize Supabase client only if we have the env vars
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    }
  }

  private async saveToDatabase(entry: LogEntry): Promise<void> {
    if (!this.supabase || !this.dbLoggingEnabled) return

    try {
      const { error } = await this.supabase.from('admin_logs').insert({
        level: entry.level,
        source: entry.source,
        message: entry.message,
        metadata: entry.metadata || {},
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error('Failed to save log to database:', error)
      }
    } catch (error) {
      console.error('Error saving log:', error)
    }
  }

  private logToConsole(level: LogLevel, source: LogSource, message: string, metadata?: LogMetadata): void {
    if (!this.consoleEnabled) return

    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${source}]`

    switch (level) {
      case 'error':
        console.error(prefix, message, metadata || '')
        break
      case 'warn':
        console.warn(prefix, message, metadata || '')
        break
      case 'info':
        console.info(prefix, message, metadata || '')
        break
      case 'debug':
        console.debug(prefix, message, metadata || '')
        break
    }
  }

  private async log(level: LogLevel, source: LogSource, message: string, metadata?: LogMetadata): Promise<void> {
    const entry: LogEntry = {
      level,
      source,
      message,
      metadata,
      timestamp: new Date().toISOString(),
    }

    // Log to console
    this.logToConsole(level, source, message, metadata)

    // Save to database (async, don't await to not block)
    this.saveToDatabase(entry).catch((error) => {
      console.error('Failed to save log to database:', error)
    })
  }

  // Public logging methods
  async error(source: LogSource, message: string, metadata?: LogMetadata): Promise<void> {
    await this.log('error', source, message, metadata)
  }

  async warn(source: LogSource, message: string, metadata?: LogMetadata): Promise<void> {
    await this.log('warn', source, message, metadata)
  }

  async info(source: LogSource, message: string, metadata?: LogMetadata): Promise<void> {
    await this.log('info', source, message, metadata)
  }

  async debug(source: LogSource, message: string, metadata?: LogMetadata): Promise<void> {
    await this.log('debug', source, message, metadata)
  }

  // Specialized logging methods
  async logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    metadata?: LogMetadata
  ): Promise<void> {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    await this.log(level, 'api', `${method} ${path} - ${statusCode}`, {
      method,
      path,
      statusCode,
      duration,
      ...metadata,
    })
  }

  async logAuthEvent(event: string, userId?: string, metadata?: LogMetadata): Promise<void> {
    await this.log('info', 'auth', event, { userId, ...metadata })
  }

  async logSessionEvent(event: string, sessionId: string, metadata?: LogMetadata): Promise<void> {
    await this.log('info', 'session', event, { sessionId, ...metadata })
  }

  async logPaymentEvent(event: string, metadata?: LogMetadata): Promise<void> {
    await this.log('info', 'payment', event, metadata)
  }

  async logDatabaseQuery(query: string, duration: number, metadata?: LogMetadata): Promise<void> {
    await this.log('debug', 'database', `Query executed in ${duration}ms`, {
      query: query.substring(0, 500), // Truncate long queries
      duration,
      ...metadata,
    })
  }

  async logError(error: Error, source: LogSource, metadata?: LogMetadata): Promise<void> {
    await this.log('error', source, error.message, {
      errorStack: error.stack,
      errorName: error.name,
      ...metadata,
    })
  }

  async logCleanupEvent(event: string, metadata?: LogMetadata): Promise<void> {
    await this.log('info', 'cleanup', event, metadata)
  }

  // Configuration methods
  enableConsoleLogging(enabled: boolean): void {
    this.consoleEnabled = enabled
  }

  enableDatabaseLogging(enabled: boolean): void {
    this.dbLoggingEnabled = enabled
  }

  // Query logs from database
  async getLogs(filters?: {
    level?: LogLevel[]
    source?: LogSource[]
    search?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): Promise<{ logs: LogEntry[]; total: number }> {
    if (!this.supabase) {
      return { logs: [], total: 0 }
    }

    try {
      let query = this.supabase
        .from('admin_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.level && filters.level.length > 0) {
        query = query.in('level', filters.level)
      }

      if (filters?.source && filters.source.length > 0) {
        query = query.in('source', filters.source)
      }

      if (filters?.search) {
        query = query.ilike('message', `%${filters.search}%`)
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate)
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      // Pagination
      const limit = filters?.limit || 100
      const offset = filters?.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching logs:', error)
        return { logs: [], total: 0 }
      }

      return {
        logs: (data || []) as LogEntry[],
        total: count || 0,
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
      return { logs: [], total: 0 }
    }
  }

  // Get error statistics
  async getErrorStats(hours: number = 24): Promise<{
    total: number
    byLevel: Record<LogLevel, number>
    bySource: Record<LogSource, number>
  }> {
    if (!this.supabase) {
      return {
        total: 0,
        byLevel: { error: 0, warn: 0, info: 0, debug: 0 },
        bySource: { api: 0, auth: 0, session: 0, payment: 0, database: 0, system: 0, cleanup: 0, livekit: 0, email: 0 },
      }
    }

    try {
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

      const { data, error } = await this.supabase
        .from('admin_logs')
        .select('level, source')
        .gte('created_at', startDate)

      if (error || !data) {
        return {
          total: 0,
          byLevel: { error: 0, warn: 0, info: 0, debug: 0 },
          bySource: { api: 0, auth: 0, session: 0, payment: 0, database: 0, system: 0, cleanup: 0, livekit: 0, email: 0 },
        }
      }

      const stats = {
        total: data.length,
        byLevel: { error: 0, warn: 0, info: 0, debug: 0 } as Record<LogLevel, number>,
        bySource: { api: 0, auth: 0, session: 0, payment: 0, database: 0, system: 0, cleanup: 0, livekit: 0, email: 0 } as Record<LogSource, number>,
      }

      data.forEach((log) => {
        if (log.level) stats.byLevel[log.level as LogLevel] = (stats.byLevel[log.level as LogLevel] || 0) + 1
        if (log.source) stats.bySource[log.source as LogSource] = (stats.bySource[log.source as LogSource] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Error getting error stats:', error)
      return {
        total: 0,
        byLevel: { error: 0, warn: 0, info: 0, debug: 0 },
        bySource: { api: 0, auth: 0, session: 0, payment: 0, database: 0, system: 0, cleanup: 0, livekit: 0, email: 0 },
      }
    }
  }
}

// Export singleton instance
export const logger = new AdminLogger()

// Export helper functions for common use cases
export const logError = (error: Error, source: LogSource, metadata?: LogMetadata) =>
  logger.logError(error, source, metadata)

export const logInfo = (source: LogSource, message: string, metadata?: LogMetadata) =>
  logger.info(source, message, metadata)

export const logWarning = (source: LogSource, message: string, metadata?: LogMetadata) =>
  logger.warn(source, message, metadata)

export const logDebug = (source: LogSource, message: string, metadata?: LogMetadata) =>
  logger.debug(source, message, metadata)
