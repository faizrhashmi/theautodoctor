'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { MechanicPresencePayload } from '@/types/presence'

type MechanicPresenceIndicatorProps = {
  className?: string
  loadingText?: string
  zeroText?: string
  formatOnlineText?: (count: number) => string
  variant?: 'light' | 'dark'
}

type PresenceState = 'loading' | 'offline' | 'online' | 'error'

const VARIANT_STYLES = {
  light: {
    base: 'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium shadow-sm transition-colors',
    online: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    offline: 'border-slate-200 bg-white text-slate-600',
    loading: 'border-slate-200 bg-white text-slate-500',
    error: 'border-rose-200 bg-rose-50 text-rose-600'
  },
  dark: {
    base: 'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors backdrop-blur',
    online: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100',
    offline: 'border-white/15 bg-white/10 text-slate-200',
    loading: 'border-white/15 bg-white/10 text-slate-200',
    error: 'border-rose-400/60 bg-rose-500/10 text-rose-100'
  }
} as const

export default function MechanicPresenceIndicator({
  className = '',
  loadingText = 'Checking mechanic availability…',
  zeroText = 'No mechanics online right now',
  formatOnlineText = (count: number) => `🟢 ${count} mechanic${count === 1 ? '' : 's'} online now`,
  variant = 'light'
}: MechanicPresenceIndicatorProps) {
  const supabase = useMemo(() => createClient(), [])
  const [onlineCount, setOnlineCount] = useState<number | null>(null)
  const [state, setState] = useState<PresenceState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const channel = supabase.channel('online_mechanics', {
      config: { presence: { key: `viewer-${Math.random().toString(36).slice(2)}` } }
    })

    const updateCount = () => {
      const presence = channel.presenceState<MechanicPresencePayload>()
      const uniqueIds = new Set<string>()

      Object.values(presence).forEach((entries) => {
        entries?.forEach((entry) => {
          if (entry?.user_id && entry.status === 'online') {
            uniqueIds.add(entry.user_id)
          }
        })
      })

      if (!isMounted) return
      setOnlineCount(uniqueIds.size)
      setState(uniqueIds.size > 0 ? 'online' : 'offline')
      setErrorMessage(null)
    }

    channel
      .on('presence', { event: 'sync' }, updateCount)
      .on('presence', { event: 'join' }, updateCount)
      .on('presence', { event: 'leave' }, updateCount)

    channel.subscribe((status) => {
      if (!isMounted) return
      if (status === 'SUBSCRIBED') {
        updateCount()
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setState('error')
        setErrorMessage('Unable to load mechanic availability right now.')
      }
    })

    return () => {
      isMounted = false
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const variantStyles = VARIANT_STYLES[variant]
  const statusClass =
    state === 'online'
      ? variantStyles.online
      : state === 'error'
      ? variantStyles.error
      : state === 'loading'
      ? variantStyles.loading
      : variantStyles.offline

  let message: string

  if (state === 'loading') {
    message = loadingText
  } else if (state === 'error') {
    message = errorMessage ?? 'Unable to load mechanic availability right now.'
  } else if ((onlineCount ?? 0) === 0) {
    message = zeroText
  } else {
    message = formatOnlineText(onlineCount ?? 0)
  }

  const indicatorClass =
    state === 'online'
      ? 'h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]'
      : state === 'error'
      ? 'h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.15)]'
      : 'h-2.5 w-2.5 rounded-full bg-slate-400 opacity-80'

  return (
    <div className={`${variantStyles.base} ${statusClass} ${className}`.trim()}>
      <span className={indicatorClass} aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
