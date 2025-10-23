'use client'

import { useState } from 'react'
import { AlertTriangle, XCircle, Loader2 } from 'lucide-react'

interface StuckSession {
  id: string
  status: string
  type: string
  createdAt: string
}

interface Props {
  sessions: StuckSession[]
  onCancel?: () => void
}

export function StuckSessionManager({ sessions, onCancel }: Props) {
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (sessions.length === 0) {
    return null
  }

  const handleForceCancel = async (sessionId: string) => {
    if (!confirm('Cancel this session? You will be able to start a new session after cancelling.')) {
      return
    }

    setCancelling(sessionId)
    setError(null)

    try {
      const response = await fetch('/api/customer/force-cancel-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel session')
      }

      // Refresh the page to update the UI
      if (onCancel) {
        onCancel()
      } else {
        window.location.reload()
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel session')
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className="mb-6 rounded-xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-bold text-amber-100">Session Issue Detected</h3>
          <p className="mt-1 text-sm text-amber-200/80">
            You have {sessions.length} session{sessions.length > 1 ? 's' : ''} that may be blocking you from starting a new session.
          </p>

          <div className="mt-4 space-y-3">
            {sessions.map((session) => {
              const age = Math.floor((Date.now() - new Date(session.createdAt).getTime()) / 1000 / 60)

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border border-amber-400/20 bg-amber-900/20 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-amber-100">
                        {session.type.charAt(0).toUpperCase() + session.type.slice(1)} Session
                      </span>
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                        {session.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-amber-300/70">
                      Created {age} minute{age !== 1 ? 's' : ''} ago • ID: {session.id.substring(0, 8)}...
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleForceCancel(session.id)}
                    disabled={cancelling === session.id}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                  >
                    {cancelling === session.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Cancel Session
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          {error && (
            <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mt-4 rounded-lg bg-amber-900/30 p-3 text-xs text-amber-300/80">
            💡 <strong>Tip:</strong> Sessions are automatically cleaned up after 5 minutes of inactivity.
            If you&apos;re seeing this panel, you can manually cancel the session to start a new one immediately.
          </div>
        </div>
      </div>
    </div>
  )
}
