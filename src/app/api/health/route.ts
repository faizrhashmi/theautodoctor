/**
 * Enhanced Health Check Endpoint
 * Phase 3: Stability & Performance
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  checks: {
    database: { status: 'up' | 'down'; latency?: number; error?: string }
    application: { status: 'up'; version: string }
  }
}

export async function GET() {
  const startTime = Date.now()
  const checks: HealthStatus['checks'] = {
    database: { status: 'down' },
    application: {
      status: 'up',
      version: process.env.npm_package_version || '1.0.0',
    },
  }

  // Check database connectivity
  try {
    const dbStart = Date.now()
    const { error } = await supabaseAdmin.from('profiles').select('id').limit(1).single()
    const dbLatency = Date.now() - dbStart

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine for health check
      throw error
    }

    checks.database = { status: 'up', latency: dbLatency }
  } catch (error) {
    checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Determine overall status
  const allUp = checks.database.status === 'up'
  const status: HealthStatus['status'] = allUp ? 'healthy' : 'unhealthy'

  const response: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  }

  const httpStatus = status === 'healthy' ? 200 : 503

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
