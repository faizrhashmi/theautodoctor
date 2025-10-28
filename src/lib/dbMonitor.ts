/**
 * Database Monitoring Helper
 * Phase 3: Stability & Performance
 *
 * Monitors database query performance and logs slow queries
 */

import { logger } from './logger'

interface QueryMetrics {
  query: string
  duration: number
  success: boolean
  error?: Error
}

// Slow query threshold (milliseconds)
const SLOW_QUERY_THRESHOLD = 1000 // 1 second

/**
 * Monitor database query execution time
 */
export async function monitorQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await queryFn()
    const duration = Date.now() - startTime

    const metrics: QueryMetrics = {
      query: queryName,
      duration,
      success: true,
    }

    // Log slow queries
    if (duration > SLOW_QUERY_THRESHOLD) {
      logger.warn('Slow database query detected', {
        query: queryName,
        duration,
        threshold: SLOW_QUERY_THRESHOLD,
      })
    } else {
      logger.dbQuery(queryName, duration)
    }

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    logger.error(`Database query failed: ${queryName}`, error as Error, {
      duration,
    })

    throw error
  }
}

/**
 * Track database connection pool metrics
 */
export class ConnectionPoolMonitor {
  private activeConnections = 0
  private peakConnections = 0
  private totalQueries = 0
  private failedQueries = 0

  incrementActive() {
    this.activeConnections++
    this.peakConnections = Math.max(this.peakConnections, this.activeConnections)
  }

  decrementActive() {
    this.activeConnections = Math.max(0, this.activeConnections - 1)
  }

  recordQuery(success: boolean) {
    this.totalQueries++
    if (!success) {
      this.failedQueries++
    }
  }

  getMetrics() {
    return {
      active: this.activeConnections,
      peak: this.peakConnections,
      total: this.totalQueries,
      failed: this.failedQueries,
      successRate: this.totalQueries > 0
        ? ((this.totalQueries - this.failedQueries) / this.totalQueries) * 100
        : 100,
    }
  }

  reset() {
    this.peakConnections = this.activeConnections
    this.totalQueries = 0
    this.failedQueries = 0
  }
}

// Export singleton instance
export const connectionMonitor = new ConnectionPoolMonitor()

/**
 * Log connection pool metrics periodically
 */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const metrics = connectionMonitor.getMetrics()

    if (metrics.total > 0) {
      logger.info('Database connection pool metrics', metrics)
      connectionMonitor.reset()
    }
  }, 60000) // Every minute
}
