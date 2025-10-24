'use client'

import React from 'react'

type Props = {
  status: string
  size?: 'sm' | 'md'
}

const MAP: Record<string, { label: string; cls: string }> = {
  waiting: { label: 'Waiting', cls: 'bg-amber-500/15 text-amber-300 border-amber-400/30' },
  live: { label: 'Live', cls: 'bg-green-500/15 text-green-200 border-green-400/30' },
  reconnecting: { label: 'Reconnecting', cls: 'bg-purple-500/15 text-purple-200 border-purple-400/30' },
  completed: { label: 'Completed', cls: 'bg-slate-500/15 text-slate-200 border-slate-400/30' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-500/15 text-rose-200 border-rose-400/30' },
}

export function StatusBadge({ status, size = 'sm' }: Props) {
  const m = MAP[status] ?? { label: status, cls: 'bg-slate-500/15 text-slate-200 border-slate-400/30' }
  const pad = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
  return <span className={`inline-flex items-center rounded-full border ${pad} font-semibold ${m.cls}`}>{m.label}</span>
}
export default StatusBadge
