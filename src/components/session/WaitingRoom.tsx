'use client'

import { useEffect, useState } from 'react'
import { CalendarClock, Loader2, ShieldCheck, Users } from 'lucide-react'
import type { SessionQueueItem } from '@/types/session'

interface WaitingRoomProps {
  session: SessionQueueItem
}

export default function WaitingRoom({ session }: WaitingRoomProps) {
  const [waitingSeconds, setWaitingSeconds] = useState(0)

  useEffect(() => {
    if (!session.waitingSince) return
    const started = new Date(session.waitingSince).getTime()
    setWaitingSeconds(Math.floor((Date.now() - started) / 1000))
    const interval = setInterval(() => {
      setWaitingSeconds(Math.floor((Date.now() - started) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [session.waitingSince])

  const formattedWait = new Date(waitingSeconds * 1000).toISOString().substring(14, 19)

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-6 text-center sm:text-left">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center gap-3 sm:justify-start">
            <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">Waiting Room</p>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Your mechanic will join shortly</h2>
          <p className="text-sm text-slate-600">
            This queue keeps both parties in sync. Use the chat bubble to ask quick questions before the call begins.
          </p>
        </div>

        <div className="grid gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-orange-600">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div className="text-left">
              <p className="text-xs uppercase text-slate-500">Scheduled</p>
              <p className="text-sm font-semibold text-slate-900">
                {new Date(session.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <Users className="h-5 w-5" />
            </span>
            <div className="text-left">
              <p className="text-xs uppercase text-slate-500">Queue Position</p>
              <p className="text-sm font-semibold text-slate-900">#{session.queuePosition}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="text-left">
              <p className="text-xs uppercase text-slate-500">Waiting Time</p>
              <p className="text-sm font-semibold text-slate-900">{formattedWait}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
