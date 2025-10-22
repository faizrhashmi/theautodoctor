'use client'

import { useState } from 'react'
import SessionHistoryCard from './SessionHistoryCard'
import SessionDetailsModal from './SessionDetailsModal'
import { Filter, CheckCircle2, XCircle, Clock, List } from 'lucide-react'

interface SessionFile {
  id: string
  sessionId: string
  fileName: string
  fileSize: number
  fileType: string
  storagePath: string
  createdAt: string
  fileUrl: string | null
  uploadedBy: string
  uploadedByName: string | null
}

interface Session {
  id: string
  plan: string
  planLabel: string
  type: 'chat' | 'video' | 'diagnostic'
  typeLabel: string
  status: string
  createdAt: string
  scheduledStart: string | null
  scheduledEnd: string | null
  startedAt: string | null
  endedAt: string | null
  mechanicId: string | null
  mechanicName: string | null
  files: SessionFile[]
}

interface SessionManagementProps {
  sessions: Session[]
  userId: string
}

type FilterType = 'all' | 'attended' | 'canceled' | 'upcoming'

export default function SessionManagement({ sessions, userId }: SessionManagementProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all')
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Filter sessions based on selected filter
  const filteredSessions = sessions
    .filter((session) => {
      const status = session.status.toLowerCase()

      switch (selectedFilter) {
        case 'attended':
          return status === 'completed'
        case 'canceled':
          return status === 'cancelled' || status === 'canceled'
        case 'upcoming':
          return status === 'pending' || status === 'scheduled' || status === 'live' || status === 'waiting'
        case 'all':
        default:
          return true
      }
    })
    // Sort by most recent first - prioritize startedAt, then createdAt
    .sort((a, b) => {
      const aTime = new Date(a.startedAt || a.createdAt).getTime()
      const bTime = new Date(b.startedAt || b.createdAt).getTime()
      return bTime - aTime // Most recent first
    })

  // Count sessions for each filter
  const attendedCount = sessions.filter((s) => s.status.toLowerCase() === 'completed').length
  const canceledCount = sessions.filter((s) =>
    ['cancelled', 'canceled'].includes(s.status.toLowerCase())
  ).length
  const upcomingCount = sessions.filter((s) =>
    ['pending', 'scheduled', 'live', 'waiting'].includes(s.status.toLowerCase())
  ).length

  const handleViewDetails = async (session: Session) => {
    // Transform session data to match the modal's expected format
    const sessionDetails = {
      ...session,
      duration_minutes: null,
      session_notes: null,
      rating: null,
      review: null,
      vehicle_info: null,
      created_at: session.createdAt,
      started_at: session.startedAt,
      ended_at: session.endedAt,
      mechanic_name: session.mechanicName,
      files: session.files.map((f) => ({
        id: f.id,
        file_name: f.fileName,
        file_url: f.fileUrl || '',
        file_type: f.fileType,
        file_size: f.fileSize,
        uploaded_by: f.uploadedBy,
        created_at: f.createdAt,
      })),
    }

    setSelectedSession(sessionDetails)
    setIsModalOpen(true)
  }

  const handleDeleteSession = async (sessionId: string) => {
    const response = await fetch(`/api/sessions/${sessionId}/delete`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete session')
    }

    // Optionally refresh or update state here
    window.location.reload()
  }

  const filterButtons: Array<{ key: FilterType; label: string; icon: React.ReactNode; count?: number }> = [
    { key: 'all', label: 'All Sessions', icon: <List className="h-4 w-4" />, count: sessions.length },
    { key: 'attended', label: 'Attended', icon: <CheckCircle2 className="h-4 w-4" />, count: attendedCount },
    { key: 'upcoming', label: 'Upcoming', icon: <Clock className="h-4 w-4" />, count: upcomingCount },
    { key: 'canceled', label: 'Canceled', icon: <XCircle className="h-4 w-4" />, count: canceledCount },
  ]

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
          <Filter className="h-4 w-4" />
          Filter:
        </div>
        {filterButtons.map((button) => (
          <button
            key={button.key}
            onClick={() => setSelectedFilter(button.key)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              selectedFilter === button.key
                ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/30'
                : 'border border-white/20 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {button.icon}
            {button.label}
            {button.count !== undefined && (
              <span
                className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                  selectedFilter === button.key
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {button.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800">
            <List className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">No sessions found</h3>
          <p className="mt-2 text-sm text-slate-400">
            {selectedFilter === 'all'
              ? "You haven't had any sessions yet."
              : selectedFilter === 'attended'
              ? "You haven't attended any sessions yet."
              : selectedFilter === 'canceled'
              ? "You don't have any canceled sessions."
              : "You don't have any upcoming sessions."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <SessionHistoryCard
              key={session.id}
              session={session}
              onViewDetails={() => handleViewDetails(session)}
              onDelete={handleDeleteSession}
            />
          ))}
        </div>
      )}

      {/* Session Details Modal */}
      <SessionDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} session={selectedSession} />
    </div>
  )
}
