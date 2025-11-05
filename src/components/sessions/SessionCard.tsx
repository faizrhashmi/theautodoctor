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
  Loader2
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
  onCancel?: () => Promise<void>
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
  presence,
  cta,
  userRole,
  onEnd,
  onCancel
}: SessionCardProps) {
  const [isEnding, setIsEnding] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isCtaLoading, setIsCtaLoading] = useState(false)

  const statusConfig = STATUS_CONFIG[status]
  const StatusIcon = statusConfig.icon
  const TypeIcon = TYPE_ICONS[type]

  const handleEnd = async () => {
    if (!onEnd) return
    setIsEnding(true)
    try {
      await onEnd()
    } catch (error) {
      console.error('Failed to end session:', error)
    } finally {
      setIsEnding(false)
    }
  }

  const handleCancel = async () => {
    if (!onCancel) return
    setIsCancelling(true)
    try {
      await onCancel()
    } catch (error) {
      console.error('Failed to cancel session:', error)
    } finally {
      setIsCancelling(false)
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
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 transition-all hover:border-orange-500/50 hover:bg-slate-900/70">
      {/* Header: Type, Plan, Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-4 h-4 text-slate-400" />
          {plan && (
            <span className="text-xs font-medium uppercase text-slate-400">
              {plan}
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

        {/* Secondary Actions */}
        {isActive && userRole === 'customer' && onEnd && (
          <button
            onClick={handleEnd}
            disabled={isEnding}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEnding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'End'
            )}
          </button>
        )}

        {status === 'pending' && userRole === 'customer' && onCancel && (
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Cancel'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
