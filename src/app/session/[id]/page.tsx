'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Camera, Info, Mic, MicOff, PhoneOff, Share2, Video } from 'lucide-react'
import Link from 'next/link'
import SessionTimer from '@/components/session/SessionTimer'
import FileSharePanel from '@/components/session/FileSharePanel'
import SessionExtensionPanel from '@/components/session/SessionExtensionPanel'
import WaitingRoom from '@/components/session/WaitingRoom'
import type { SessionQueueItem } from '@/types/session'

const MOCK_SESSION: SessionQueueItem = {
  id: 'queue-1',
  vehicle: '2020 Audi Q5',
  customerName: 'You',
  mechanicName: 'Jamie Carter',
  scheduledStart: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
  scheduledEnd: new Date(Date.now() + 32 * 60 * 1000).toISOString(),
  status: 'waiting',
  concernSummary: 'Check engine light + rough idle',
  waiverAccepted: true,
  extensionBalance: 0,
  queuePosition: 1,
  waitingSince: new Date().toISOString()
}

export default function SessionWorkspacePage() {
  const params = useParams<{ id: string }>()
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [showWaitingRoom, setShowWaitingRoom] = useState(MOCK_SESSION.status !== 'live')

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/50 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-300">Session #{params.id}</p>
            <h1 className="text-xl font-semibold">Certified mechanic: {MOCK_SESSION.mechanicName}</h1>
          </div>
        </div>
        <SessionTimer endsAt={MOCK_SESSION.scheduledEnd} startsAt={MOCK_SESSION.scheduledStart} />
      </header>

      <main className="grid gap-6 px-6 py-6 xl:grid-cols-[3fr,2fr]">
        <section className="space-y-4">
          {showWaitingRoom ? (
            <div className="space-y-4">
              <WaitingRoom session={MOCK_SESSION} />
              <button
                type="button"
                onClick={() => setShowWaitingRoom(false)}
                className="w-full rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-400"
              >
                Join session workspace
              </button>
            </div>
          ) : (
            <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-700/30 via-slate-900 to-slate-950" />
              <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 text-center">
                <Video className="h-12 w-12 text-blue-300" />
                <p className="text-lg font-semibold">Connecting you to your mechanic…</p>
                <p className="text-sm text-slate-300">Video powered by LiveKit with HD streaming.</p>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg">
            <div className="flex items-center gap-2 text-sm text-blue-200">
              <Info className="h-4 w-4" />
              Session tips
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>• Have your VIN or license plate ready.</li>
              <li>• Prop your phone to show the engine bay hands-free.</li>
              <li>• Upload diagnostic scans through the file panel.</li>
            </ul>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="grid gap-3 rounded-3xl border border-slate-800 bg-slate-950/60 p-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMicEnabled((value) => !value)}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow transition ${
                micEnabled ? 'border-blue-500 bg-blue-500/10 text-blue-200' : 'border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              {micEnabled ? 'Mute microphone' : 'Unmute microphone'}
            </button>
            <button
              type="button"
              onClick={() => setCameraEnabled((value) => !value)}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow transition ${
                cameraEnabled ? 'border-blue-500 bg-blue-500/10 text-blue-200' : 'border-slate-800 bg-slate-900 text-slate-400'
              }`}
            >
              <Camera className="h-4 w-4" />
              {cameraEnabled ? 'Stop camera' : 'Start camera'}
            </button>
            <button className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 shadow transition hover:border-blue-500 hover:text-white">
              <Share2 className="h-4 w-4" /> Share screen
            </button>
            <button className="col-span-full flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-red-600">
              <PhoneOff className="h-4 w-4" /> Leave session
            </button>
          </div>

          <FileSharePanel />
          <SessionExtensionPanel />
        </aside>
      </main>
    </div>
  )
}
