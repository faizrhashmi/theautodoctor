// @ts-nocheck
// src/components/admin/SystemHealth.tsx
'use client'

import { Database, Server, Video, CreditCard, AlertCircle, CheckCircle } from 'lucide-react'

interface SystemHealthProps {
  databaseStatus: 'healthy' | 'degraded' | 'down'
  supabaseStatus: 'healthy' | 'degraded' | 'down'
  livekitStatus: 'healthy' | 'degraded' | 'down'
  stripeStatus: 'healthy' | 'degraded' | 'down'
  lastCleanup?: string
  errorRate?: number
}

interface StatusItemProps {
  label: string
  status: 'healthy' | 'degraded' | 'down'
  icon: React.ElementType
}

function StatusItem({ label, status, icon: Icon }: StatusItemProps) {
  const statusConfig = {
    healthy: {
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
      label: 'Operational',
    },
    degraded: {
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      label: 'Degraded',
    },
    down: {
      color: 'text-red-600',
      bg: 'bg-red-100',
      label: 'Down',
    },
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg ${config.bg} p-2`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {status === 'healthy' ? (
          <CheckCircle className="h-4 w-4 text-emerald-600" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-600" />
        )}
        <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
      </div>
    </div>
  )
}

export function SystemHealth({
  databaseStatus,
  supabaseStatus,
  livekitStatus,
  stripeStatus,
  lastCleanup,
  errorRate = 0,
}: SystemHealthProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">System Health</h3>
      <p className="mt-1 text-sm text-slate-600">Real-time service status monitoring</p>

      <div className="mt-6 divide-y divide-slate-100">
        <StatusItem label="Database" status={databaseStatus} icon={Database} />
        <StatusItem label="Supabase" status={supabaseStatus} icon={Server} />
        <StatusItem label="LiveKit" status={livekitStatus} icon={Video} />
        <StatusItem label="Stripe" status={stripeStatus} icon={CreditCard} />
      </div>

      <div className="mt-6 rounded-lg bg-slate-50 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-600">Last Cleanup</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {lastCleanup || 'Never'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Error Rate (1h)</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {errorRate.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
