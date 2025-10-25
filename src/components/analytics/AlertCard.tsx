// Alert Card Component for displaying system alerts
import React from 'react'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success'

interface AlertCardProps {
  id: string
  title: string
  message: string
  severity: AlertSeverity
  createdAt: string
  acknowledged?: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
  onAcknowledge?: (id: string) => void
  onDismiss?: (id: string) => void
  metadata?: Record<string, any>
}

export function AlertCard({
  id,
  title,
  message,
  severity,
  createdAt,
  acknowledged,
  acknowledgedBy,
  acknowledgedAt,
  onAcknowledge,
  onDismiss,
  metadata,
}: AlertCardProps) {
  const getSeverityIcon = () => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5" />
      case 'warning':
        return <AlertCircle className="h-5 w-5" />
      case 'success':
        return <CheckCircle className="h-5 w-5" />
      default:
        return <Info className="h-5 w-5" />
    }
  }

  const getSeverityColors = () => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-500',
          title: 'text-red-900',
        }
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-900',
        }
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-500',
          title: 'text-green-900',
        }
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-500',
          title: 'text-blue-900',
        }
    }
  }

  const colors = getSeverityColors()

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-opacity',
        colors.bg,
        colors.border,
        acknowledged && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex-shrink-0 mt-0.5', colors.icon)}>
          {getSeverityIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className={cn('font-semibold', colors.title)}>{title}</h4>
          <p className="text-sm text-gray-600 mt-1">{message}</p>

          {metadata && Object.keys(metadata).length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              {Object.entries(metadata).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium">{key}:</span> {String(value)}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>

            {acknowledged && acknowledgedAt && (
              <div className="text-xs text-gray-500">
                Acknowledged{' '}
                {formatDistanceToNow(new Date(acknowledgedAt), {
                  addSuffix: true,
                })}
                {acknowledgedBy && ` by ${acknowledgedBy}`}
              </div>
            )}
          </div>

          {!acknowledged && (onAcknowledge || onDismiss) && (
            <div className="flex items-center gap-2 mt-3">
              {onAcknowledge && (
                <button
                  onClick={() => onAcknowledge(id)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Acknowledge
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={() => onDismiss(id)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>

        {onDismiss && !acknowledged && (
          <button
            onClick={() => onDismiss(id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}