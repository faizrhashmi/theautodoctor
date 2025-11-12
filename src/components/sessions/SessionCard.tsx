'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Video,
  MessageSquare,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Wrench,
  Car,
  ArrowRight,
  Loader2,
  Eye
} from 'lucide-react'

/**
 * SessionCard Component
 * Unified card for displaying sessions on both customer and mechanic dashboards
 * Replaces ActiveSessionsManager with a simpler, more flexible design
 */

export interface SessionCardProps {
  sessionId: string
  type: 'chat' | 'video' | 'diagnostic'
  status: 'pending' | 'waiting' | 'live' | 'ended' | 'cancelled' | 'scheduled'
  plan?: string
  createdAt: string
  startedAt?: string | null
  endedAt?: string | null

  // Partner info (mechanic for customer, customer for mechanic)
  partnerName?: string | null
  partnerRole?: 'customer' | 'mechanic'

  // Vehicle info
  vehicle?: {
    year?: string
    make?: string
    model?: string
  } | null

  // Concern/issue
  concern?: string

  // Urgent flag
  urgent?: boolean

  // Presence indicators
  presence?: {
    customerJoined?: boolean
    mechanicJoined?: boolean
  }

  // CTA
  cta?: {
    action: string
    route?: string
    onClick?: () => Promise<void> | void
  } | null

  // User's role in this session
  userRole: 'customer' | 'mechanic'

  // Optional callbacks
  onEnd?: () => Promise<void>
  onViewDetails?: (sessionId: string) => void
  showViewButton?: boolean
}

const STATUS_CONFIG = {
  pending: {
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    icon: Clock,
    label: 'Pending'
  },
  waiting: {
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    icon: Clock,
    label: 'Waiting'
  },
  live: {
    color: 'text-green-400 bg-green-500/10 border-green-500/30',
    icon: Activity,
    label: 'Live'
  },
  ended: {
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    icon: CheckCircle,
    label: 'Ended'
  },
  cancelled: {
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
    icon: XCircle,
    label: 'Cancelled'
  },
  scheduled: {
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    icon: Clock,
    label: 'Scheduled'
  }
}

const TYPE_ICONS = {
  chat: MessageSquare,
  video: Video,
  diagnostic: Video
}

export default function SessionCard({
  sessionId,
  type,
  status,
  plan,
  createdAt,
  startedAt,
  endedAt,
  partnerName,
  partnerRole,
  vehicle,
  concern,
  urgent = false,
  presence,
  cta,
  userRole,
  onEnd,
  onViewDetails,
  showViewButton = false
}: SessionCardProps) {
  const [isEnding, setIsEnding] = useState(false)
  const [isCtaLoading, setIsCtaLoading] = useState(false)

  const statusConfig = STATUS_CONFIG[status]
  const StatusIcon = statusConfig.icon
  const TypeIcon = TYPE_ICONS[type]

  const handleEnd = async () => {
    if (!onEnd) return

    // Show confirmation for all sessions
    const confirmMessage = status === 'pending'
      ? 'Are you sure you want to cancel this session?'
      : 'Are you sure you want to end this session?'

    if (!confirm(confirmMessage)) return

    setIsEnding(true)
    try {
      await onEnd()
    } catch (error) {
      console.error('Failed to end session:', error)
    } finally {
      setIsEnding(false)
    }
  }

  const handleCtaClick = async () => {
    if (!cta?.onClick) return
    setIsCtaLoading(true)
    try {
      await cta.onClick()
    } catch (error) {
      console.error('Failed to execute CTA action:', error)
    } finally {
      setIsCtaLoading(false)
    }
  }

  // Determine if session is active (can be joined)
  const isActive = ['pending', 'waiting', 'live'].includes(status)

  return (
    <div className={`rounded-lg border p-4 transition-all ${
      urgent
        ? 'border-red-500/50 bg-red-500/10 hover:border-red-500/70 hover:bg-red-500/20'
        : 'border-slate-700 bg-slate-900/50 hover:border-orange-500/50 hover:bg-slate-900/70'
    }`}>
      {/* Header: Type, Plan, Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-4 h-4 text-slate-400" />
          {plan && (
            <span className="text-xs font-medium uppercase text-slate-400">
              {plan}
            </span>
          )}
          {urgent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500 text-white animate-pulse">
              <AlertCircle className="w-3 h-3" />
              URGENT
            </span>
          )}
        </div>

        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig.color}`}>
          <StatusIcon className="w-3 h-3" />
          {statusConfig.label}
        </span>
      </div>

      {/* Partner Info */}
      {partnerName && (
        <div className="flex items-center gap-2 mb-2">
          {partnerRole === 'mechanic' ? (
            <Wrench className="w-4 h-4 text-slate-500" />
          ) : (
            <User className="w-4 h-4 text-slate-500" />
          )}
          <span className="text-white font-medium text-sm truncate">
            {partnerName}
          </span>
        </div>
      )}

      {/* Vehicle */}
      {vehicle && (vehicle.year || vehicle.make || vehicle.model) && (
        <div className="flex items-center gap-2 mb-2">
          <Car className="w-4 h-4 text-slate-500" />
          <span className="text-slate-400 text-sm truncate">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </span>
        </div>
      )}

      {/* Concern */}
      {concern && (
        <p className="text-sm text-slate-400 mb-3 line-clamp-2">
          {concern}
        </p>
      )}

      {/* Presence Indicators */}
      {presence && status === 'live' && (
        <div className="flex items-center gap-3 mb-3 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            {presence.customerJoined ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Customer in room</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-slate-600 rounded-full" />
                <span>Customer waiting</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {presence.mechanicJoined ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Mechanic in room</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-slate-600 rounded-full" />
                <span>Mechanic waiting</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className="text-xs text-slate-500 mb-3">
        {endedAt ? (
          <>Ended {new Date(endedAt).toLocaleString()}</>
        ) : startedAt ? (
          <>Started {new Date(startedAt).toLocaleString()}</>
        ) : (
          <>Created {new Date(createdAt).toLocaleString()}</>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* View Details Button (for pending sessions) */}
        {showViewButton && onViewDetails && status === 'pending' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onViewDetails(sessionId)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            View Details
          </button>
        )}

        {/* Primary CTA */}
        {cta && isActive && (
          cta.onClick ? (
            <button
              onClick={handleCtaClick}
              disabled={isCtaLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCtaLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {cta.action}
                </>
              ) : (
                <>
                  {cta.action}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : cta.route ? (
            <Link
              href={cta.route}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {cta.action}
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : null
        )}

        {/* End Session Button */}
        {isActive && userRole === 'customer' && onEnd && (
          <button
            onClick={handleEnd}
            disabled={isEnding}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEnding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              status === 'pending' ? 'Cancel' : 'End Session'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
