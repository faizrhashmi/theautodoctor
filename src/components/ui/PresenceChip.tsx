'use client'

import { User } from 'lucide-react'

type PresenceStatus = 'online' | 'offline' | 'busy' | 'away'

interface PresenceChipProps {
  name?: string
  avatarUrl?: string
  status?: PresenceStatus
  showName?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-slate-400',
  busy: 'bg-red-500',
  away: 'bg-amber-500',
}

const sizeClasses = {
  sm: {
    avatar: 'h-8 w-8',
    dot: 'h-2 w-2',
    text: 'text-sm',
  },
  md: {
    avatar: 'h-10 w-10',
    dot: 'h-2.5 w-2.5',
    text: 'text-base',
  },
  lg: {
    avatar: 'h-12 w-12',
    dot: 'h-3 w-3',
    text: 'text-lg',
  },
}

export function PresenceChip({
  name = 'User',
  avatarUrl,
  status = 'offline',
  showName = true,
  size = 'md',
}: PresenceChipProps) {
  const sizes = sizeClasses[size]

  return (
    <div className="flex items-center gap-2">
      {/* Avatar with status indicator */}
      <div className="relative">
        <div className={`${sizes.avatar} flex items-center justify-center overflow-hidden rounded-full bg-slate-700`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <User className="h-1/2 w-1/2 text-slate-400" />
          )}
        </div>
        {/* Status dot */}
        <div
          className={`absolute bottom-0 right-0 ${sizes.dot} rounded-full border-2 border-white ${statusColors[status]}`}
        />
      </div>

      {/* Name */}
      {showName && <span className={`${sizes.text} font-medium text-slate-200`}>{name}</span>}
    </div>
  )
}
