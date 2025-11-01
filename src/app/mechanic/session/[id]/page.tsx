'use client'

import { useEffect, useState, type ComponentType } from 'react'
import { notFound, useParams } from 'next/navigation'
import { ArrowLeft, Camera, Headphones, Mic, MicOff, PhoneOff, Share, Loader2 } from 'lucide-react'
import Link from 'next/link'
import SessionTimer from '@/components/session/SessionTimer'
import FileSharePanel from '@/components/session/FileSharePanel'
import SessionExtensionPanel from '@/components/session/SessionExtensionPanel'
import WaitingRoom from '@/components/session/WaitingRoom'
import type { SessionExtensionRequest, SessionQueueItem } from '@/types/session'

export default function MechanicSessionPage() {
  const params = useParams<{ id: string }>()
  const [session, setSession] = useState<SessionQueueItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [screenShared, setScreenShared] = useState(false)
  const [showWaitingRoom, setShowWaitingRoom] = useState(false)

  useEffect(() => {
    async function fetchSession() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/mechanic/sessions/${params.id}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load session')
        }

        // Transform API response to SessionQueueItem format
        const vehicle = data.session?.vehicles
          ? `${data.session.vehicles.year} ${data.session.vehicles.make} ${data.session.vehicles.model}`
          : 'Vehicle'

        const transformedSession: SessionQueueItem = {
          id: data.id,
          vehicle,
          customerName: data.customer?.full_name || 'Customer',
          mechanicName: 'You',
          scheduledStart: data.created_at || new Date().toISOString(),
          scheduledEnd: data.completed_at || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          status: data.status === 'in_progress' ? 'live' : (data.status as any),
          concernSummary: data.session?.concern_summary || data.diagnosis_summary || 'No details provided',
          waiverAccepted: true,
          extensionBalance: 0,
          queuePosition: 1,
          waitingSince: data.created_at || new Date().toISOString()
        }

        setSession(transformedSession)
        setShowWaitingRoom(transformedSession.status !== 'live')
      } catch (err: any) {
        console.error('[Session Page] Error fetching session:', err)
        setError(err.message || 'Failed to load session')
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-orange-500 animate-spin mx-auto" />
          <p className="mt-4 text-slate-400">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error || 'Session not found'}</p>
          <Link href="/mechanic/dashboard" className="text-orange-400 hover:underline">
            Return to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/50 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link href="/mechanic/dashboard" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <div>
            <p className="text-xs uppercase tracking-widest text-orange-300">Live Session</p>
            <h1 className="text-xl font-semibold">{session.vehicle} • {session.customerName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SessionTimer endsAt={session.scheduledEnd} startsAt={session.scheduledStart} />
        </div>
      </header>

      <main className="grid gap-6 px-6 py-6 xl:grid-cols-[3fr,2fr]">
        <section className="space-y-4">
          {showWaitingRoom ? (
            <div className="space-y-4">
              <WaitingRoom session={session} />
              <button
                type="button"
                onClick={() => setShowWaitingRoom(false)}
                className="w-full rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-orange-400"
              >
                Enter live workspace
              </button>
            </div>
          ) : (
            <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
              <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 text-center">
                <Camera className="h-12 w-12 text-orange-400" />
                <p className="text-lg font-semibold">Live video stream placeholder</p>
                <p className="text-sm text-slate-400">Connects to LiveKit in production.</p>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Vehicle notes</h2>
            <p className="mt-2 text-sm text-slate-300">
              Concern summary: {session.concernSummary}. Gather live diagnostics and update the shared notes after the call.
            </p>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="grid gap-3 rounded-3xl border border-slate-800 bg-slate-950/60 p-4 sm:grid-cols-2">
            <VideoControlButton
              icon={micEnabled ? Mic : MicOff}
              label={micEnabled ? 'Mute mic' : 'Unmute mic'}
              active={micEnabled}
              onClick={() => setMicEnabled((value) => !value)}
            />
            <VideoControlButton
              icon={cameraEnabled ? Camera : Camera}
              label={cameraEnabled ? 'Stop camera' : 'Start camera'}
              active={cameraEnabled}
              onClick={() => setCameraEnabled((value) => !value)}
            />
            <VideoControlButton
              icon={Share}
              label={screenShared ? 'Stop sharing' : 'Share screen'}
              active={screenShared}
              onClick={() => setScreenShared((value) => !value)}
            />
            <VideoControlButton icon={Headphones} label="Toggle audio" active onClick={() => {}} />
            <button className="col-span-full flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-red-600">
              <PhoneOff className="h-4 w-4" />
              End session
            </button>
          </div>

          <FileSharePanel />
          <SessionExtensionPanel existingRequests={[]} />
        </aside>
      </main>
    </div>
  )
}

interface VideoControlButtonProps {
  icon: ComponentType<{ className?: string }>
  label: string
  active: boolean
  onClick: () => void
}

function VideoControlButton({ icon: Icon, label, active, onClick }: VideoControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow transition ${
        active ? 'border-orange-500 bg-orange-500/10 text-orange-200' : 'border-slate-800 bg-slate-900 text-slate-400'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}
