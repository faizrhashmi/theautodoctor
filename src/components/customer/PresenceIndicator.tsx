'use client'

/**
 * PresenceIndicator Component
 * Shows real-time mechanic availability status with visual indicators
 */

interface PresenceIndicatorProps {
  status: 'online' | 'offline' | 'away'
  lastSeenText?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export default function PresenceIndicator({
  status,
  lastSeenText,
  size = 'md',
  showText = true
}: PresenceIndicatorProps) {
  // Size configurations
  const dotSizes = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3'
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  // Status configurations
  const statusConfig = {
    online: {
      dotColor: 'bg-green-400',
      textColor: 'text-green-400',
      label: lastSeenText || 'Available now',
      animate: true
    },
    away: {
      dotColor: 'bg-yellow-400',
      textColor: 'text-yellow-400',
      label: lastSeenText || 'Active recently',
      animate: false
    },
    offline: {
      dotColor: 'bg-slate-400',
      textColor: 'text-slate-400',
      label: lastSeenText || 'Offline',
      animate: false
    }
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-1.5">
      {/* Status dot */}
      <span className="relative flex items-center justify-center">
        <span
          className={`
            ${dotSizes[size]}
            ${config.dotColor}
            rounded-full
            ${config.animate ? 'animate-pulse' : ''}
          `}
        />
        {/* Pulse ring for online status */}
        {config.animate && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
        )}
      </span>

      {/* Status text */}
      {showText && (
        <span className={`${textSizes[size]} ${config.textColor} font-medium`}>
          {config.label}
        </span>
      )}
    </div>
  )
}
