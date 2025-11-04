'use client'

import { useState, useEffect } from 'react'
import {
  AlertCircle,
  Bell,
  Car,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  MessageSquare,
  Wrench,
  Star,
  X,
} from 'lucide-react'

/**
 * Pending Actions Widget
 * Phase 3.3: Centralizes all items requiring customer attention
 *
 * Shows:
 * - Incomplete onboarding steps
 * - Pending quote responses
 * - Active repairs needing attention
 * - Unrated sessions
 * - Follow-up opportunities
 */

interface PendingAction {
  id: string
  type: 'onboarding' | 'quote' | 'repair' | 'rating' | 'follow_up' | 'vehicle'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  actionUrl: string
  actionLabel: string
  createdAt?: string
  dueDate?: string
}

interface PendingActionsResponse {
  actions: PendingAction[]
  count: number
}

export default function PendingActionsWidget() {
  const [loading, setLoading] = useState(true)
  const [actions, setActions] = useState<PendingAction[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetchPendingActions()
  }, [])

  const fetchPendingActions = async () => {
    try {
      const response = await fetch('/api/customer/pending-actions')
      if (response.ok) {
        const data: PendingActionsResponse = await response.json()
        setActions(data.actions || [])
      }
    } catch (error) {
      console.error('[PendingActionsWidget] Error fetching actions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (type: PendingAction['type']) => {
    const icons = {
      onboarding: CheckCircle2,
      quote: ClipboardList,
      repair: Wrench,
      rating: Star,
      follow_up: MessageSquare,
      vehicle: Car,
    }
    return icons[type] || AlertCircle
  }

  const getActionColor = (priority: PendingAction['priority']) => {
    const colors = {
      high: 'bg-red-500/20 text-red-400 border-red-500/30',
      medium: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    }
    return colors[priority]
  }

  const getPriorityBadgeColor = (priority: PendingAction['priority']) => {
    const colors = {
      high: 'bg-red-500/20 text-red-400',
      medium: 'bg-orange-500/20 text-orange-400',
      low: 'bg-slate-500/20 text-slate-400',
    }
    return colors[priority]
  }

  const formatDueDate = (dueDate?: string): string | null => {
    if (!dueDate) return null

    const due = new Date(dueDate)
    const now = new Date()
    const diffMs = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    if (diffDays <= 7) return `Due in ${diffDays} days`
    return null
  }

  if (loading) {
    return null
  }

  if (actions.length === 0 || dismissed) {
    return null
  }

  // Prioritize high priority actions
  const sortedActions = [...actions].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  const highPriorityCount = actions.filter((a) => a.priority === 'high').length

  return (
    <div className="mb-6 sm:mb-8 rounded-2xl border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-red-500/5 p-4 sm:p-6 shadow-2xl backdrop-blur relative">
      {/* Dismiss Button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
          <Bell className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-bold text-white">
            Action Required
          </h3>
          <p className="text-xs sm:text-sm text-orange-300">
            {actions.length} item{actions.length > 1 ? 's' : ''} need{actions.length === 1 ? 's' : ''} your attention
            {highPriorityCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/30 text-red-300 text-xs font-semibold">
                <AlertCircle className="h-3 w-3" />
                {highPriorityCount} urgent
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-3">
        {sortedActions.slice(0, 5).map((action) => {
          const Icon = getActionIcon(action.type)
          const dueLabel = formatDueDate(action.dueDate)

          return (
            <div
              key={action.id}
              className={`flex items-start gap-3 p-3 sm:p-4 rounded-lg border transition-all hover:scale-[1.02] ${getActionColor(action.priority)}`}
            >
              {/* Icon */}
              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-white/10">
                <Icon className="h-5 w-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm sm:text-base font-semibold text-white">
                    {action.title}
                  </h4>
                  {action.priority === 'high' && (
                    <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${getPriorityBadgeColor(action.priority)}`}>
                      Urgent
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mb-2">
                  {action.description}
                </p>

                {/* Due Date Badge */}
                {dueLabel && (
                  <div className="flex items-center gap-1.5 text-xs text-orange-300 mb-2">
                    <Clock className="h-3 w-3" />
                    <span>{dueLabel}</span>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={() => (window.location.href = action.actionUrl)}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white hover:underline"
                >
                  <span>{action.actionLabel}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}

        {/* Show More Link */}
        {actions.length > 5 && (
          <button
            onClick={() => (window.location.href = '/customer/actions')}
            className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium text-orange-300 hover:text-orange-200 transition-colors"
          >
            <span>View all {actions.length} actions</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
