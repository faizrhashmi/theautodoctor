'use client'

import { Wifi, WifiOff } from 'lucide-react'

type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline'

interface ConnectionQualityProps {
  quality: ConnectionQuality
  showLabel?: boolean
  rtt?: number // Round trip time in ms
}

const qualityConfig = {
  excellent: {
    label: 'Excellent',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    bars: 3,
  },
  good: {
    label: 'Good',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    bars: 2,
  },
  fair: {
    label: 'Fair',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    bars: 1,
  },
  poor: {
    label: 'Poor',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    bars: 1,
  },
  offline: {
    label: 'Offline',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    bars: 0,
  },
}

export function ConnectionQuality({ quality, showLabel = true, rtt }: ConnectionQualityProps) {
  const config = qualityConfig[quality]

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 ${config.bgColor}`}>
      {/* WiFi icon or bars */}
      {quality === 'offline' ? (
        <WifiOff className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${config.color}`} />
      ) : (
        <Wifi className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${config.color}`} />
      )}

      {/* Label and RTT */}
      {showLabel && (
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className={`text-[10px] sm:text-xs font-medium ${config.color}`}>{config.label}</span>
          {rtt !== undefined && (
            <span className="text-[10px] sm:text-xs text-slate-400 hidden sm:inline">({rtt}ms)</span>
          )}
        </div>
      )}
    </div>
  )
}

// Helper function to determine quality from RTT
export function getQualityFromRTT(rtt: number): ConnectionQuality {
  if (rtt < 100) return 'excellent'
  if (rtt < 200) return 'good'
  if (rtt < 400) return 'fair'
  return 'poor'
}
