'use client'

import { useState, useEffect } from 'react'
import { Wrench, Clock, CheckCircle, AlertCircle, Package, TrendingUp, ExternalLink, ChevronRight } from 'lucide-react'
import { routeFor } from '@/lib/routes'

/**
 * Repair Tracker Component
 * Phase 3.2: Shows active repair jobs with detailed progress tracking
 *
 * Displays:
 * - Current repair status
 * - Timeline of updates
 * - Estimated completion
 * - Workshop contact info
 */

interface RepairJob {
  id: string
  repair_quote_id: string
  description: string
  status: RepairJobStatus
  workshop_name: string | null
  workshop_id: string | null
  vehicle_info: {
    year: number
    make: string
    model: string
  } | null
  estimated_completion_date: string | null
  created_at: string
  parts_status: PartsStatus
  parts_eta: string | null
  last_update: {
    message: string
    created_at: string
  } | null
}

type RepairJobStatus =
  | 'pending_parts'
  | 'parts_received'
  | 'repair_started'
  | 'in_progress'
  | 'waiting_approval'
  | 'quality_check'
  | 'ready_for_pickup'
  | 'completed'
  | 'on_hold'
  | 'cancelled'

type PartsStatus = 'not_ordered' | 'ordered' | 'partially_received' | 'all_received' | 'on_backorder'

interface RepairTrackerProps {
  customerId?: string
}

export default function RepairTracker({ customerId }: RepairTrackerProps) {
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<RepairJob[]>([])

  useEffect(() => {
    fetchRepairJobs()
  }, [customerId])

  const fetchRepairJobs = async () => {
    try {
      const response = await fetch('/api/customer/repairs/active')
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('[RepairTracker] Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status: RepairJobStatus) => {
    const statusMap: Record<RepairJobStatus, { label: string; color: string; icon: typeof Wrench }> = {
      pending_parts: {
        label: 'Waiting for Parts',
        color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        icon: Package,
      },
      parts_received: {
        label: 'Parts Received',
        color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        icon: CheckCircle,
      },
      repair_started: {
        label: 'Work Started',
        color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        icon: Wrench,
      },
      in_progress: {
        label: 'In Progress',
        color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
        icon: TrendingUp,
      },
      waiting_approval: {
        label: 'Awaiting Your Approval',
        color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        icon: AlertCircle,
      },
      quality_check: {
        label: 'Quality Check',
        color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        icon: CheckCircle,
      },
      ready_for_pickup: {
        label: 'Ready for Pickup!',
        color: 'bg-green-500/20 text-green-400 border-green-500/30',
        icon: CheckCircle,
      },
      completed: {
        label: 'Completed',
        color: 'bg-green-500/20 text-green-400 border-green-500/30',
        icon: CheckCircle,
      },
      on_hold: {
        label: 'On Hold',
        color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        icon: Clock,
      },
      cancelled: {
        label: 'Cancelled',
        color: 'bg-red-500/20 text-red-400 border-red-500/30',
        icon: AlertCircle,
      },
    }

    return statusMap[status] || statusMap.in_progress
  }

  const getPartsStatusLabel = (status: PartsStatus): string => {
    const labels: Record<PartsStatus, string> = {
      not_ordered: 'Not Ordered',
      ordered: 'Ordered',
      partially_received: 'Partially Received',
      all_received: 'All Received',
      on_backorder: 'On Backorder',
    }
    return labels[status]
  }

  const calculateDaysRemaining = (estimatedDate: string | null): number | null => {
    if (!estimatedDate) return null
    const now = new Date()
    const completion = new Date(estimatedDate)
    const diff = completion.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'TBD'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  }

  if (loading) {
    return null
  }

  if (jobs.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const statusInfo = getStatusInfo(job.status)
        const Icon = statusInfo.icon
        const daysRemaining = calculateDaysRemaining(job.estimated_completion_date)

        return (
          <div
            key={job.id}
            className="rounded-2xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 p-4 sm:p-6 shadow-xl backdrop-blur relative"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl bg-blue-500/20">
                  <Wrench className="h-6 w-6 text-blue-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white mb-1">
                    {job.vehicle_info
                      ? `${job.vehicle_info.year} ${job.vehicle_info.make} ${job.vehicle_info.model}`
                      : 'Vehicle Repair'}
                  </h3>
                  <p className="text-sm text-slate-400">{job.description}</p>
                  {job.workshop_name && (
                    <p className="text-xs text-blue-300 mt-1">
                      at {job.workshop_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${statusInfo.color}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{statusInfo.label}</span>
              </div>
            </div>

            {/* Progress Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {/* Estimated Completion */}
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <p className="text-xs text-slate-400">Est. Completion</p>
                </div>
                <p className="text-sm font-semibold text-white">
                  {formatDate(job.estimated_completion_date)}
                </p>
                {daysRemaining !== null && daysRemaining >= 0 && (
                  <p className="text-xs text-blue-400 mt-0.5">
                    {daysRemaining === 0 ? 'Today' : `${daysRemaining}d remaining`}
                  </p>
                )}
              </div>

              {/* Parts Status */}
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-4 w-4 text-slate-400" />
                  <p className="text-xs text-slate-400">Parts</p>
                </div>
                <p className="text-sm font-semibold text-white">
                  {getPartsStatusLabel(job.parts_status)}
                </p>
                {job.parts_eta && job.parts_status === 'ordered' && (
                  <p className="text-xs text-yellow-400 mt-0.5">
                    ETA: {formatDate(job.parts_eta)}
                  </p>
                )}
              </div>

              {/* Last Update */}
              {job.last_update && (
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                    <p className="text-xs text-slate-400">Last Update</p>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">
                    {formatRelativeTime(job.last_update.created_at)}
                  </p>
                </div>
              )}
            </div>

            {/* Latest Update Message */}
            {job.last_update && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-300 mb-1">Latest Update:</p>
                <p className="text-sm text-white">{job.last_update.message}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => window.location.href = `/customer/repairs/${job.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors"
              >
                <span>View Details</span>
                <ChevronRight className="h-4 w-4" />
              </button>

              {job.workshop_id && (
                <button
                  onClick={() => window.location.href = `/workshops/${job.workshop_id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  <span>Workshop Info</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              )}

              {job.status === 'waiting_approval' && (
                <button
                  onClick={() => window.location.href = `/customer/repairs/${job.id}/approve`}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold text-sm transition-colors animate-pulse"
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>Action Required</span>
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
