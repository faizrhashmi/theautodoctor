// @ts-nocheck
'use client'

import { useState, useMemo, useEffect } from 'react'
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
          if (payload.eventType === 'INSERT') {
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
          } else if (payload.eventType === 'UPDATE') {
            setSessions((prev) =>
              prev.map((session) =>
                session.id === payload.new.id
                  ? { ...session, ...payload.new }
                  : session
              )
            )
          } else if (payload.eventType === 'DELETE') {
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
    </>
  )
}
