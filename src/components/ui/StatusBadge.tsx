'use client'

type SessionStatus =
  | 'live'
  | 'waiting'
  | 'scheduled'
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'reconnecting'

interface StatusBadgeProps {
  status: SessionStatus
  size?: 'sm' | 'md'
  showIcon?: boolean
}

const statusConfig = {
  live: {
    label: 'Live',
    color: 'bg-red-500/20 text-red-200 border-red-500/30',
    dotColor: 'bg-red-500',
    icon: '●',
  },
  waiting: {
    label: 'Waiting',
    color: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
    dotColor: 'bg-amber-500',
    icon: '○',
  },
  scheduled: {
    label: 'Scheduled',
    color: 'bg-slate-500/20 text-slate-200 border-slate-500/30',
    dotColor: 'bg-slate-500',
    icon: '◷',
  },
  pending: {
    label: 'Pending',
    color: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
    dotColor: 'bg-blue-500',
    icon: '◐',
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-500/20 text-green-200 border-green-500/30',
    dotColor: 'bg-green-500',
    icon: '✓',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
    dotColor: 'bg-slate-600',
    icon: '✕',
  },
  reconnecting: {
    label: 'Reconnecting',
    color: 'bg-orange-500/20 text-orange-200 border-orange-500/30',
    dotColor: 'bg-orange-500',
    icon: '↻',
  },
}

export function StatusBadge({ status, size = 'md', showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status]
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${config.color} ${sizeClasses}`}
    >
      {showIcon && (
        <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor} ${status === 'live' || status === 'reconnecting' ? 'animate-pulse' : ''}`} />
      )}
      {config.label}
    </span>
  )
}
