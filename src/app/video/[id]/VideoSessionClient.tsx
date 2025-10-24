'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  LiveKitRoom,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  VideoTrack,
  RoomAudioRenderer,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { Track } from 'livekit-client'
import {
  Clock, UserPlus, AlertCircle, Video, VideoOff, Mic, MicOff,
  Monitor, MonitorOff, PhoneOff, Upload, X, FileText, Download,
  Maximize2, Minimize2
} from 'lucide-react'

type PlanKey = 'chat10' | 'video15' | 'diagnostic'

const PLAN_DURATIONS: Record<PlanKey, number> = {
  chat10: 30,
  video15: 45,
  diagnostic: 60,
}

const TIME_EXTENSIONS = [
  { duration: 15, price: 1499, label: '15 minutes - $14.99' },
  { duration: 30, price: 2499, label: '30 minutes - $24.99' },
  { duration: 60, price: 3999, label: '60 minutes - $39.99' },
]

interface VideoSessionClientProps {
  sessionId: string
  userId: string
  userRole: 'mechanic' | 'customer'
  plan: PlanKey
  planName: string
  token: string
  serverUrl: string
  status: string
  startedAt: string | null
  mechanicId: string | null
  customerId: string | null
  dashboardUrl: string
}

function ParticipantMonitor({
  onMechanicJoined,
  onMechanicLeft,
  onCustomerJoined,
  onCustomerLeft,
}: {
  onMechanicJoined: () => void
  onMechanicLeft: () => void
  onCustomerJoined: () => void
  onCustomerLeft: () => void
}) {
  const { localParticipant } = useLocalParticipant()
  const remoteParticipants = useRemoteParticipants()

  // Track previous state to only log changes
  const prevMechanicPresent = useRef<boolean | null>(null)
  const prevCustomerPresent = useRef<boolean | null>(null)

  useEffect(() => {
    // Combine local and remote participants
    const allParticipants = [localParticipant, ...remoteParticipants].filter(Boolean)

    // Helper function to determine role from both metadata AND identity pattern
    const getParticipantRole = (participant: any): 'mechanic' | 'customer' | null => {
      if (!participant) return null

      // Method 1: Try to parse metadata (preferred method)
      if (participant.metadata) {
        try {
          const parsed = JSON.parse(participant.metadata)
          if (parsed.role === 'mechanic' || parsed.role === 'customer') {
            return parsed.role
          }
        } catch {
          // Silently fail and try fallback
        }
      }

      // Method 2: FALLBACK - Parse identity pattern (mechanic-{id} or customer-{id})
      if (participant.identity) {
        const identity = String(participant.identity)
        if (identity.startsWith('mechanic-')) return 'mechanic'
        if (identity.startsWith('customer-')) return 'customer'
      }

      return null
    }

    // Filter for mechanic and customer using the robust detection method
    const mechanicParticipants = allParticipants.filter((p) => getParticipantRole(p) === 'mechanic')
    const customerParticipants = allParticipants.filter((p) => getParticipantRole(p) === 'customer')

    const mechanicPresent = mechanicParticipants.length > 0
    const customerPresent = customerParticipants.length > 0

    // ONLY LOG WHEN STATE CHANGES (prevents console spam)
    if (prevMechanicPresent.current !== mechanicPresent || prevCustomerPresent.current !== customerPresent) {
      console.log('[ParticipantMonitor] ===== PRESENCE STATE CHANGE =====')
      console.log('[ParticipantMonitor] Total participants:', allParticipants.length)

      // Log each participant's detected role
      allParticipants.forEach((p) => {
        const role = getParticipantRole(p)
        console.log(`[ParticipantMonitor]   - ${p.identity}: ${role || 'UNKNOWN'}`, {
          metadata: p.metadata,
          hasMetadata: !!p.metadata,
          identity: p.identity
        })
      })

      console.log('[ParticipantMonitor] Results:')
      console.log(`[ParticipantMonitor]   Mechanic present: ${mechanicPresent} (was: ${prevMechanicPresent.current})`)
      console.log(`[ParticipantMonitor]   Customer present: ${customerPresent} (was: ${prevCustomerPresent.current})`)
      console.log('[ParticipantMonitor] ================================')

      // Update tracked state
      prevMechanicPresent.current = mechanicPresent
      prevCustomerPresent.current = customerPresent
    }

    // Update presence state
    if (mechanicPresent) {
      onMechanicJoined()
    } else {
      onMechanicLeft()
    }

    if (customerPresent) {
      onCustomerJoined()
    } else {
      onCustomerLeft()
    }
  }, [localParticipant, remoteParticipants, onMechanicJoined, onMechanicLeft, onCustomerJoined, onCustomerLeft])

  return null
}

function SessionTimer({
  startTime,
  durationMinutes,
  onTimeWarning,
  onTimeUp,
}: {
  startTime: Date
  durationMinutes: number
  onTimeWarning: (minutesLeft: number) => void
  onTimeUp: () => void
}) {
  const [timeLeft, setTimeLeft] = useState<number>(durationMinutes * 60)
  const [hasWarned5, setHasWarned5] = useState(false)
  const [hasWarned1, setHasWarned1] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000)
      const remaining = Math.max(0, durationMinutes * 60 - elapsed)

      setTimeLeft(remaining)

      const minutesLeft = Math.floor(remaining / 60)
      if (minutesLeft === 5 && !hasWarned5) {
        setHasWarned5(true)
        onTimeWarning(5)
      }
      if (minutesLeft === 1 && !hasWarned1) {
        setHasWarned1(true)
        onTimeWarning(1)
      }

      if (remaining === 0) {
        onTimeUp()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, durationMinutes, hasWarned5, hasWarned1, onTimeWarning, onTimeUp])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  const isWarning = minutes < 5
  const isDanger = minutes < 1

  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
      isDanger ? 'bg-red-500/20 text-red-200' :
      isWarning ? 'bg-amber-500/20 text-amber-200' :
      'bg-slate-800/80 text-slate-200'
    }`}>
      <Clock className="h-4 w-4" />
      <span className="font-mono text-sm font-semibold">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  )
}

function VideoControls({
  onEndSession,
  onUploadFile,
}: {
  onEndSession: () => void
  onUploadFile: (file: File) => void
}) {
  const { isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled, localParticipant } = useLocalParticipant()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleCamera = useCallback(async () => {
    try {
      console.log('[VideoControls] Toggling camera, current state:', isCameraEnabled)
      await localParticipant.setCameraEnabled(!isCameraEnabled)
      console.log('[VideoControls] Camera toggled successfully to:', !isCameraEnabled)
    } catch (error) {
      console.error('[VideoControls] Failed to toggle camera:', error)
      alert('Failed to toggle camera. Please check your camera permissions.')
    }
  }, [localParticipant, isCameraEnabled])

  const toggleMic = useCallback(async () => {
    try {
      console.log('[VideoControls] Toggling mic, current state:', isMicrophoneEnabled)
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
      console.log('[VideoControls] Mic toggled successfully to:', !isMicrophoneEnabled)
    } catch (error) {
      console.error('[VideoControls] Failed to toggle microphone:', error)
      alert('Failed to toggle microphone. Please check your microphone permissions.')
    }
  }, [localParticipant, isMicrophoneEnabled])

  const toggleScreenShare = useCallback(async () => {
    try {
      console.log('[VideoControls] Toggling screen share, current state:', isScreenShareEnabled)
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled)
      console.log('[VideoControls] Screen share toggled successfully to:', !isScreenShareEnabled)
    } catch (error) {
      console.error('[VideoControls] Failed to toggle screen share:', error)
      alert('Failed to toggle screen share. Please try again.')
    }
  }, [localParticipant, isScreenShareEnabled])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUploadFile(file)
      e.target.value = '' // Reset input
    }
  }, [onUploadFile])

  return (
    <div className="flex items-center gap-2">
      {/* Camera Toggle */}
      <button
        onClick={toggleCamera}
        className={`rounded-lg p-3 transition ${
          isCameraEnabled
            ? 'bg-slate-700/80 text-white hover:bg-slate-600'
            : 'bg-red-500/80 text-white hover:bg-red-600'
        }`}
        title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {isCameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </button>

      {/* Microphone Toggle */}
      <button
        onClick={toggleMic}
        className={`rounded-lg p-3 transition ${
          isMicrophoneEnabled
            ? 'bg-slate-700/80 text-white hover:bg-slate-600'
            : 'bg-red-500/80 text-white hover:bg-red-600'
        }`}
        title={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {isMicrophoneEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </button>

      {/* Screen Share Toggle */}
      <button
        onClick={toggleScreenShare}
        className={`rounded-lg p-3 transition ${
          isScreenShareEnabled
            ? 'bg-blue-500/80 text-white hover:bg-blue-600'
            : 'bg-slate-700/80 text-white hover:bg-slate-600'
        }`}
        title={isScreenShareEnabled ? 'Stop sharing' : 'Share screen'}
      >
        {isScreenShareEnabled ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
      </button>

      {/* Upload File */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="rounded-lg bg-slate-700/80 p-3 text-white transition hover:bg-slate-600"
        title="Share file"
      >
        <Upload className="h-5 w-5" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.txt"
      />

      {/* Fullscreen Toggle */}
      <button
        onClick={toggleFullscreen}
        className="rounded-lg bg-slate-700/80 p-3 text-white transition hover:bg-slate-600"
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </button>

      {/* End Session */}
      <button
        onClick={onEndSession}
        className="ml-2 rounded-lg bg-red-500/80 p-3 text-white transition hover:bg-red-600"
        title="End session"
      >
        <PhoneOff className="h-5 w-5" />
      </button>
    </div>
  )
}

function VideoView({
  userRole,
}: {
  userRole: 'mechanic' | 'customer'
}) {
  const cameraTracks = useTracks([Track.Source.Camera])
  const screenTracks = useTracks([Track.Source.ScreenShare])

  const localCameraTrack = cameraTracks.find((t) => t.participant.isLocal)
  const remoteCameraTrack = cameraTracks.find((t) => !t.participant.isLocal)
  const screenShareTrack = screenTracks.find((t) => t.publication.isSubscribed)

  // FIXED: Main video shows your own camera, PIP shows other person
  // If someone is screen sharing, screen share is main, other person's camera is PIP
  const mainTrack = screenShareTrack || localCameraTrack
  const pipTrack = screenShareTrack ? remoteCameraTrack : remoteCameraTrack

  console.log('[VideoView] Tracks detected:', {
    hasLocal: !!localCameraTrack,
    hasRemote: !!remoteCameraTrack,
    hasScreenShare: !!screenShareTrack,
    mainIsLocal: mainTrack?.participant.isLocal,
    pipIsLocal: pipTrack?.participant.isLocal,
  })

  return (
    <div className="relative h-full w-full">
      {/* Main Video (Your camera or screen share) */}
      <div className="absolute inset-0 bg-slate-900">
        {mainTrack ? (
          <VideoTrack
            trackRef={mainTrack}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-slate-700">
                <UserPlus className="h-12 w-12 text-slate-400" />
              </div>
              <p className="text-lg text-slate-300">
                {localCameraTrack ? `Waiting for ${userRole === 'mechanic' ? 'customer' : 'mechanic'}...` : 'Turn on your camera to start'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Picture-in-Picture (Other person's camera) */}
      {pipTrack && (
        <div className="absolute bottom-4 right-4 z-10 h-48 w-64 overflow-hidden rounded-lg border-2 border-slate-700 bg-slate-900 shadow-2xl">
          <VideoTrack
            trackRef={pipTrack}
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
            {pipTrack.participant.isLocal ? 'You' : (userRole === 'mechanic' ? 'Customer' : 'Mechanic')}
          </div>
        </div>
      )}
    </div>
  )
}

export default function VideoSessionClient({
  sessionId,
  userId: _userId,
  userRole: _userRole,
  plan,
  planName: _planName,
  token,
  serverUrl,
  status: _status,
  startedAt: _startedAt,
  mechanicId: _mechanicId,
  customerId: _customerId,
  dashboardUrl,
}: VideoSessionClientProps) {
  const [mechanicPresent, setMechanicPresent] = useState(false)
  const [customerPresent, setCustomerPresent] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [extendingSession, setExtendingSession] = useState(false)
  const [timeWarning, setTimeWarning] = useState<string | null>(null)
  const [bothJoinedNotification, setBothJoinedNotification] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [sharedFiles, setSharedFiles] = useState<Array<{ name: string; url: string; size: number }>>([])

  const durationMinutes = PLAN_DURATIONS[plan] || 45

  // Auto-update session status to "waiting" when first participant joins
  useEffect(() => {
    const updateSessionStatus = async () => {
      try {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()

        const { data: session } = await supabase
          .from('sessions')
          .select('status')
          .eq('id', sessionId)
          .single()

        if (session?.status?.toLowerCase() === 'pending') {
          await supabase
            .from('sessions')
            .update({ status: 'waiting' })
            .eq('id', sessionId)

          console.log('[VIDEO] Session status updated to waiting (first participant joined)')
        }
      } catch (err) {
        console.error('Failed to update video session status:', err)
      }
    }
    updateSessionStatus()
  }, [sessionId])

  const handleMechanicJoined = useCallback(() => {
    console.log('[VIDEO] Mechanic joined')
    setMechanicPresent(true)
  }, [])

  const handleMechanicLeft = useCallback(() => {
    console.log('[VIDEO] Mechanic left')
    setMechanicPresent(false)
  }, [])

  const handleCustomerJoined = useCallback(() => {
    console.log('[VIDEO] Customer joined')
    setCustomerPresent(true)
  }, [])

  const handleCustomerLeft = useCallback(() => {
    console.log('[VIDEO] Customer left')
    setCustomerPresent(false)
  }, [])

  // Dual-join detection: Start session when BOTH participants join
  useEffect(() => {
    if (mechanicPresent && customerPresent && !sessionStarted) {
      console.log('[VIDEO] Both participants present - Starting session!')
      setBothJoinedNotification(true)
      setTimeout(() => setBothJoinedNotification(false), 5000)

      setSessionStarted(true)
      setSessionStartTime(new Date())

      fetch(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('[VIDEO] Session start API response:', data)
        })
        .catch((err) => {
          console.error('[VIDEO] Failed to call session start API:', err)
        })
    }
  }, [mechanicPresent, customerPresent, sessionStarted, sessionId])

  const handleTimeWarning = useCallback((minutesLeft: number) => {
    setTimeWarning(`${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} remaining`)
    setTimeout(() => setTimeWarning(null), 5000)
  }, [])

  const handleTimeUp = useCallback(() => {
    setTimeWarning('Session time has ended')
    setShowExtendModal(true)
  }, [])

  const handleExtendTime = async (duration: number, price: number) => {
    setExtendingSession(true)
    try {
      const response = await fetch('/api/session/extend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          duration,
          price,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create extension checkout')
      }

      const data = await response.json()
      window.location.href = data.checkoutUrl
    } catch (error) {
      console.error('Error extending session:', error)
      alert('Failed to extend session. Please try again.')
      setExtendingSession(false)
    }
  }

  const handleEndSession = useCallback(() => {
    setShowEndConfirm(true)
  }, [])

  const confirmEndSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
      })

      if (response.ok) {
        window.location.href = dashboardUrl
      } else {
        console.error('Failed to end session')
      }
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }, [sessionId, dashboardUrl])

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionId', sessionId)

      const response = await fetch('/api/sessions/' + sessionId + '/files', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setSharedFiles((prev) => [...prev, {
          name: file.name,
          url: data.url,
          size: file.size,
        }])
      } else {
        alert('Failed to upload file')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }, [sessionId])

  return (
    <div className="relative h-screen w-full bg-slate-950">
      {/* Waiting Room Overlay */}
      {(!mechanicPresent || !customerPresent) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur">
          <div className="max-w-md space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/20">
              <UserPlus className="h-10 w-10 animate-pulse text-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">
                {!mechanicPresent && !customerPresent
                  ? 'Waiting for both participants...'
                  : !mechanicPresent
                  ? 'Waiting for mechanic to join'
                  : 'Waiting for customer to join'}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {!mechanicPresent && !customerPresent
                  ? 'Session will start when both participants join.'
                  : !mechanicPresent
                  ? 'A certified mechanic will join shortly.'
                  : 'Waiting for the customer to enter the session.'}
              </p>
            </div>
            <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-4">
              <p className="text-sm text-yellow-200">
                <strong>Session Duration:</strong> {durationMinutes} minutes
              </p>
              <p className="mt-1 text-xs text-yellow-300">
                Timer starts when both participants join
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
              <span className="text-sm text-slate-300">{"You're connected and ready"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Both Joined Notification */}
      {bothJoinedNotification && (
        <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 transform">
          <div className="flex items-center gap-2 rounded-full border border-green-400/30 bg-green-500/20 px-6 py-3 text-green-200 shadow-lg backdrop-blur">
            <div className="h-3 w-3 rounded-full bg-green-400"></div>
            <span className="text-sm font-semibold">Both participants joined - Session starting!</span>
          </div>
        </div>
      )}

      {/* Time Warning Notification */}
      {timeWarning && (
        <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 transform">
          <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/20 px-4 py-2 text-amber-200 shadow-lg backdrop-blur">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-semibold">{timeWarning}</span>
          </div>
        </div>
      )}

      {/* File Upload Progress */}
      {uploadingFile && (
        <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 transform">
          <div className="flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/20 px-6 py-3 text-blue-200 shadow-lg backdrop-blur">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"></div>
            <span className="text-sm font-semibold">Uploading file...</span>
          </div>
        </div>
      )}

      {/* Session Header */}
      <div className="absolute left-4 right-4 top-4 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href={dashboardUrl}
            className="rounded-lg border border-white/10 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-slate-800"
          >
            ← Dashboard
          </a>

          {/* ROLE INDICATOR - Shows exactly what role you are assigned */}
          <div className={`rounded-full border-2 px-4 py-2 text-sm font-bold backdrop-blur ${
            _userRole === 'mechanic'
              ? 'border-blue-400 bg-blue-500/20 text-blue-100'
              : 'border-green-400 bg-green-500/20 text-green-100'
          }`}>
            {_userRole === 'mechanic' ? '🔧 YOU ARE: MECHANIC' : '👤 YOU ARE: CUSTOMER'}
          </div>

          {/* Debug info (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-mono text-amber-200">
              ID: {_userId.slice(0, 8)}
            </div>
          )}
        </div>

        {sessionStarted && sessionStartTime && (
          <SessionTimer
            startTime={sessionStartTime}
            durationMinutes={durationMinutes}
            onTimeWarning={handleTimeWarning}
            onTimeUp={handleTimeUp}
          />
        )}
      </div>

      {/* Main Video Conference */}
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect
        video
        audio
        className="h-full w-full"
      >
        <ParticipantMonitor
          onMechanicJoined={handleMechanicJoined}
          onMechanicLeft={handleMechanicLeft}
          onCustomerJoined={handleCustomerJoined}
          onCustomerLeft={handleCustomerLeft}
        />
        <VideoView userRole={_userRole} />
        <RoomAudioRenderer />

        {/* Video Controls - Bottom Bar */}
        {sessionStarted && (
          <div className="absolute bottom-0 left-0 right-0 z-40 border-t border-slate-700/50 bg-slate-900/90 p-4 backdrop-blur">
            <div className="mx-auto flex max-w-4xl items-center justify-between">
              <div className="text-sm text-slate-300">
                <strong className="text-white">{_planName}</strong>
              </div>

              <VideoControls
                onEndSession={handleEndSession}
                onUploadFile={handleFileUpload}
              />
            </div>
          </div>
        )}
      </LiveKitRoom>

      {/* Shared Files Sidebar */}
      {sharedFiles.length > 0 && (
        <div className="absolute right-4 top-20 z-40 w-72 rounded-lg border border-slate-700 bg-slate-900/95 p-4 backdrop-blur">
          <h3 className="mb-3 text-sm font-semibold text-white">Shared Files</h3>
          <div className="space-y-2">
            {sharedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 rounded border border-slate-700 bg-slate-800/50 p-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-xs text-white">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <a
                  href={file.url}
                  download={file.name}
                  className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* End Session Confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white">End Session?</h3>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to end this session? This action cannot be undone.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/35"
              >
                Cancel
              </button>
              <button
                onClick={confirmEndSession}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Time Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Extend Your Session</h3>
              <button
                onClick={() => setShowExtendModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Choose additional time to continue your session
            </p>

            <div className="mt-6 space-y-3">
              {TIME_EXTENSIONS.map((option) => (
                <button
                  key={option.duration}
                  onClick={() => handleExtendTime(option.duration, option.price)}
                  disabled={extendingSession}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-orange-400/50 hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">+{option.duration} minutes</p>
                      <p className="text-sm text-slate-400">Additional time</p>
                    </div>
                    <p className="text-lg font-bold text-orange-400">
                      ${(option.price / 100).toFixed(2)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
