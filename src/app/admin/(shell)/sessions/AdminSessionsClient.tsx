// @ts-nocheck
'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import SessionDetailModal from './SessionDetailModal'
import SessionFilters from './SessionFilters'
import SessionsTable from './SessionsTable'
import SessionStats from './SessionStats'
import type { SessionType } from '@/types/supabase'

export type SessionWithParticipants = {
  id: string
  created_at: string
  updated_at: string
  plan: string
  type: SessionType
  status: string | null
  stripe_session_id: string
  intake_id: string | null
  customer_user_id: string | null
  mechanic_id: string | null
  metadata: any
  scheduled_start: string | null
  scheduled_end: string | null
  started_at: string | null
  ended_at: string | null
  duration_minutes: number | null
  vehicle_info: any
  session_notes: string | null
  rating: number | null
  review: string | null
  session_participants?: Array<{
    user_id: string
    role: string
    users: {
      email: string
      user_metadata: any
    }
  }>
}

export type SessionStats = {
  live: number
  waiting: number
  completed: number
  revenue: number
}

type MechanicOption = {
  id: string
  name: string
  email: string
  status?: string
}

export type Filters = {
  status: string
  type: string
  dateRange: { from: string; to: string } | null
  search: string
  mechanicId: string
}

type Props = {
  initialSessions: SessionWithParticipants[]
  initialStats: SessionStats
}

export default function AdminSessionsClient({ initialSessions, initialStats }: Props) {
  const [sessions, setSessions] = useState<SessionWithParticipants[]>(initialSessions)
  const [stats, setStats] = useState<SessionStats>(initialStats)
  const [selectedSession, setSelectedSession] = useState<SessionWithParticipants | null>(null)
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    type: 'all',
    dateRange: null,
    search: '',
    mechanicId: 'all',
  })
  const [sortBy, setSortBy] = useState<{
    field: 'created_at' | 'duration_minutes' | 'status'
    order: 'asc' | 'desc'
  }>({
    field: 'created_at',
    order: 'desc',
  })
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [actionSession, setActionSession] = useState<SessionWithParticipants | null>(null)
  const [activeAction, setActiveAction] = useState<
    'reassign' | 'force_cancel' | 'force_end' | 'view' | null
  >(null)
  const [actionMessage, setActionMessage] = useState('')
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [availableMechanics, setAvailableMechanics] = useState<MechanicOption[]>([])
  const [mechanicsLoading, setMechanicsLoading] = useState(false)
  const [selectedMechanicId, setSelectedMechanicId] = useState<string>('')

  const supabase = useMemo(() => createClient(), [])

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('admin-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
        },
        async (payload) => {
          // CRITICAL FIX: Supabase returns lowercase event types ('insert', 'update', 'delete')
          const eventType = payload.eventType?.toUpperCase()

          if (eventType === 'INSERT') {
            // Fetch full session with participants
            const { data } = await supabase
              .from('sessions')
              .select(`
                *,
                session_participants(
                  user_id,
                  role,
                  users(email, user_metadata)
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (data) {
              setSessions((prev) => [data as unknown as SessionWithParticipants, ...prev])
            }
          } else if (eventType === 'UPDATE') {
            setSessions((prev) =>
              prev.map((session) =>
                session.id === payload.new.id
                  ? { ...session, ...payload.new }
                  : session
              )
            )
          } else if (eventType === 'DELETE') {
            setSessions((prev) => prev.filter((session) => session.id !== payload.old.id))
          }

          // Refresh stats
          refreshStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const refreshStats = async () => {
    const response = await fetch('/api/admin/sessions/stats')
    if (response.ok) {
      const newStats = await response.json()
      setStats(newStats)
    }
  }

  const loadMechanics = useCallback(async () => {
    if (availableMechanics.length > 0 || mechanicsLoading) return
    try {
      setMechanicsLoading(true)
      const response = await fetch('/api/admin/users/mechanics?approvalStatus=approved&status=active&pageSize=200')
      if (!response.ok) {
        throw new Error(`Failed to load mechanics (status ${response.status})`)
      }
      const data = await response.json()
      const rows = data.rows || data.mechanics || data
      const mapped: MechanicOption[] = (rows || []).map((item: any) => ({
        id: item.id,
        name: item.name || item.full_name || 'Unnamed Mechanic',
        email: item.email,
        status: item.account_status,
      }))
      setAvailableMechanics(mapped)
    } catch (error) {
      console.error('Failed to load mechanics list', error)
    } finally {
      setMechanicsLoading(false)
    }
  }, [availableMechanics.length, mechanicsLoading])

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let filtered = sessions

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((s) => s.status === filters.status)
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter((s) => s.type === filters.type)
    }

    // Date range filter
    if (filters.dateRange) {
      const from = new Date(filters.dateRange.from).getTime()
      const to = new Date(filters.dateRange.to).getTime()
      filtered = filtered.filter((s) => {
        const created = new Date(s.created_at).getTime()
        return created >= from && created <= to
      })
    }

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter((s) => {
        const customerEmail = s.session_participants?.find((p) => p.role === 'customer')?.users?.email || ''
        const customerName = s.session_participants?.find((p) => p.role === 'customer')?.users?.user_metadata?.name || ''
        return (
          s.id.toLowerCase().includes(search) ||
          customerEmail.toLowerCase().includes(search) ||
          customerName.toLowerCase().includes(search)
        )
      })
    }

    // Mechanic filter
    if (filters.mechanicId !== 'all') {
      filtered = filtered.filter((s) => s.mechanic_id === filters.mechanicId)
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortBy.field]
      let bVal: any = b[sortBy.field]

      if (sortBy.field === 'created_at') {
        aVal = new Date(aVal || 0).getTime()
        bVal = new Date(bVal || 0).getTime()
      }

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (sortBy.order === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return filtered
  }, [sessions, filters, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage)
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleExport = async (format: 'csv' | 'json') => {
    const sessionIds = selectedSessions.size > 0
      ? Array.from(selectedSessions)
      : filteredSessions.map((s) => s.id)

    const response = await fetch('/api/admin/sessions/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionIds, format }),
    })

    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sessions-export-${Date.now()}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }
  }

  const handleBulkCancel = async () => {
    if (!confirm(`Cancel ${selectedSessions.size} sessions?`)) return

    const response = await fetch('/api/admin/sessions/bulk-cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionIds: Array.from(selectedSessions),
        reason: 'Bulk cancellation by admin',
      }),
    })

    if (response.ok) {
      setSelectedSessions(new Set())
      // Sessions will update via real-time subscription
    }
  }

  const toggleSelectAll = () => {
    if (selectedSessions.size === paginatedSessions.length) {
      setSelectedSessions(new Set())
    } else {
      setSelectedSessions(new Set(paginatedSessions.map((s) => s.id)))
    }
  }

  const toggleSelect = (sessionId: string) => {
    const newSelected = new Set(selectedSessions)
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId)
    } else {
      newSelected.add(sessionId)
    }
    setSelectedSessions(newSelected)
  }

  const openAction = async (session: SessionWithParticipants, action: NonNullable<typeof activeAction>) => {
    if (action === 'reassign') {
      await loadMechanics()
      setSelectedMechanicId(session.mechanic_id || '')
    }
    if (action === 'force_cancel') {
      setActionMessage('')
    }
    setActionSession(session)
    setActiveAction(action)
    setActionStatus(null)
    setMenuOpenId(null)
    if (action === 'view') {
      setSelectedSession(session)
      setActiveAction(null)
      setActionSession(null)
    }
  }

  const closeAction = () => {
    setActionSession(null)
    setActiveAction(null)
    setActionStatus(null)
    setActionMessage('')
    setSelectedMechanicId('')
  }

  const applySessionUpdate = (updated: SessionWithParticipants) => {
    setSessions((prev) =>
      prev.map((session) => (session.id === updated.id ? { ...session, ...updated } : session))
    )
    setSelectedSession((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev))
  }

  const handleReassign = async () => {
    if (!actionSession || !selectedMechanicId) {
      setActionStatus({ type: 'error', message: 'Select a mechanic to reassign.' })
      return
    }
    try {
      setActionLoading(true)
      setActionStatus(null)
      const response = await fetch('/api/admin/sessions/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: actionSession.id, mechanicId: selectedMechanicId }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to reassign session')
      }
      if (data?.session) {
        applySessionUpdate(data.session)
      }
      setActionStatus({ type: 'success', message: 'Session reassigned successfully.' })
      await refreshStats()
    } catch (error: unknown) {
      setActionStatus({ type: 'error', message: error?.message || 'Failed to reassign session.' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleForceCancel = async () => {
    if (!actionSession) return
    if (!actionMessage.trim()) {
      setActionStatus({ type: 'error', message: 'Please provide a cancellation reason.' })
      return
    }
    try {
      setActionLoading(true)
      setActionStatus(null)
      const response = await fetch('/api/admin/sessions/force-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: actionSession.id, reason: actionMessage.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to cancel session')
      }
      if (data?.session) {
        applySessionUpdate(data.session)
      }
      setActionStatus({ type: 'success', message: 'Session cancelled successfully.' })
      await refreshStats()
    } catch (error: unknown) {
      setActionStatus({ type: 'error', message: error?.message || 'Failed to cancel session.' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleForceEnd = async () => {
    if (!actionSession) return
    try {
      setActionLoading(true)
      setActionStatus(null)
      const response = await fetch('/api/admin/sessions/force-end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: actionSession.id }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to end session')
      }
      if (data?.session) {
        applySessionUpdate(data.session)
      }
      setActionStatus({ type: 'success', message: 'Session marked as completed.' })
      await refreshStats()
    } catch (error: unknown) {
      setActionStatus({ type: 'error', message: error?.message || 'Failed to end session.' })
    } finally {
      setActionLoading(false)
    }
  }

  const actionTitle =
    activeAction === 'reassign'
      ? 'Reassign Mechanic'
      : activeAction === 'force_cancel'
      ? 'Force Cancel Session'
      : activeAction === 'force_end'
      ? 'Force End Session'
      : ''

  const handleActionSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeAction) return

    switch (activeAction) {
      case 'reassign':
        await handleReassign()
        break
      case 'force_cancel':
        await handleForceCancel()
        break
      case 'force_end':
        await handleForceEnd()
        break
      default:
        break
    }
  }

  const handleMenuToggle = (sessionId: string) => {
    setMenuOpenId((prev) => (prev === sessionId ? null : sessionId))
  }

  const handleSessionAction = (session: SessionWithParticipants, action: 'view' | 'reassign' | 'force_cancel' | 'force_end') => {
    openAction(session, action)
  }

  return (
    <>
      <SessionStats stats={stats} />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <SessionFilters
          filters={filters}
          onFiltersChange={setFilters}
          onExport={handleExport}
          onBulkCancel={handleBulkCancel}
          selectedCount={selectedSessions.size}
        />

        <SessionsTable
          sessions={paginatedSessions}
          selectedSessions={selectedSessions}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onSelectAll={toggleSelectAll}
          onSelect={toggleSelect}
          onViewDetails={setSelectedSession}
          menuOpenId={menuOpenId}
          onMenuToggle={handleMenuToggle}
          onActionSelect={handleSessionAction}
        />

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <label className="text-sm text-slate-600">
              Items per page:
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="ml-2 rounded-lg border border-slate-300 px-2 py-1 text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
            <span className="text-sm text-slate-600">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredSessions.length)} of{' '}
              {filteredSessions.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onUpdate={(updatedSession) => {
            setSessions((prev) =>
              prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
            )
            setSelectedSession(updatedSession)
          }}
        />
      )}

      {actionSession && activeAction && activeAction !== 'view' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4"
          onClick={closeAction}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-700 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900">{actionTitle}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Session ID {actionSession.id.slice(0, 8)} • Current status: {actionSession.status || 'unknown'}
            </p>

            <form className="mt-4 space-y-4" onSubmit={handleActionSubmit}>
              {actionStatus && (
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    actionStatus.type === 'success'
                      ? 'border-green-500/40 bg-green-500/10 text-green-700'
                      : 'border-red-500/40 bg-red-500/10 text-red-700'
                  }`}
                >
                  {actionStatus.message}
                </div>
              )}

              {activeAction === 'reassign' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600">
                    Select mechanic
                    <select
                      value={selectedMechanicId}
                      onChange={(event) => setSelectedMechanicId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                      disabled={mechanicsLoading}
                    >
                      <option value="">Choose mechanic...</option>
                      {availableMechanics.map((mechanic) => (
                        <option key={mechanic.id} value={mechanic.id}>
                          {mechanic.name} • {mechanic.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  {mechanicsLoading && (
                    <p className="text-xs text-slate-500">Loading mechanics...</p>
                  )}
                </div>
              )}

              {activeAction === 'force_cancel' && (
                <label className="block text-xs font-medium text-slate-600">
                  Cancellation reason
                  <textarea
                    value={actionMessage}
                    onChange={(event) => setActionMessage(event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="Explain why this session is being cancelled..."
                  />
                </label>
              )}

              {activeAction === 'force_end' && (
                <div className="space-y-2 text-sm text-slate-600">
                  <p>
                    Mark this session as completed. Duration will be calculated automatically if the session had started.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAction}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:from-orange-600 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading
                    ? 'Processing...'
                    : activeAction === 'reassign'
                    ? 'Reassign'
                    : activeAction === 'force_cancel'
                    ? 'Cancel session'
                    : 'End session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
