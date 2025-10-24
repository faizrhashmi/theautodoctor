// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
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
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab === 'chat') {
      loadChatHistory()
    } else if (activeTab === 'files') {
      loadSessionFiles()
    }
  }, [activeTab, loadChatHistory, loadSessionFiles])

  const loadChatHistory = async () => {
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
  }

  const loadSessionFiles = async () => {
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
  }

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
    const mechanicId = prompt('Enter new mechanic ID:')
    if (!mechanicId) return

    setActionLoading('reassign')
    try {
      const response = await fetch('/api/admin/sessions/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, mechanicId }),
      })

      if (response.ok) {
        const updated = await response.json()
        onUpdate(updated.session)
        alert('Session reassigned successfully')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to reassign session')
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
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
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
            <div className="space-y-4">
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
          <div className="flex gap-2">
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
    </div>
  )
}
