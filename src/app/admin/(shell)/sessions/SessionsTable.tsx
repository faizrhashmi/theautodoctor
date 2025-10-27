// @ts-nocheck
'use client'

import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import type { SessionWithParticipants } from './AdminSessionsClient'

type Props = {
  sessions: SessionWithParticipants[]
  selectedSessions: Set<string>
  sortBy: { field: string; order: 'asc' | 'desc' }
  onSortChange: (sortBy: { field: any; order: 'asc' | 'desc' }) => void
  onSelectAll: () => void
  onSelect: (sessionId: string) => void
  onViewDetails: (session: SessionWithParticipants) => void
  menuOpenId: string | null
  onMenuToggle: (sessionId: string) => void
  onActionSelect: (session: SessionWithParticipants, action: 'view' | 'reassign' | 'force_cancel' | 'force_end') => void
}

export default function SessionsTable({
  sessions,
  selectedSessions,
  sortBy,
  onSortChange,
  onSelectAll,
  onSelect,
  onViewDetails,
  menuOpenId,
  onMenuToggle,
  onActionSelect,
}: Props) {
  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      live: 'bg-emerald-100 text-emerald-700',
      waiting: 'bg-amber-100 text-amber-700',
      pending: 'bg-blue-100 text-blue-700',
      completed: 'bg-slate-100 text-slate-700',
      cancelled: 'bg-red-100 text-red-700',
      expired: 'bg-orange-100 text-orange-700',
      unattended: 'bg-purple-100 text-purple-700',
    }

    return (
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          styles[status || 'pending'] || 'bg-slate-100 text-slate-700'
        }`}
      >
        {status || 'pending'}
      </span>
    )
  }

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      chat: 'bg-blue-50 text-blue-700 border-blue-200',
      video: 'bg-purple-50 text-purple-700 border-purple-200',
      diagnostic: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }

    return (
      <span
        className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
          styles[type] || 'bg-slate-50 text-slate-700 border-slate-200'
        }`}
      >
        {type}
      </span>
    )
  }

  const getCustomerInfo = (session: SessionWithParticipants) => {
    const customer = session.session_participants?.find((p) => p.role === 'customer')
    if (!customer) return { name: 'Unknown', email: 'N/A' }

    const name = customer.users?.user_metadata?.name || 'Unknown'
    const email = customer.users?.email || 'N/A'
    return { name, email }
  }

  const getMechanicInfo = (session: SessionWithParticipants) => {
    const mechanic = session.session_participants?.find((p) => p.role === 'mechanic')
    if (!mechanic) return { name: 'Unassigned', email: 'N/A' }

    const name = mechanic.users?.user_metadata?.name || 'Unknown'
    const email = mechanic.users?.email || 'N/A'
    return { name, email }
  }

  const handleSort = (field: any) => {
    if (sortBy.field === field) {
      onSortChange({ field, order: sortBy.order === 'asc' ? 'desc' : 'asc' })
    } else {
      onSortChange({ field, order: 'desc' })
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy.field !== field) {
      return (
        <svg className="ml-1 inline-block h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      )
    }

    return sortBy.order === 'asc' ? (
      <svg className="ml-1 inline-block h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg className="ml-1 inline-block h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedSessions.size === sessions.length && sessions.length > 0}
                onChange={onSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
            </th>
            <th
              className="cursor-pointer px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700"
              onClick={() => handleSort('created_at')}
            >
              Created <SortIcon field="created_at" />
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
              Session ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
              Type
            </th>
            <th
              className="cursor-pointer px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700"
              onClick={() => handleSort('status')}
            >
              Status <SortIcon field="status" />
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
              Customer
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
              Mechanic
            </th>
            <th
              className="cursor-pointer px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700"
              onClick={() => handleSort('duration_minutes')}
            >
              Duration <SortIcon field="duration_minutes" />
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {sessions.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-500">
                No sessions found
              </td>
            </tr>
          ) : (
            sessions.map((session) => {
              const customer = getCustomerInfo(session)
              const mechanic = getMechanicInfo(session)

              return (
                <tr
                  key={session.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => onViewDetails(session)}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedSessions.has(session.id)}
                      onChange={() => onSelect(session.id)}
                      className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-900">
                    {session.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4">{getTypeBadge(session.type)}</td>
                  <td className="px-6 py-4">{getStatusBadge(session.status)}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-slate-900">{customer.name}</div>
                      <div className="text-slate-500">{customer.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-slate-900">{mechanic.name}</div>
                      <div className="text-slate-500">{mechanic.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {session.duration_minutes ? `${session.duration_minutes} min` : 'N/A'}
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="relative flex items-center gap-2">
                      <button
                        onClick={() => onMenuToggle(session.id)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Manage
                      </button>
                      <button
                        onClick={() => onActionSelect(session, 'view')}
                        className="text-sm font-medium text-orange-600 hover:text-orange-700"
                      >
                        View
                      </button>
                      {menuOpenId === session.id && (
                        <div className="absolute right-0 top-10 z-10 w-48 rounded-lg border border-slate-200 bg-white shadow-lg">
                          <button
                            onClick={() => onActionSelect(session, 'reassign')}
                            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                          >
                            Reassign mechanic
                          </button>
                          <button
                            onClick={() => onActionSelect(session, 'force_end')}
                            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                          >
                            Force end session
                          </button>
                          <button
                            onClick={() => onActionSelect(session, 'force_cancel')}
                            className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            Force cancel session
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
