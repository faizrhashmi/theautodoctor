// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'

interface ServiceHealth {
  service: string
  status: 'healthy' | 'degraded' | 'down'
  responseTime?: number
  message?: string
  lastChecked: string
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'down'
  services: ServiceHealth[]
  recentIncidents: any[]
  uptime: Record<string, { total: number; healthy: number; percentage: number }>
  timestamp: string
}

const STATUS_COLORS = {
  healthy: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  degraded: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
  },
  down: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
}

const SERVICE_ICONS: Record<string, string> = {
  supabase: '🗄️',
  livekit: '📹',
  stripe: '💳',
  email: '📧',
  storage: '📦',
}

export default function HealthPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/admin/health')
      const data = await response.json()
      setHealthData(data)
    } catch (error) {
      console.error('Failed to fetch health data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
    return undefined
  }, [autoRefresh])

  const formatUptime = (percentage: number) => {
    return (percentage || 0).toFixed(2) + '%'
  }

  const getUptimeColor = (percentage: number) => {
    if (percentage >= 99.9) return 'text-green-600'
    if (percentage >= 95) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Health Monitor</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor service status and system health</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="autoRefresh" className="text-sm text-slate-200">
              Auto-refresh (30s)
            </label>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/25 rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Overall Status */}
      {healthData && (
        <div className={`rounded-lg border-2 p-6 ${
          healthData.status === 'healthy' ? 'bg-green-50 border-green-200' :
          healthData.status === 'degraded' ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              healthData.status === 'healthy' ? 'bg-green-500' :
              healthData.status === 'degraded' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {healthData.status === 'healthy' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                )}
              </svg>
            </div>
            <div className="flex-1">
              <h2 className={`text-2xl font-bold ${
                healthData.status === 'healthy' ? 'text-green-900' :
                healthData.status === 'degraded' ? 'text-yellow-900' :
                'text-red-900'
              }`}>
                System {healthData.status === 'healthy' ? 'Operational' : healthData.status === 'degraded' ? 'Degraded' : 'Down'}
              </h2>
              <p className={`text-sm mt-1 ${
                healthData.status === 'healthy' ? 'text-green-700' :
                healthData.status === 'degraded' ? 'text-yellow-700' :
                'text-red-700'
              }`}>
                {healthData.status === 'healthy'
                  ? 'All systems are functioning normally'
                  : healthData.status === 'degraded'
                  ? 'Some services are experiencing issues'
                  : 'Critical services are down'}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Last checked: {new Date(healthData.timestamp).toLocaleString('en-CA')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Service Status Cards */}
      {healthData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthData.services.map((service) => {
            const colors = STATUS_COLORS[service.status]
            return (
              <div key={service.service} className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-4`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{SERVICE_ICONS[service.service] || '⚙️'}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-white capitalize">{service.service}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${colors.dot}`}></span>
                        <span className={`text-xs font-medium ${colors.text} capitalize`}>
                          {service.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {service.responseTime !== undefined && (
                  <div className="mt-3 text-xs text-slate-400">
                    Response time: {service.responseTime}ms
                  </div>
                )}
                {service.message && (
                  <div className="mt-2 text-xs text-slate-400">
                    {service.message}
                  </div>
                )}
                {healthData.uptime[service.service] && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">24h Uptime</span>
                      <span className={`font-semibold ${getUptimeColor(healthData.uptime[service.service]!.percentage)}`}>
                        {formatUptime(healthData.uptime[service.service]!.percentage)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Uptime Statistics */}
      {healthData && healthData.uptime && Object.keys(healthData.uptime).length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 overflow-hidden">
          <div className="bg-slate-900/50 px-6 py-3 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white">Uptime Statistics (Last 24 Hours)</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(healthData.uptime).map(([service, stats]) => (
                <div key={service}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-200 capitalize">{service}</span>
                    <span className={`text-sm font-semibold ${getUptimeColor(stats.percentage)}`}>
                      {formatUptime(stats.percentage)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        stats.percentage >= 99.9 ? 'bg-green-500' :
                        stats.percentage >= 95 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${stats.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                    <span>{stats.healthy} healthy checks</span>
                    <span>{stats.total} total checks</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Incidents */}
      {healthData && healthData.recentIncidents && healthData.recentIncidents.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 overflow-hidden">
          <div className="bg-slate-900/50 px-6 py-3 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Recent Incidents (Last 24 Hours)</h3>
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
              {healthData.recentIncidents.length} Open
            </span>
          </div>
          <div className="divide-y divide-gray-200">
            {healthData.recentIncidents.map((incident) => (
              <div key={incident.id} className="p-4 hover:bg-slate-900/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                        {incident.error_type}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(incident.last_seen).toLocaleString('en-CA')}
                      </span>
                    </div>
                    <p className="text-sm text-white mt-1">{incident.error_message}</p>
                    {incident.occurrence_count > 1 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Occurred {incident.occurrence_count} times
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Information */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 overflow-hidden">
        <div className="bg-slate-900/50 px-6 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">System Information</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Environment</label>
              <div className="mt-1 text-sm text-white">
                {process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Platform</label>
              <div className="mt-1 text-sm text-white">Vercel / Next.js</div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Database</label>
              <div className="mt-1 text-sm text-white">Supabase (PostgreSQL)</div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Video Service</label>
              <div className="mt-1 text-sm text-white">LiveKit</div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">Payment Provider</label>
              <div className="mt-1 text-sm text-white">Stripe</div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase">File Storage</label>
              <div className="mt-1 text-sm text-white">Supabase Storage</div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && !healthData && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-sm text-slate-400 mt-4">Checking system health...</p>
          </div>
        </div>
      )}
    </div>
  )
}
