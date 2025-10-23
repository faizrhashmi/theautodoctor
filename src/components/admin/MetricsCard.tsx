// @ts-nocheck
// src/components/admin/MetricsCard.tsx
'use client'

import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface MetricsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
  iconColor?: string
  iconBgColor?: string
  loading?: boolean
  description?: string
  children?: ReactNode
}

export function MetricsCard({
  title,
  value,
  icon: Icon,
  trend,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-100',
  loading = false,
  description,
  children,
}: MetricsCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-slate-200"></div>
          ) : (
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          )}
          {description && (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          )}
          {trend && !loading && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <span
                className={
                  trend.isPositive
                    ? 'font-medium text-emerald-600'
                    : 'font-medium text-red-600'
                }
              >
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-slate-500">{trend.label}</span>
            </div>
          )}
          {children}
        </div>
        <div className={`rounded-lg ${iconBgColor} p-3`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  )
}
