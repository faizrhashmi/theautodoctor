// KPI Card Component for displaying metrics
import React from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  icon?: React.ReactNode
  className?: string
  valueClassName?: string
  target?: {
    value: number
    label: string
  }
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  className,
  valueClassName,
  target,
}: KPICardProps) {
  const getTrendIcon = () => {
    if (!trend) return null

    if (trend.value === 0) {
      return <Minus className="h-4 w-4 text-gray-500" />
    }

    return trend.isPositive ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    )
  }

  const getTrendColor = () => {
    if (!trend) return ''
    if (trend.value === 0) return 'text-gray-500'
    return trend.isPositive ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200 p-6',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {icon && <div className="text-gray-500">{icon}</div>}
            <p className="text-sm font-medium text-gray-600">{title}</p>
          </div>

          <p className={cn('text-3xl font-bold text-gray-900', valueClassName)}>
            {value}
          </p>

          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}

          {trend && (
            <div className={cn('flex items-center gap-1 mt-2', getTrendColor())}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {Math.abs(trend.value)}%
              </span>
              <span className="text-sm text-gray-500">vs last period</span>
            </div>
          )}

          {target && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Target</span>
                <span className="font-medium text-gray-700">
                  {target.value} {target.label}
                </span>
              </div>
              <div className="mt-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (Number(value) / target.value) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}