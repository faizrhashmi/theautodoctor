// @ts-nocheck
// src/app/api/admin/health/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/adminLogger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ServiceHealth {
  service: string
  status: 'healthy' | 'degraded' | 'down'
  responseTime?: number
  message?: string
  lastChecked: string
}

async function checkSupabase(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1)
    const responseTime = Date.now() - start

    if (error) {
      return {
        service: 'supabase',
        status: 'down',
        message: error.message,
        lastChecked: new Date().toISOString(),
      }
    }

    return {
      service: 'supabase',
      status: responseTime > 1000 ? 'degraded' : 'healthy',
      responseTime,
      lastChecked: new Date().toISOString(),
    }
  } catch (error: any) {
    return {
      service: 'supabase',
      status: 'down',
      message: error.message,
      lastChecked: new Date().toISOString(),
    }
  }
}

async function checkLiveKit(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    // Check if LiveKit env vars are configured
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return {
        service: 'livekit',
        status: 'down',
        message: 'LiveKit credentials not configured',
        lastChecked: new Date().toISOString(),
      }
    }

    // For a real health check, you'd ping the LiveKit API
    // For now, we'll just check configuration
    return {
      service: 'livekit',
      status: 'healthy',
      responseTime: Date.now() - start,
      message: 'Credentials configured',
      lastChecked: new Date().toISOString(),
    }
  } catch (error: any) {
    return {
      service: 'livekit',
      status: 'down',
      message: error.message,
      lastChecked: new Date().toISOString(),
    }
  }
}

async function checkStripe(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        service: 'stripe',
        status: 'down',
        message: 'Stripe key not configured',
        lastChecked: new Date().toISOString(),
      }
    }

    // You could make an actual Stripe API call here
    // For now, just check configuration
    return {
      service: 'stripe',
      status: 'healthy',
      responseTime: Date.now() - start,
      message: 'API key configured',
      lastChecked: new Date().toISOString(),
    }
  } catch (error: any) {
    return {
      service: 'stripe',
      status: 'down',
      message: error.message,
      lastChecked: new Date().toISOString(),
    }
  }
}

async function checkEmail(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    // Check email configuration (e.g., Resend, SendGrid, etc.)
    const hasEmailConfig = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY

    if (!hasEmailConfig) {
      return {
        service: 'email',
        status: 'down',
        message: 'Email service not configured',
        lastChecked: new Date().toISOString(),
      }
    }

    return {
      service: 'email',
      status: 'healthy',
      responseTime: Date.now() - start,
      message: 'Email service configured',
      lastChecked: new Date().toISOString(),
    }
  } catch (error: any) {
    return {
      service: 'email',
      status: 'down',
      message: error.message,
      lastChecked: new Date().toISOString(),
    }
  }
}

async function checkStorage(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    // Check Supabase storage
    const { data, error } = await supabase.storage.listBuckets()
    const responseTime = Date.now() - start

    if (error) {
      return {
        service: 'storage',
        status: 'down',
        message: error.message,
        lastChecked: new Date().toISOString(),
      }
    }

    return {
      service: 'storage',
      status: responseTime > 1000 ? 'degraded' : 'healthy',
      responseTime,
      message: `${data.length} buckets`,
      lastChecked: new Date().toISOString(),
    }
  } catch (error: any) {
    return {
      service: 'storage',
      status: 'down',
      message: error.message,
      lastChecked: new Date().toISOString(),
    }
  }
}

export async function GET(_request: NextRequest) {
  try {
    // Run all health checks in parallel
    const [supabaseHealth, livekitHealth, stripeHealth, emailHealth, storageHealth] = await Promise.all([
      checkSupabase(),
      checkLiveKit(),
      checkStripe(),
      checkEmail(),
      checkStorage(),
    ])

    const services = [supabaseHealth, livekitHealth, stripeHealth, emailHealth, storageHealth]

    // Save health check results
    const healthCheckPromises = services.map(service =>
      supabase.from('system_health_checks').insert({
        service_name: service.service,
        status: service.status,
        response_time_ms: service.responseTime,
        error_message: service.message,
        checked_at: service.lastChecked,
      })
    )

    await Promise.all(healthCheckPromises)

    // Get overall system status
    const overallStatus = services.every(s => s.status === 'healthy')
      ? 'healthy'
      : services.some(s => s.status === 'down')
      ? 'down'
      : 'degraded'

    // Get recent incidents (errors in last 24 hours)
    const { data: recentErrors } = await supabase
      .from('admin_errors')
      .select('*')
      .eq('status', 'open')
      .gte('last_seen', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('last_seen', { ascending: false })
      .limit(10)

    // Get uptime stats (last 24 hours)
    const { data: healthHistory } = await supabase
      .from('system_health_checks')
      .select('service_name, status')
      .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const uptimeStats: Record<string, { total: number; healthy: number; percentage: number }> = {}

    if (healthHistory) {
      healthHistory.forEach(check => {
        if (!uptimeStats[check.service_name]) {
          uptimeStats[check.service_name] = { total: 0, healthy: 0, percentage: 0 }
        }
        uptimeStats[check.service_name]!.total++
        if (check.status === 'healthy') {
          uptimeStats[check.service_name]!.healthy++
        }
      })

      Object.keys(uptimeStats).forEach(service => {
        const stats = uptimeStats[service]
        if (stats) {
          stats.percentage = (stats.healthy / stats.total) * 100
        }
      })
    }

    return NextResponse.json({
      status: overallStatus,
      services,
      recentIncidents: recentErrors || [],
      uptime: uptimeStats,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    await logger.error('system', 'Health check failed', {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      { error: 'Health check failed', message: error.message },
      { status: 500 }
    )
  }
}
