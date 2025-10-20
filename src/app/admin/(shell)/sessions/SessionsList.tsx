'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { SessionType } from '@/types/supabase'

type SessionRecord = {
  id: string
  created_at: string
  type: SessionType
  plan: string
  status: string | null
  intake_id: string | null
  customer_user_id: string | null
}

type Props = {
  userId: string
  availableSessions: SessionRecord[]
  activeSessions: SessionRecord[]
}

export default function SessionsList({ availableSessions, activeSessions }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [available, setAvailable] = useState<SessionRecord[]>(availableSessions)
  const [active, setActive] = useState<SessionRecord[]>(activeSessions)
  const [joining, setJoining] = useState<string | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel('mechanic-sessions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sessions',
          filter: 'type=in.(chat,video,diagnostic)',
        },
        (payload) => {
          const newSession = payload.new as SessionRecord
          if (newSession.status === 'pending') {
            setAvailable((prev) => [newSession, ...prev])
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
        },
        (payload) => {
          const updated = payload.new as SessionRecord

          setAvailable((prev) =>
            prev.filter((session) => session.id !== updated.id),
          )

          setActive((prev) => {
            const exists = prev.some((session) => session.id === updated.id)
            if (exists) {
              return prev.map((session) => (session.id === updated.id ? updated : session))
            }
            if (updated.status && updated.status !== 'pending') {
              return [updated, ...prev]
            }
            return prev
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  async function handleJoin(sessionId: string, type: SessionType) {
    setJoining(sessionId)

    try {
      const response = await fetch('/api/admin/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error((error as { error?: string }).error || 'Failed to join session')
      }

      const session = available.find((item) => item.id === sessionId)
      if (session) {
        setAvailable((prev) => prev.filter((item) => item.id !== sessionId))
        setActive((prev) => [session, ...prev])
      }

      if (type === 'chat') {
        router.push(`/chat/${sessionId}`)
      } else if (type === 'video') {
        router.push(`/video/${sessionId}`)
      } else {
        router.push(`/diagnostic/${sessionId}`)
      }
    } catch (error: any) {
      alert(error?.message || 'Failed to join session')
    } finally {
      setJoining(null)
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Active sessions ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">You are not in any sessions right now.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isActive
                onJoin={handleJoin}
                joining={joining}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Available sessions ({available.length})
        </h2>
        {available.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">
              No sessions waiting. New sessions will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isActive={false}
                onJoin={handleJoin}
                joining={joining}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SessionCard({
  session,
  isActive,
  onJoin,
  joining,
}: {
  session: SessionRecord
  isActive: boolean
  onJoin: (sessionId: string, type: SessionType) => void
  joining: string | null
}) {
  const [timeAgo, setTimeAgo] = useState<string>('just now')
  const isJoining = joining === session.id

  useEffect(() => {
    function updateTimeAgo() {
      const createdAt = new Date(session.created_at).getTime()
      const seconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000))
      if (seconds < 60) {
        setTimeAgo(`${seconds}s ago`)
      } else if (seconds < 3600) {
        setTimeAgo(`${Math.floor(seconds / 60)}m ago`)
      } else {
        setTimeAgo(`${Math.floor(seconds / 3600)}h ago`)
      }
    }

    updateTimeAgo()
    const interval = window.setInterval(updateTimeAgo, 10000)
    return () => window.clearInterval(interval)
  }, [session.created_at])

  const labels: Record<SessionType, string> = {
    chat: 'Chat session',
    video: 'Video session',
    diagnostic: 'Diagnostic session',
  }

  const planNames: Record<string, string> = {
    chat10: 'Quick Chat',
    video15: 'Video Call',
    diagnostic: 'Diagnostic',
  }

  const planLabel = planNames[session.plan] || session.plan

  const typeBadgeStyles: Record<SessionType, string> = {
    chat: 'bg-blue-100 text-blue-700',
    video: 'bg-purple-100 text-purple-700',
    diagnostic: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeBadgeStyles[session.type]}`}>
              {labels[session.type]}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-900">{planLabel}</p>
          <p className="mt-2 text-xs text-slate-500">Created {timeAgo}</p>
          {session.intake_id && (
            <p className="mt-1 text-xs text-slate-400">
              Intake: {session.intake_id.slice(0, 8)}...
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        {isActive ? (
          <a
            href={`/${session.type}/${session.id}`}
            className="block w-full rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-slate-800"
          >
            Open session
          </a>
        ) : (
          <button
            type="button"
            onClick={() => onJoin(session.id, session.type)}
            disabled={isJoining}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isJoining ? 'Joining...' : 'Join session'}
          </button>
        )}
      </div>
    </div>
  )
}
