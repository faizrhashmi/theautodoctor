// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import type { SessionWithParticipants } from './AdminSessionsClient'

type Props = {
  session: SessionWithParticipants
  onClose: () => void
  onUpdate: (session: SessionWithParticipants) => void
}

export default function SessionDetailModal({ session, onClose, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'chat' | 'files' | 'payment'>(
    'details'
  )
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [sessionFiles, setSessionFiles] = useState<any[]>([])
  const [timelineEvents, setTimelineEvents] = useState<any[]>([])
  const [availableMechanics, setAvailableMechanics] = useState<any[]>([])
  const [selectedMechanicId, setSelectedMechanicId] = useState('')
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadChatHistory = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/sessions/${session.id}/chat`)
      if (response.ok) {
        const data = await response.json()
        setChatMessages(data.messages || [])
      }
    } finally {
      setLoading(false)
    }
  }, [session.id])

  const loadSessionFiles = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/sessions/${session.id}/files`)
      if (response.ok) {
        const data = await response.json()
        setSessionFiles(data.files || [])
      }
    } finally {
      setLoading(false)
    }
  }, [session.id])

  const loadTimelineEvents = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/sessions/${session.id}/timeline`)
      if (response.ok) {
        const data = await response.json()
        setTimelineEvents(data.events || [])
      }
    } finally {
      setLoading(false)
    }
  }, [session.id])

  const loadAvailableMechanics = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users/mechanics?approvalStatus=approved&pageSize=100')
      if (response.ok) {
        const data = await response.json()
        setAvailableMechanics(data.rows || [])
      }
    } catch (error) {
      console.error('Failed to load mechanics:', error)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'chat') {
      loadChatHistory()
    } else if (activeTab === 'files') {
      loadSessionFiles()
    } else if (activeTab === 'timeline') {
      loadTimelineEvents()
    }
  }, [activeTab, loadChatHistory, loadSessionFiles, loadTimelineEvents])

  const handleForceCancel = async () => {
    const reason = prompt('Enter cancellation reason:')
    if (!reason) return

    setActionLoading('cancel')
    try {
      const response = await fetch('/api/admin/sessions/force-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, reason }),
      })

      if (response.ok) {
        const updated = await response.json()
        onUpdate(updated.session)
        alert('Session cancelled successfully')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to cancel session')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleForceEnd = async () => {
    if (!confirm('Force end this session?')) return

    setActionLoading('end')
    try {
      const response = await fetch('/api/admin/sessions/force-end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })

      if (response.ok) {
        const updated = await response.json()
        onUpdate(updated.session)
        alert('Session ended successfully')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to end session')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleReassign = async () => {
    // Load mechanics first, then show modal
    await loadAvailableMechanics()
    setShowReassignModal(true)
  }

  const handleReassignConfirm = async () => {
    if (!selectedMechanicId) {
      alert('Please select a mechanic')
      return
    }

    setActionLoading('reassign')
    try {
      const response = await fetch('/api/admin/sessions/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, mechanicId: selectedMechanicId }),
      })

      if (response.ok) {
        const updated = await response.json()
        onUpdate(updated.session)
        alert('Session reassigned successfully')
        setShowReassignModal(false)
        setSelectedMechanicId('')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to reassign session')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleJoinSession = async () => {
    if (!confirm('Join this session as an observer?')) return

    setActionLoading('join')
    try {
      const response = await fetch('/api/admin/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })

      if (response.ok) {
        const data = await response.json()
        // Open session in new tab for video/chat sessions
        if (data.type === 'video' || data.type === 'chat') {
          window.open(`/session/${session.id}`, '_blank')
        }
        alert('You have joined the session successfully')
        const updatedResponse = await fetch(`/api/admin/sessions/${session.id}`)
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json()
          onUpdate(updatedData.session)
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to join session')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const customer = session.session_participants?.find((p) => p.role === 'customer')
  const mechanic = session.session_participants?.find((p) => p.role === 'mechanic')

  const customerInfo = {
    name: customer?.users?.user_metadata?.name || 'Unknown',
    email: customer?.users?.email || 'N/A',
    phone: customer?.users?.user_metadata?.phone || 'N/A',
  }

  const mechanicInfo = {
    name: mechanic?.users?.user_metadata?.name || 'Unassigned',
    email: mechanic?.users?.email || 'N/A',
    rating: mechanic?.users?.user_metadata?.rating || 'N/A',
  }

  const timeline = [
    { label: 'Created', date: session.created_at, completed: true },
    { label: 'Mechanic Assigned', date: mechanic ? session.created_at : null, completed: !!mechanic },
    { label: 'Started', date: session.started_at, completed: !!session.started_at },
    { label: 'Ended', date: session.ended_at, completed: !!session.ended_at },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Session Details</h2>
            <p className="mt-1 text-sm text-slate-600">Session ID: {session.id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'details', label: 'Details' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'chat', label: 'Chat History' },
              { id: 'files', label: 'Files' },
              { id: 'payment', label: 'Payment' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`border-b-2 py-4 px-1 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Customer Section */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Name</p>
                    <p className="mt-1 text-sm text-slate-900">{customerInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Email</p>
                    <p className="mt-1 text-sm text-slate-900">{customerInfo.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Phone</p>
                    <p className="mt-1 text-sm text-slate-900">{customerInfo.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">User ID</p>
                    <p className="mt-1 text-sm font-mono text-slate-900">
                      {session.customer_user_id?.slice(0, 12)}...
                    </p>
                  </div>
                </div>
              </div>

              {/* Mechanic Section */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Mechanic Information</h3>
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Name</p>
                    <p className="mt-1 text-sm text-slate-900">{mechanicInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Email</p>
                    <p className="mt-1 text-sm text-slate-900">{mechanicInfo.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Rating</p>
                    <p className="mt-1 text-sm text-slate-900">{mechanicInfo.rating}</p>
                  </div>
                  {session.mechanic_id && (
                    <div>
                      <p className="text-xs font-medium text-slate-500">Mechanic ID</p>
                      <p className="mt-1 text-sm font-mono text-slate-900">
                        {session.mechanic_id.slice(0, 12)}...
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Session Info */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Session Information</h3>
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Type</p>
                    <p className="mt-1 text-sm text-slate-900 capitalize">{session.type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Status</p>
                    <p className="mt-1 text-sm text-slate-900 capitalize">{session.status}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Plan</p>
                    <p className="mt-1 text-sm text-slate-900">{session.plan}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Duration</p>
                    <p className="mt-1 text-sm text-slate-900">
                      {session.duration_minutes ? `${session.duration_minutes} minutes` : 'N/A'}
                    </p>
                  </div>
                  {session.rating && (
                    <div>
                      <p className="text-xs font-medium text-slate-500">Rating</p>
                      <p className="mt-1 text-sm text-slate-900">{session.rating} / 5</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Info */}
              {session.vehicle_info && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Vehicle Information</h3>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <pre className="text-sm text-slate-900 whitespace-pre-wrap">
                      {JSON.stringify(session.vehicle_info, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Notes */}
              {session.session_notes && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Session Notes</h3>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-sm text-slate-900 whitespace-pre-wrap">
                      {session.session_notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Metadata</h3>
                <div className="rounded-lg bg-slate-50 p-4">
                  <pre className="text-xs text-slate-900 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(session.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading timeline events...</div>
              ) : timelineEvents.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-center text-sm text-slate-500 mb-4">
                    No detailed timeline events available. Showing basic timeline:
                  </p>
                  {timeline.map((item) => (
                    <div key={item.label} className="flex items-start gap-4">
                      <div
                        className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full ${
                          item.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {item.completed ? (
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{item.label}</p>
                        {item.date && (
                          <p className="text-xs text-slate-500">
                            {format(new Date(item.date), 'PPpp')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {timelineEvents.map((event: any, index: number) => (
                    <div key={event.id || index} className="flex items-start gap-4">
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <circle cx="10" cy="10" r="3" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {event.event_type || event.action || 'Event'}
                        </p>
                        {event.description && (
                          <p className="text-xs text-slate-600 mt-1">{event.description}</p>
                        )}
                        {event.created_at && (
                          <p className="text-xs text-slate-500 mt-1">
                            {format(new Date(event.created_at), 'PPpp')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading chat history...</div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No chat messages</div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="rounded-lg bg-slate-50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-900">
                          {msg.sender_id === session.customer_user_id ? 'Customer' : 'Mechanic'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(msg.created_at), 'PPpp')}
                        </p>
                      </div>
                      <p className="text-sm text-slate-700">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <div>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading files...</div>
              ) : sessionFiles.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No files attached</div>
              ) : (
                <div className="grid gap-4">
                  {sessionFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-slate-100 p-2">
                          <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{file.file_name}</p>
                          <p className="text-xs text-slate-500">
                            {(file.file_size / 1024).toFixed(2)} KB - {file.file_type}
                          </p>
                        </div>
                      </div>
                      {file.file_url && (
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-orange-600 hover:text-orange-700"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <h4 className="text-sm font-medium text-slate-900 mb-3">Payment Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Stripe Session ID</p>
                    <p className="mt-1 text-sm font-mono text-slate-900 break-all">
                      {session.stripe_session_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Amount</p>
                    <p className="mt-1 text-sm text-slate-900">
                      ${((session.metadata as any)?.amount || 0) / 100}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Plan</p>
                    <p className="mt-1 text-sm text-slate-900">{session.plan}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Status</p>
                    <p className="mt-1 text-sm text-slate-900 capitalize">
                      {(session.metadata as any)?.payment_status || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {session.status !== 'cancelled' && session.status !== 'completed' && (
              <>
                <button
                  onClick={handleForceCancel}
                  disabled={actionLoading !== null}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === 'cancel' ? 'Cancelling...' : 'Force Cancel'}
                </button>
                {session.status === 'live' && (
                  <button
                    onClick={handleForceEnd}
                    disabled={actionLoading !== null}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    {actionLoading === 'end' ? 'Ending...' : 'Force End'}
                  </button>
                )}
                <button
                  onClick={handleReassign}
                  disabled={actionLoading !== null}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {actionLoading === 'reassign' ? 'Reassigning...' : 'Reassign Mechanic'}
                </button>
                {(session.status === 'waiting' || session.status === 'live') && (
                  <button
                    onClick={handleJoinSession}
                    disabled={actionLoading !== null}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionLoading === 'join' ? (
                      'Joining...'
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Join Session
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>

      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md mx-4 rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Reassign Mechanic</h3>
              <p className="mt-1 text-sm text-slate-600">
                Select a new mechanic for session {session.id.slice(0, 8)}...
              </p>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Mechanic
              </label>
              <select
                value={selectedMechanicId}
                onChange={(e) => setSelectedMechanicId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={actionLoading === 'reassign'}
              >
                <option value="">Choose a mechanic...</option>
                {availableMechanics.map((mech: any) => (
                  <option key={mech.id} value={mech.id}>
                    {mech.name} - {mech.email} {mech.is_online ? '(Online)' : ''}
                  </option>
                ))}
              </select>
              {availableMechanics.length === 0 && (
                <p className="mt-2 text-sm text-slate-500">No approved mechanics available</p>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowReassignModal(false)
                  setSelectedMechanicId('')
                }}
                disabled={actionLoading === 'reassign'}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReassignConfirm}
                disabled={!selectedMechanicId || actionLoading === 'reassign'}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === 'reassign' ? 'Reassigning...' : 'Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
