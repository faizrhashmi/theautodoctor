// @ts-nocheck
// src/components/admin/QuickActions.tsx
'use client'

import { useState } from 'react'
import {
  Trash2,
  AlertTriangle,
  XCircle,
  Download,
  FileText,
  Loader2,
} from 'lucide-react'

interface QuickActionsProps {
  onRunCleanup?: () => Promise<void>
  onViewUnattended?: () => void
  onCancelSessions?: () => Promise<void>
  onExportAnalytics?: () => Promise<void>
  onViewLogs?: () => void
}

export function QuickActions({
  onRunCleanup,
  onViewUnattended,
  onCancelSessions,
  onExportAnalytics,
  onViewLogs,
}: QuickActionsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const handleAction = async (actionName: string, action?: () => Promise<void> | void) => {
    if (!action) return
    setLoadingAction(actionName)
    try {
      await action()
    } catch (error) {
      console.error(`Error executing ${actionName}:`, error)
    } finally {
      setLoadingAction(null)
    }
  }

  const actions = [
    {
      id: 'cleanup',
      label: 'Run Cleanup',
      description: 'Clean up expired sessions and requests',
      icon: Trash2,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      onClick: onRunCleanup,
      async: true,
    },
    {
      id: 'unattended',
      label: 'Unattended Requests',
      description: 'View all unattended session requests',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      onClick: onViewUnattended,
      async: false,
    },
    {
      id: 'cancel',
      label: 'Force Cancel Sessions',
      description: 'Cancel all stuck or orphaned sessions',
      icon: XCircle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      onClick: onCancelSessions,
      async: true,
    },
    {
      id: 'export',
      label: 'Export Analytics',
      description: 'Download analytics data as CSV',
      icon: Download,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      onClick: onExportAnalytics,
      async: true,
    },
    {
      id: 'logs',
      label: 'System Logs',
      description: 'View recent system logs and errors',
      icon: FileText,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      onClick: onViewLogs,
      async: false,
    },
  ]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
      <p className="mt-1 text-sm text-slate-600">Common administrative tasks</p>

      <div className="mt-6 grid gap-4">
        {actions.map((action) => {
          const Icon = action.icon
          const isLoading = loadingAction === action.id
          const isDisabled = !action.onClick

          return (
            <button
              key={action.id}
              onClick={() => {
                if (action.async && action.onClick) {
                  handleAction(action.id, action.onClick)
                } else if (action.onClick) {
                  void action.onClick()
                }
              }}
              disabled={isLoading || isDisabled}
              className={`flex items-start gap-4 rounded-lg border border-slate-200 p-4 text-left transition-all ${
                isDisabled
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:border-slate-300 hover:shadow-sm active:scale-[0.99]'
              }`}
            >
              <div className={`rounded-lg ${action.iconBg} p-2`}>
                {isLoading ? (
                  <Loader2 className={`h-5 w-5 ${action.iconColor} animate-spin`} />
                ) : (
                  <Icon className={`h-5 w-5 ${action.iconColor}`} />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{action.label}</p>
                <p className="mt-1 text-xs text-slate-600">{action.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
