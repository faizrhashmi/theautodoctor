'use client'

import '@livekit/components-styles'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
} from 'lucide-react'
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import SessionTimer from '@/components/session/SessionTimer'
import FileSharePanel from '@/components/session/FileSharePanel'
import SessionExtensionPanel from '@/components/session/SessionExtensionPanel'
import type { SessionFile, SessionSummary } from '@/types/session'
import { supabase } from '@/lib/supabase'

const SESSION_FILES_BUCKET = process.env.NEXT_PUBLIC_SESSION_FILES_BUCKET ?? 'session-files'

interface ParticipantState {
  sid: string
  identity: string
  name: string
  connected: boolean
  isLocal: boolean
  micEnabled: boolean
  cameraEnabled: boolean
}

interface LiveKitTokenResponse {
  token: string
  room: string
  serverUrl: string
}

const SUPABASE_AVAILABLE = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

export default function SessionWorkspacePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const sessionId = params.id

  const [session, setSession] = useState<SessionSummary | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const [identity, setIdentity] = useState<string | null>(null)
  const [tokenData, setTokenData] = useState<LiveKitTokenResponse | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const [participantStates, setParticipantStates] = useState<Record<string, ParticipantState>>({})

  const [sharedFiles, setSharedFiles] = useState<SessionFile[]>([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [endingSession, setEndingSession] = useState(false)
  const [endSessionError, setEndSessionError] = useState<string | null>(null)

  const [sessionStartedAt, setSessionStartedAt] = useState<string | undefined>(undefined)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    let active = true
    setSessionError(null)

    async function loadSession() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`)
        if (!response.ok) {
          throw new Error(`Failed to load session (${response.status})`)
        }
        const data = (await response.json()) as { session: SessionSummary }
        if (active) {
          setSession(data.session)
          setSessionStartedAt((prev) => prev ?? data.session.scheduledStart)
        }
      } catch (error) {
        console.error('Failed to load session', error)
        if (active) {
          setSessionError('We could not load this session. Please refresh or try again later.')
        }
      }
    }

    loadSession()

    return () => {
      active = false
    }
  }, [sessionId])

  useEffect(() => {
    let active = true
    setFilesLoading(true)
    setFilesError(null)

    async function loadFiles() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/files`)
        if (!response.ok) {
          throw new Error(`Failed to load files (${response.status})`)
        }
        const data = (await response.json()) as { files: SessionFile[] }
        if (active) {
          setSharedFiles(data.files)
        }
      } catch (error) {
        console.error('Failed to load session files', error)
        if (active) {
          setFilesError('Unable to load shared files for this session.')
        }
      } finally {
        if (active) {
          setFilesLoading(false)
        }
      }
    }

    loadFiles()

    return () => {
      active = false
    }
  }, [sessionId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const existing = window.localStorage.getItem('livekit-identity')
    if (existing) {
      setIdentity(existing)
    } else {
      const generated = `guest-${crypto.randomUUID()}`
      window.localStorage.setItem('livekit-identity', generated)
      setIdentity(generated)
    }
  }, [])

  useEffect(() => {
    if (!identity || !sessionId) return

    let active = true
    setTokenLoading(true)
    setTokenError(null)

    async function fetchToken() {
      try {
        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: sessionId, identity }),
        })
        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body?.error || `Failed to obtain LiveKit token (${response.status})`)
        }
        const data = (await response.json()) as LiveKitTokenResponse
        if (active) {
          setTokenData(data)
        }
      } catch (error) {
        console.error('Failed to fetch LiveKit token', error)
        if (active) {
          setTokenError('Unable to connect to the LiveKit session. Please refresh the page.')
        }
      } finally {
        if (active) {
          setTokenLoading(false)
        }
      }
    }

    fetchToken()

    return () => {
      active = false
    }
  }, [identity, sessionId])

  const handleParticipantsChanged = useCallback((participants: ParticipantState[]) => {
    setParticipantStates(
      participants.reduce<Record<string, ParticipantState>>((acc, participant) => {
        acc[participant.sid] = participant
        return acc
      }, {}),
    )
  }, [])

  const participantEntries = useMemo(() => Object.values(participantStates), [participantStates])
  const localParticipantState = useMemo(
    () => participantEntries.find((participant) => participant.isLocal),
    [participantEntries],
  )
  const remoteParticipantState = useMemo(
    () => participantEntries.find((participant) => !participant.isLocal),
    [participantEntries],
  )

  useEffect(() => {
    if (remoteParticipantState?.connected && !hasStartedRef.current) {
      const started = new Date().toISOString()
      hasStartedRef.current = true
      setSessionStartedAt(started)
    }
  }, [remoteParticipantState])

  const uploaderName = localParticipantState?.name ?? 'You'

  const handleFileUpload = useCallback(
    async (incoming: FileList | null) => {
      if (!incoming || uploading) return

      if (!SUPABASE_AVAILABLE) {
        setUploadError('Supabase is not configured. File uploads are unavailable in this environment.')
        return
      }

      setUploadError(null)
      setUploading(true)

      try {
        for (const file of Array.from(incoming)) {
          const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
          const path = `${sessionId}/${Date.now()}-${safeName}`
          const { error: uploadErr } = await supabase.storage
            .from(SESSION_FILES_BUCKET)
            .upload(path, file, {
              cacheControl: '3600',
              contentType: file.type || 'application/octet-stream',
              upsert: false,
            })

          if (uploadErr) {
            throw uploadErr
          }

          const { data: publicUrlData } = supabase.storage.from(SESSION_FILES_BUCKET).getPublicUrl(path)

          const newFile: SessionFile = {
            id: crypto.randomUUID(),
            fileName: file.name,
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: uploaderName,
            storagePath: path,
            url: publicUrlData.publicUrl,
          }

          setSharedFiles((prev) => [newFile, ...prev])
        }
      } catch (error) {
        console.error('File upload failed', error)
        setUploadError('We were unable to upload one or more files. Please try again.')
      } finally {
        setUploading(false)
      }
    },
    [sessionId, uploaderName, uploading],
  )

  const handleRemoveFile = useCallback(
    async (fileId: string) => {
      const target = sharedFiles.find((file) => file.id === fileId)
      if (!target) return

      if (!SUPABASE_AVAILABLE) {
        setUploadError('Supabase is not configured. Deleting files is unavailable in this environment.')
        return
      }

      setUploadError(null)

      try {
        if (target.storagePath) {
          const { error: removeError } = await supabase.storage
            .from(SESSION_FILES_BUCKET)
            .remove([target.storagePath])
          if (removeError) {
            throw removeError
          }
        }
        setSharedFiles((prev) => prev.filter((file) => file.id !== fileId))
      } catch (error) {
        console.error('Failed to delete file', error)
        setUploadError('We were unable to delete that file. Please try again.')
      }
    },
    [sharedFiles],
  )

  const handleEndSession = useCallback(async () => {
    if (endingSession) return

    setEndingSession(true)
    setEndSessionError(null)

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', endedAt: new Date().toISOString() }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body?.error || `Failed to end session (${response.status})`)
      }

      router.push(`/session/${sessionId}/complete`)
    } catch (error) {
      console.error('Failed to end session', error)
      setEndSessionError('We could not end the session. Please try again.')
      setEndingSession(false)
    }
  }, [endingSession, router, sessionId])

  const scheduledEnd = session?.scheduledEnd ?? new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const timerStart = sessionStartedAt ?? session?.scheduledStart ?? new Date().toISOString()
  const waitingForRemote = !remoteParticipantState?.connected

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/50 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-300 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <div>
            <p className="text-xs uppercase tracking-widest text-orange-300">Session #{sessionId}</p>
            <h1 className="text-xl font-semibold">
              Certified mechanic: {session?.mechanicName ?? 'Loading…'}
            </h1>
          </div>
        </div>
        <div className="min-w-[240px]">
          {session ? (
            <SessionTimer endsAt={scheduledEnd} startsAt={timerStart} />
          ) : (
            <div className="flex h-full min-h-[92px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
      </header>

      <main className="grid gap-6 px-6 py-6 xl:grid-cols-[3fr,2fr]">
        <section className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-lg">
            {tokenLoading && (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center text-slate-300">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p>Connecting to LiveKit…</p>
              </div>
            )}

            {tokenError && (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 bg-red-500/10 px-6 py-10 text-center text-sm text-red-200">
                <AlertCircle className="h-8 w-8" />
                <p>{tokenError}</p>
              </div>
            )}

            {!tokenLoading && !tokenError && tokenData && (
              <LiveKitRoom
                connect
                audio
                video
                token={tokenData.token}
                serverUrl={tokenData.serverUrl}
                onDisconnected={() => setParticipantStates({})}
                className="flex min-h-[320px] flex-col"
                data-lk-theme="default"
              >
                <div className="relative flex flex-1 flex-col">
                  <ParticipantStateBridge onChange={handleParticipantsChanged} />
                  <SessionMediaGrid />
                  <RoomAudioRenderer />
                  {waitingForRemote && (
                    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-slate-950/70 text-center text-sm text-slate-200">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <p>Waiting for your mechanic to join…</p>
                    </div>
                  )}
                </div>
                <ControlBar className="border-t border-slate-800 bg-slate-900/80 px-6 py-4" />
              </LiveKitRoom>
            )}
          </div>

          {sessionError && (
            <div className="rounded-3xl border border-red-400/40 bg-red-500/10 px-6 py-4 text-sm text-red-200">
              {sessionError}
            </div>
          )}

          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg">
            <div className="flex items-center gap-2 text-sm text-orange-200">
              <AlertCircle className="h-4 w-4" />
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
          <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
            <ParticipantStatusCard
              label="You"
              participant={localParticipantState}
              expectedName="You"
            />
            <ParticipantStatusCard
              label="Assigned mechanic"
              participant={remoteParticipantState}
              expectedName={session?.mechanicName ?? 'Mechanic'}
            />
            {endSessionError && (
              <p className="rounded-2xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {endSessionError}
              </p>
            )}
            <button
              type="button"
              onClick={handleEndSession}
              disabled={endingSession}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <PhoneOff className="h-4 w-4" />
              {endingSession ? 'Ending session…' : 'End session'}
            </button>
          </div>

          <FileSharePanel
            files={sharedFiles}
            onUpload={handleFileUpload}
            onRemove={handleRemoveFile}
            uploading={uploading}
            uploadError={uploadError ?? filesError}
            loading={filesLoading}
          />

          <SessionExtensionPanel />
        </aside>
      </main>
    </div>
  )
}

function SessionMediaGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: true },
      { source: Track.Source.Camera, withPlaceholder: true },
    ],
    { onlySubscribed: false },
  )

  if (tracks.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-900 via-slate-950 to-black text-center text-sm text-slate-300">
        <Video className="h-10 w-10 text-orange-300" />
        <p>Connecting your video session…</p>
      </div>
    )
  }

  return (
    <GridLayout className="grid min-h-[320px] w-full gap-4 bg-slate-900/40 p-4" tracks={tracks}>
      <ParticipantTile className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80" />
    </GridLayout>
  )
}

interface ParticipantStateBridgeProps {
  onChange: (participants: ParticipantState[]) => void
}

function ParticipantStateBridge({ onChange }: ParticipantStateBridgeProps) {
  const participants = useParticipants()

  useEffect(() => {
    const mapped: ParticipantState[] = participants.map((participant) => ({
      sid: participant.sid,
      identity: participant.identity,
      name: participant.name || participant.identity,
      connected: true,
      isLocal: participant.isLocal,
      micEnabled: participant.isMicrophoneEnabled,
      cameraEnabled: participant.isCameraEnabled,
    }))
    onChange(mapped)
  }, [onChange, participants])

  return null
}

interface ParticipantStatusCardProps {
  label: string
  participant?: ParticipantState
  expectedName?: string
}

function ParticipantStatusCard({ label, participant, expectedName }: ParticipantStatusCardProps) {
  const connected = participant?.connected ?? false
  const displayName = participant?.name ?? expectedName ?? label
  const micEnabled = participant?.micEnabled ?? false
  const cameraEnabled = participant?.cameraEnabled ?? false
  const hasParticipant = Boolean(participant)

  const connectionLabel = connected ? 'Connected' : hasParticipant ? 'Reconnecting' : 'Waiting'
  const micLabel = hasParticipant ? (micEnabled ? 'Mic on' : 'Mic muted') : 'Mic inactive'
  const cameraLabel = hasParticipant ? (cameraEnabled ? 'Video on' : 'Video off') : 'Video inactive'

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{label}</p>
          <p className="text-xs text-slate-400">{displayName}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            connected ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {connected ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {connectionLabel}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
            hasParticipant && micEnabled ? 'bg-orange-500/10 text-orange-200' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          {micLabel}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
            hasParticipant && cameraEnabled ? 'bg-orange-500/10 text-orange-200' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          {cameraLabel}
        </span>
      </div>
    </div>
  )
}
