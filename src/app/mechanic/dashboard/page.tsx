'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  CalendarDays,
  ClipboardSignature,
  MessageCircle,
  PlayCircle,
  Search,
  TimerReset
} from 'lucide-react'
import SessionSummaryCard from '@/components/session/SessionSummaryCard'
import type { MechanicAvailabilityBlock, SessionQueueItem, SessionSummary } from '@/types/session'

const MOCK_QUEUE: SessionQueueItem[] = [
  {
    id: 'queue-1',
    vehicle: '2020 Audi Q5',
    customerName: 'Brandon Lee',
    mechanicName: 'You',
    scheduledStart: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
    status: 'waiting',
    concernSummary: 'Check engine light + rough idle',
    waiverAccepted: true,
    extensionBalance: 0,
    queuePosition: 1,
    waitingSince: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  },
  {
    id: 'queue-2',
    vehicle: '2015 Honda Civic',
    customerName: 'Maya Patel',
    mechanicName: 'You',
    scheduledStart: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(Date.now() + 75 * 60 * 1000).toISOString(),
    status: 'scheduled',
    concernSummary: 'Pre-purchase inspection',
    waiverAccepted: false,
    extensionBalance: 15,
    queuePosition: 2
  }
]

const MOCK_AVAILABILITY: MechanicAvailabilityBlock[] = [
  { id: 'a1', weekday: 1, startTime: '09:00', endTime: '13:00', isActive: true },
  { id: 'a2', weekday: 3, startTime: '12:00', endTime: '18:00', isActive: true },
  { id: 'a3', weekday: 5, startTime: '10:00', endTime: '14:00', isActive: false }
]

const MOCK_HISTORY: SessionSummary[] = [
  {
    id: 'history-1',
    vehicle: '2018 BMW 3 Series',
    customerName: 'Alex Johnson',
    mechanicName: 'You',
    scheduledStart: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
    status: 'completed',
    concernSummary: 'Brake squeal while driving',
    waiverAccepted: true,
    extensionBalance: 0
  }
]

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function MechanicDashboardPage() {
  const [search, setSearch] = useState('')

  const filteredQueue = useMemo(() => {
    return MOCK_QUEUE.filter((item) => item.customerName.toLowerCase().includes(search.toLowerCase()))
  }, [search])

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-8">
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-orange-600">Mechanic Workspace</p>
          <h1 className="text-3xl font-bold text-slate-900">Session Queue & Schedule</h1>
          <p className="text-sm text-slate-500">Stay on top of your live calls, upcoming bookings, and availability.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/mechanic/availability"
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600"
          >
            <CalendarDays className="h-4 w-4" />
            Manage availability
          </Link>
          <Link
            href="/mechanic/session/queue-1"
            className="flex items-center gap-2 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-orange-700"
          >
            <PlayCircle className="h-4 w-4" />
            Join next session
          </Link>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <section className="space-y-6">
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Live queue</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search customers"
                  className="w-full rounded-full border border-slate-200 px-10 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-xs uppercase text-slate-500">{item.vehicle}</p>
                    <p className="text-lg font-semibold text-slate-900">{item.customerName}</p>
                    <p className="text-sm text-slate-500">{item.concernSummary}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-orange-500" />
                      <span>{new Date(item.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-emerald-500" />
                      <span>Waiver {item.waiverAccepted ? 'on file' : 'pending'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TimerReset className="h-4 w-4 text-purple-500" />
                      <span>{item.extensionBalance} min banked</span>
                    </div>
                  </div>
                  <Link
                    href={`/mechanic/session/${item.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
                  >
                    Open workspace
                  </Link>
                </div>
              ))}
              {filteredQueue.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No sessions match your search just yet.
                </div>
              )}
            </div>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Recent sessions</h2>
              <Link href="/mechanic/summaries" className="text-sm font-semibold text-orange-600">
                View all
              </Link>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {MOCK_HISTORY.map((summary) => (
                <SessionSummaryCard key={summary.id} summary={summary} />
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Availability overview</h2>
            <p className="mt-1 text-sm text-slate-500">Adjust your live hours to control when bookings appear.</p>
            <ul className="mt-4 space-y-3">
              {MOCK_AVAILABILITY.map((block) => (
                <li
                  key={block.id}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                    block.isActive ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{WEEKDAYS[block.weekday]}</p>
                    <p className="text-xs text-slate-500">
                      {block.startTime} - {block.endTime}
                    </p>
                  </div>
                  <span className="text-xs font-semibold uppercase">
                    {block.isActive ? 'Open' : 'Paused'}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-orange-600 to-red-600 p-6 text-white shadow-lg">
            <h2 className="text-lg font-semibold">Digital waivers ready</h2>
            <p className="mt-1 text-sm text-blue-100">
              Customers sign automatically before joining so you can focus on diagnostics.
            </p>
            <Link
              href="/waiver"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <ClipboardSignature className="h-4 w-4" /> Review waiver template
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
