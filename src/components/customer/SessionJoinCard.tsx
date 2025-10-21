'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { CustomerDashboardSession } from './dashboard-types'

const JOIN_WINDOW_MINUTES = 10

function getJoinRoute(session: CustomerDashboardSession): string {
  if (session.type === 'chat') {
    return `/chat/${session.id}`
  }

  return `/video/${session.id}`
}

function describeStatus(session: CustomerDashboardSession): string {
  const status = session.status?.toLowerCase()
  switch (status) {
    case 'live':
      return 'Live now'
    case 'waiting':
      return 'Mechanic notified'
    case 'scheduled':
      return 'Scheduled'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Pending'
  }
}

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(Math.floor(milliseconds / 1000), 0)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function getReferenceDate(session: CustomerDashboardSession): string | null {
  if (session.scheduledStart) return session.scheduledStart
  if (session.startedAt) return session.startedAt
  return session.createdAt
}

function computeJoinState(session: CustomerDashboardSession, now: number) {
  const joinWindowMs = JOIN_WINDOW_MINUTES * 60 * 1000
  const scheduledStart = session.scheduledStart ? new Date(session.scheduledStart).getTime() : null
  const scheduledEnd = session.scheduledEnd ? new Date(session.scheduledEnd).getTime() : null

  const withinScheduledWindow =
    scheduledStart !== null &&
    now >= scheduledStart - joinWindowMs &&
    (scheduledEnd === null || now <= scheduledEnd + joinWindowMs)

  const isLiveLike = ['live', 'waiting'].includes(session.status.toLowerCase())
  const joinable = isLiveLike || withinScheduledWindow

  const countdown =
    scheduledStart && now < scheduledStart
      ? formatCountdown(scheduledStart - now)
      : null

  return { joinable, countdown }
}

export function SessionJoinCard({ session }: { session: CustomerDashboardSession }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const { joinable, countdown } = useMemo(() => computeJoinState(session, now), [session, now])

  const referenceDate = getReferenceDate(session)
  const statusLabel = describeStatus(session)
  const mechanic = session.mechanicName ? `with ${session.mechanicName}` : 'with a mechanic'

  return (
    <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Your next session</p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-900">{session.planLabel}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {session.typeLabel} {mechanic}
          </p>
          {referenceDate && (
            <p className="mt-2 text-sm text-slate-500">
              {session.scheduledStart ? 'Starts' : 'Created'}{' '}
              {new Date(referenceDate).toLocaleString()}
            </p>
          )}
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <span className="inline-flex h-2 w-2 rounded-full bg-orange-500" />
            {statusLabel}
          </div>
          {countdown && (
            <p className="mt-2 text-sm font-medium text-blue-700">Starts in {countdown}</p>
          )}
        </div>
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto">
          <Link
            href={getJoinRoute(session)}
            className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
              joinable ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-300 text-slate-600 cursor-not-allowed'
            }`}
            aria-disabled={!joinable}
            tabIndex={joinable ? 0 : -1}
          >
            {joinable ? 'Join Session' : `Join available ${JOIN_WINDOW_MINUTES} min before`}
          </Link>
          <Link
            href="/customer/schedule"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Manage bookings
          </Link>
        </div>
      </div>
    </div>
  )
}
