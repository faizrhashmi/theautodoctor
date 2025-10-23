// @ts-nocheck
'use client'

import type { SessionStats as Stats } from './AdminSessionsClient'

type Props = {
  stats: Stats
}

export default function SessionStats({ stats }: Props) {
  const statCards = [
    {
      label: 'Live Sessions',
      value: stats.live,
      color: 'bg-emerald-100 text-emerald-700',
      icon: '🟢',
    },
    {
      label: 'Waiting',
      value: stats.waiting,
      color: 'bg-amber-100 text-amber-700',
      icon: '⏳',
    },
    {
      label: 'Completed',
      value: stats.completed,
      color: 'bg-blue-100 text-blue-700',
      icon: '✓',
    },
    {
      label: 'Revenue',
      value: `$${stats.revenue.toFixed(2)}`,
      color: 'bg-purple-100 text-purple-700',
      icon: '💰',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
            </div>
            <div className={`rounded-full p-3 text-2xl ${stat.color}`}>
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
