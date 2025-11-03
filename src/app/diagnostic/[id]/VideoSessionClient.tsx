'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  LiveKitRoom,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  VideoTrack,
  RoomAudioRenderer,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { Track, ConnectionQuality } from 'livekit-client'
import {
  Clock, UserPlus, AlertCircle, Video, VideoOff, Mic, MicOff,
  Monitor, MonitorOff, PhoneOff, Upload, X, FileText, Download,
  Maximize2, Minimize2, SwitchCamera, Flashlight, Camera, Wifi, WifiOff,
  MessageCircle, Send, LogOut, Menu, Eye, EyeOff
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { DevicePreflight } from '@/components/video/DevicePreflight'

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

// Connection Quality Indicator Component
function ConnectionQualityBadge() {
  const { connectionQuality } = useLocalParticipant()

  const getQualityInfo = (quality: ConnectionQuality) => {
    switch (quality) {
      case ConnectionQuality.Excellent:
        return { label: 'Excellent', color: 'bg-green-500', icon: <Wifi className="h-3 w-3 sm:h-4 sm:w-4" /> }
      case ConnectionQuality.Good:
        return { label: 'Good', color: 'bg-green-500', icon: <Wifi className="h-3 w-3 sm:h-4 sm:w-4" /> }
      case ConnectionQuality.Poor:
        return { label: 'Poor', color: 'bg-orange-500', icon: <Wifi className="h-3 w-3 sm:h-4 sm:w-4" /> }
      case ConnectionQuality.Lost:
        return { label: 'Reconnecting', color: 'bg-red-500', icon: <WifiOff className="h-3 w-3 sm:h-4 sm:w-4" /> }
      default:
        return { label: 'Unknown', color: 'bg-slate-500', icon: <Wifi className="h-3 w-3 sm:h-4 sm:w-4" /> }
    }
  }

  const quality = getQualityInfo(connectionQuality)

  return (
    <div className={`flex items-center gap-1.5 rounded-full ${quality.color} px-2 py-1 text-white sm:gap-2 sm:px-3 sm:py-1.5`}>
      {quality.icon}
      <span className="text-[10px] font-medium sm:text-xs">{quality.label}</span>
    </div>
  )
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
  onCaptureScreenshot,
  capturingScreenshot,
  showChat,
  onToggleChat,
  unreadCount,
  showPip,
  onTogglePip,
}: {
  onEndSession: () => void
  onUploadFile: (file: File) => void
  onCaptureScreenshot: (blob: Blob) => void
  capturingScreenshot: boolean
  showChat: boolean
  onToggleChat: () => void
  unreadCount: number
  showPip: boolean
  onTogglePip: () => void
}) {
  const { isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled, localParticipant } = useLocalParticipant()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0)
  const [isFlashlightOn, setIsFlashlightOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Enumerate available cameras on mount
  useEffect(() => {
    async function getCameras() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameras = devices.filter(device => device.kind === 'videoinput')
        setAvailableCameras(cameras)
        console.log('[VideoControls] Available cameras:', cameras.length)
      } catch (error) {
        console.error('[VideoControls] Failed to enumerate cameras:', error)
      }
    }
    getCameras()
  }, [])

  // Check if device supports torch (flashlight)
  useEffect(() => {
    async function checkTorchSupport() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        })
        const track = stream.getVideoTracks()[0]
        const capabilities = track.getCapabilities()

        // @ts-ignore - torch is not in TypeScript types yet
        if (capabilities.torch) {
          setTorchSupported(true)
          console.log('[VideoControls] Torch supported')
        }

        track.stop()
      } catch (error) {
        console.log('[VideoControls] Torch not supported or error checking:', error)
      }
    }
    checkTorchSupport()
  }, [])

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

  const flipCamera = useCallback(async () => {
    if (availableCameras.length <= 1) {
      console.log('[VideoControls] Only one camera available, cannot flip')
      return
    }

    try {
      console.log('[VideoControls] Flipping camera, current index:', currentCameraIndex)

      // Cycle to next camera
      const nextIndex = (currentCameraIndex + 1) % availableCameras.length
      const nextCamera = availableCameras[nextIndex]

      console.log('[VideoControls] Switching to camera:', nextCamera.label)

      // Switch camera using LiveKit's switchActiveDevice
      await localParticipant.switchActiveDevice('videoinput', nextCamera.deviceId)

      setCurrentCameraIndex(nextIndex)
      console.log('[VideoControls] Camera flipped successfully to:', nextCamera.label)
    } catch (error) {
      console.error('[VideoControls] Failed to flip camera:', error)
      alert('Failed to switch camera. Please try again.')
    }
  }, [localParticipant, availableCameras, currentCameraIndex])

  const toggleFlashlight = useCallback(async () => {
    if (!torchSupported) {
      console.log('[VideoControls] Torch not supported on this device')
      return
    }

    try {
      console.log('[VideoControls] Toggling flashlight, current state:', isFlashlightOn)

      // Get the current video track from LiveKit
      const videoTrack = await localParticipant.getTrack(Track.Source.Camera)
      if (!videoTrack || !videoTrack.mediaStreamTrack) {
        console.error('[VideoControls] No camera track available')
        return
      }

      const track = videoTrack.mediaStreamTrack as MediaStreamTrack

      // @ts-ignore - torch is not in TypeScript types yet
      await track.applyConstraints({
        advanced: [{ torch: !isFlashlightOn }]
      })

      setIsFlashlightOn(!isFlashlightOn)
      console.log('[VideoControls] Flashlight toggled successfully to:', !isFlashlightOn)
    } catch (error) {
      console.error('[VideoControls] Failed to toggle flashlight:', error)
      // Silently fail - not critical enough for alert
    }
  }, [localParticipant, torchSupported, isFlashlightOn])

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

  const captureScreenshot = useCallback(async () => {
    try {
      console.log('[VideoControls] Capturing screenshot')

      // Find the main video element (not PIP)
      const videos = document.querySelectorAll('video')
      let mainVideo: HTMLVideoElement | null = null

      // Find the largest video element (main view)
      videos.forEach((video) => {
        if (!mainVideo || video.clientWidth > mainVideo.clientWidth) {
          mainVideo = video
        }
      })

      if (!mainVideo || mainVideo.videoWidth === 0) {
        console.error('[VideoControls] No video element found or video not ready')
        alert('Unable to capture screenshot. Please ensure video is playing.')
        return
      }

      // Create canvas with video dimensions
      const canvas = document.createElement('canvas')
      canvas.width = mainVideo.videoWidth
      canvas.height = mainVideo.videoHeight

      // Draw video frame to canvas
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('[VideoControls] Failed to get canvas context')
        return
      }

      ctx.drawImage(mainVideo, 0, 0, canvas.width, canvas.height)

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('[VideoControls] Screenshot captured successfully')
          onCaptureScreenshot(blob)
        } else {
          console.error('[VideoControls] Failed to create blob from canvas')
          alert('Failed to capture screenshot')
        }
      }, 'image/png')
    } catch (error) {
      console.error('[VideoControls] Error capturing screenshot:', error)
      alert('Failed to capture screenshot. Please try again.')
    }
  }, [onCaptureScreenshot])

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
      {/* Camera Toggle */}
      <button
        onClick={toggleCamera}
        className={`rounded-lg p-2 transition sm:p-3 ${
          isCameraEnabled
            ? 'bg-slate-700/80 text-white hover:bg-slate-600'
            : 'bg-red-500/80 text-white hover:bg-red-600'
        }`}
        title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {isCameraEnabled ? <Video className="h-4 w-4 sm:h-5 sm:w-5" /> : <VideoOff className="h-4 w-4 sm:h-5 sm:w-5" />}
      </button>

      {/* Camera Flip (only show if multiple cameras available) */}
      {availableCameras.length > 1 && isCameraEnabled && (
        <button
          onClick={flipCamera}
          className="rounded-lg bg-slate-700/80 p-2 text-white transition hover:bg-slate-600 sm:p-3"
          title="Switch camera (front/back)"
        >
          <SwitchCamera className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      )}

      {/* Flashlight Toggle (only show if torch supported) */}
      {torchSupported && isCameraEnabled && (
        <button
          onClick={toggleFlashlight}
          className={`rounded-lg p-2 transition sm:p-3 ${
            isFlashlightOn
              ? 'bg-yellow-500/80 text-white hover:bg-yellow-600'
              : 'bg-slate-700/80 text-white hover:bg-slate-600'
          }`}
          title={isFlashlightOn ? 'Turn off flashlight' : 'Turn on flashlight'}
        >
          <Flashlight className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      )}

      {/* Microphone Toggle */}
      <button
        onClick={toggleMic}
        className={`rounded-lg p-2 transition sm:p-3 ${
          isMicrophoneEnabled
            ? 'bg-slate-700/80 text-white hover:bg-slate-600'
            : 'bg-red-500/80 text-white hover:bg-red-600'
        }`}
        title={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {isMicrophoneEnabled ? <Mic className="h-4 w-4 sm:h-5 sm:w-5" /> : <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />}
      </button>

      {/* Screen Share Toggle */}
      <button
        onClick={toggleScreenShare}
        className={`rounded-lg p-2 transition sm:p-3 ${
          isScreenShareEnabled
            ? 'bg-blue-500/80 text-white hover:bg-blue-600'
            : 'bg-slate-700/80 text-white hover:bg-slate-600'
        }`}
        title={isScreenShareEnabled ? 'Stop sharing' : 'Share screen'}
      >
        {isScreenShareEnabled ? <MonitorOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Monitor className="h-4 w-4 sm:h-5 sm:w-5" />}
      </button>

      {/* Upload File */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="rounded-lg bg-slate-700/80 p-2 text-white transition hover:bg-slate-600 sm:p-3"
        title="Share file"
      >
        <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.txt"
      />

      {/* Screenshot Capture */}
      <button
        onClick={captureScreenshot}
        disabled={capturingScreenshot}
        className="rounded-lg bg-slate-700/80 p-2 text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50 sm:p-3"
        title="Capture screenshot"
      >
        <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      {/* Chat Toggle */}
      <button
        onClick={onToggleChat}
        className={`relative rounded-lg p-2 transition sm:p-3 ${
          showChat
            ? 'bg-blue-500/80 text-white hover:bg-blue-600'
            : 'bg-slate-700/80 text-white hover:bg-slate-600'
        }`}
        title={showChat ? 'Close chat' : 'Open chat'}
      >
        <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
        {unreadCount > 0 && !showChat && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* PIP Toggle */}
      <button
        onClick={onTogglePip}
        className={`rounded-lg p-2 transition sm:p-3 ${
          showPip
            ? 'bg-slate-700/80 text-white hover:bg-slate-600'
            : 'bg-orange-500/80 text-white hover:bg-orange-600'
        }`}
        title={showPip ? 'Hide picture-in-picture' : 'Show picture-in-picture'}
      >
        {showPip ? <Eye className="h-4 w-4 sm:h-5 sm:w-5" /> : <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />}
      </button>

      {/* Fullscreen Toggle */}
      <button
        onClick={toggleFullscreen}
        className="rounded-lg bg-slate-700/80 p-2 text-white transition hover:bg-slate-600 sm:p-3"
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />}
      </button>

      {/* End Session */}
      <button
        onClick={onEndSession}
        className="ml-1 rounded-lg bg-red-500/80 p-2 text-white transition hover:bg-red-600 sm:ml-2 sm:p-3"
        title="End session"
      >
        <PhoneOff className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
    </div>
  )
}

function VideoView({
  userRole,
  showPip = true,
}: {
  userRole: 'mechanic' | 'customer'
  showPip?: boolean
}) {
  const cameraTracks = useTracks([Track.Source.Camera])
  const screenTracks = useTracks([Track.Source.ScreenShare])

  const localCameraTrack = cameraTracks.find((t) => t.participant.isLocal)
  const remoteCameraTrack = cameraTracks.find((t) => !t.participant.isLocal)
  const screenShareTrack = screenTracks.find((t) => t.publication.isSubscribed)

  // Main video shows OTHER person's camera (or screen share), PIP shows your own camera
  // If someone is screen sharing, screen share is main, your camera is PIP
  const mainTrack = screenShareTrack || remoteCameraTrack
  const pipTrack = screenShareTrack ? localCameraTrack : localCameraTrack

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
      {pipTrack && showPip && (
        <div className="absolute bottom-16 right-2 z-50 h-28 w-36 overflow-hidden rounded-lg border-2 border-slate-700 bg-slate-900 shadow-2xl sm:bottom-20 sm:right-3 sm:h-36 sm:w-48 md:bottom-24 md:right-4 md:h-44 md:w-60 lg:h-52 lg:w-72">
          <VideoTrack
            trackRef={pipTrack}
            className="h-full w-full object-contain"
          />
          <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white sm:bottom-2 sm:left-2 sm:px-2 sm:py-1 sm:text-xs">
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
  const [capturingScreenshot, setCapturingScreenshot] = useState(false)
  const [sharedFiles, setSharedFiles] = useState<Array<{ name: string; url: string; size: number }>>([])
  const [extendedDuration, setExtendedDuration] = useState<number | null>(null) // Track extensions
  const [showPreflight, setShowPreflight] = useState(true) // Task 6: Device preflight
  const [preflightPassed, setPreflightPassed] = useState(false)
  const [showReconnectBanner, setShowReconnectBanner] = useState(false) // Task 6: Reconnect UX
  const [showChat, setShowChat] = useState(false) // Chat panel visibility
  const [messages, setMessages] = useState<Array<{ sender: string; senderRole: string; text: string; timestamp: number }>>([])
  const [messageInput, setMessageInput] = useState('')
  const [unreadCount, setUnreadCount] = useState(0) // Unread message count
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [showPip, setShowPip] = useState(true) // PIP visibility toggle

  // ⚠️ TESTING ONLY - REMOVE BEFORE PRODUCTION
  // Check URL parameter to skip preflight checks (for same-laptop testing)
  const skipPreflight = useMemo(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    return params.get('skipPreflight') === 'true'
  }, [])

  const baseDuration = PLAN_DURATIONS[plan] || 45
  const durationMinutes = extendedDuration || baseDuration // Use extended duration if available
  const supabase = useMemo(() => createClient(), [])

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

  // 🔒 SECURITY LAYER 2: Client-side status validation (backup for server-side)
  // Only redirects if session is ALREADY completed when component mounts
  // Prevents accessing completed sessions via back button/bookmark
  useEffect(() => {
    console.log('[DIAGNOSTIC SECURITY L2] Checking initial session status:', _status)
    if (_status === 'completed' || _status === 'cancelled') {
      console.log('[DIAGNOSTIC SECURITY L2] ⚠️ Session already ended, redirecting...')
      window.location.href = dashboardUrl
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount, not on status changes

  // 🔒 SECURITY LAYER 3: Real-time database listener for status changes
  // Shows completion modal for normal endings, redirects for external cancellations
  useEffect(() => {
    console.log('[DIAGNOSTIC SECURITY L3] Setting up real-time status monitor')

    const statusChannel = supabase
      .channel(`session-status:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('[DIAGNOSTIC SECURITY L3] 🔄 Session status changed:', payload)
          const newStatus = payload.new?.status

          if (newStatus === 'completed' || newStatus === 'cancelled') {
            console.log('[DIAGNOSTIC SECURITY L3] ⚠️ Session ended in database, redirecting...')
            const toastDiv = document.createElement('div')
            toastDiv.style.cssText = `
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: ${newStatus === 'cancelled' ? '#DC2626' : '#10B981'};
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              font-weight: 600;
              z-index: 99999;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `
            toastDiv.textContent = `Session has been ${newStatus === 'cancelled' ? 'cancelled' : 'completed'}`
            document.body.appendChild(toastDiv)

            setTimeout(() => {
              document.body.removeChild(toastDiv)
              window.location.href = dashboardUrl
            }, 2000)
          }
        }
      )
      .subscribe((status) => {
        console.log('[DIAGNOSTIC SECURITY L3] Database subscription status:', status)
      })

    return () => {
      console.log('[DIAGNOSTIC SECURITY L3] Cleaning up status monitor')
      supabase.removeChannel(statusChannel)
    }
  }, [sessionId, dashboardUrl, supabase, _status])

  // Listen for session:ended broadcasts from the other participant
  useEffect(() => {
    console.log('[VIDEO] Setting up session:ended broadcast listener')

    const channel = supabase
      .channel(`session:${sessionId}`, {
        config: {
          broadcast: { self: false }, // Don't receive own broadcasts
        },
      })
      .on('broadcast', { event: 'session:ended' }, (payload) => {
        console.log('[VIDEO] Session ended by other participant:', payload)
        const { status, endedBy } = payload.payload

        // Determine who ended the session
        const endedByText = endedBy === 'mechanic' ? 'the mechanic' : 'the customer'

        // Show elegant notification (non-blocking)
        const toastDiv = document.createElement('div')
        toastDiv.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: ${status === 'cancelled' ? '#DC2626' : '#10B981'};
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          z-index: 99999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `
        toastDiv.textContent = `Session has been ${status === 'cancelled' ? 'cancelled' : 'ended'} by ${endedByText}`
        document.body.appendChild(toastDiv)

        // Redirect to dashboard
        setTimeout(() => {
          document.body.removeChild(toastDiv)
          window.location.href = dashboardUrl
        }, 2000)
      })
      .on('broadcast', { event: 'session:extended' }, (payload) => {
        console.log('[VIDEO] Session extended:', payload)
        const { extensionMinutes, newDuration } = payload.payload

        // Show notification
        alert(`Session extended by ${extensionMinutes} minutes!`)

        // Update duration state - SessionTimer will automatically recalculate
        setExtendedDuration(newDuration)

        console.log(`[VIDEO] Duration updated: ${newDuration} minutes`)
      })
      .subscribe((status) => {
        console.log('[VIDEO] Broadcast subscription status:', status)
      })

    return () => {
      console.log('[VIDEO] Cleaning up broadcast subscription')
      supabase.removeChannel(channel)
    }
  }, [sessionId, dashboardUrl, supabase])

  // Task 6: Monitor for disconnections
  useEffect(() => {
    if (sessionStarted && (!mechanicPresent || !customerPresent)) {
      setShowReconnectBanner(true)
    } else {
      setShowReconnectBanner(false)
    }
  }, [mechanicPresent, customerPresent, sessionStarted])

  // Chat: Subscribe to realtime messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on('broadcast', { event: 'message' }, (payload) => {
        const message = payload.payload
        console.log('[CHAT] Received message:', message)

        setMessages((prev) => [...prev, message])

        // Increment unread count if chat is closed and message is from other person
        if (!showChat && message.sender !== _userId) {
          setUnreadCount((prev) => prev + 1)
        }
      })
      .subscribe()

    console.log('[CHAT] Subscribed to chat channel:', sessionId)

    return () => {
      console.log('[CHAT] Unsubscribing from chat channel')
      supabase.removeChannel(channel)
    }
  }, [supabase, sessionId, _userId, showChat])

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // Reset unread count when chat is opened
  useEffect(() => {
    if (showChat) {
      setUnreadCount(0)
    }
  }, [showChat])

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

    // Server-authoritative auto-end
    console.log('[VIDEO] Timer expired - auto-ending session')
    fetch(`/api/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('[VIDEO] Session auto-ended:', data)
        alert('Your session time has ended. Redirecting to dashboard...')
        setTimeout(() => {
          window.location.href = dashboardUrl
        }, 2000)
      })
      .catch((err) => {
        console.error('[VIDEO] Failed to auto-end session:', err)
        // Show extend modal as fallback
        setShowExtendModal(true)
      })
  }, [sessionId, dashboardUrl])

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

  const handleScreenshotCapture = useCallback(async (blob: Blob) => {
    setCapturingScreenshot(true)
    try {
      // Extract regex to avoid Turbo mode parsing it as Tailwind class
      const dateCharsRegex = /[:.]/g
      const timestamp = new Date().toISOString().replace(dateCharsRegex, '-')
      const filename = `screenshot-${timestamp}.png`

      const formData = new FormData()
      formData.append('file', blob, filename)
      formData.append('sessionId', sessionId)

      const response = await fetch('/api/sessions/' + sessionId + '/files', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setSharedFiles((prev) => [...prev, {
          name: filename,
          url: data.url,
          size: blob.size,
        }])
        // Show success feedback
        alert('Screenshot captured and saved!')
      } else {
        alert('Failed to save screenshot')
      }
    } catch (error) {
      console.error('Error capturing screenshot:', error)
      alert('Failed to capture screenshot')
    } finally {
      setCapturingScreenshot(false)
    }
  }, [sessionId])

  // Chat: Send message
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim()) return

    const message = {
      sender: _userId,
      senderRole: _userRole,
      text: messageInput.trim(),
      timestamp: Date.now(),
    }

    try {
      // Broadcast message to channel
      await supabase
        .channel(`chat:${sessionId}`)
        .send({
          type: 'broadcast',
          event: 'message',
          payload: message,
        })

      console.log('[CHAT] Sent message:', message)

      // Clear input
      setMessageInput('')
    } catch (error) {
      console.error('[CHAT] Error sending message:', error)
      alert('Failed to send message. Please try again.')
    }
  }, [messageInput, _userId, _userRole, sessionId, supabase])

  // Task 6: Show preflight panel before joining
  if (showPreflight && !preflightPassed) {
    return (
      <DevicePreflight
        onComplete={() => {
          setPreflightPassed(true)
          setShowPreflight(false)
        }}
        skipPreflight={skipPreflight} // ⚠️ TESTING ONLY - REMOVE BEFORE PRODUCTION
      />
    )
  }

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

      {/* Reconnect Banner */}
      {showReconnectBanner && (
        <div className="absolute inset-x-0 top-20 z-50 mx-4">
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/20 p-4 text-center backdrop-blur">
            <p className="font-semibold text-amber-200">Connection Lost</p>
            <p className="mt-1 text-sm text-amber-300">
              {mechanicPresent ? 'Customer' : 'Mechanic'} disconnected. Waiting for reconnection...
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Retry Connection
            </button>
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
      <div className="absolute left-2 right-2 top-2 z-[60] flex flex-wrap items-center justify-between gap-2 sm:left-4 sm:right-4 sm:top-4">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
          <a
            href={dashboardUrl}
            className="rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-slate-800 sm:px-4 sm:py-2 sm:text-sm"
          >
            ← <span className="hidden sm:inline">Dashboard</span>
          </a>

          {/* ROLE INDICATOR - Shows exactly what role you are assigned */}
          <div className={`rounded-full border-2 px-2 py-1 text-xs font-bold backdrop-blur sm:px-4 sm:py-2 sm:text-sm ${
            _userRole === 'mechanic'
              ? 'border-blue-400 bg-blue-500/20 text-blue-100'
              : 'border-green-400 bg-green-500/20 text-green-100'
          }`}>
            {_userRole === 'mechanic' ? '🔧 Mechanic' : '👤 Customer'}
          </div>

          {/* Debug info (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="hidden rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-xs font-mono text-amber-200 md:block">
              ID: {_userId.slice(0, 8)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {sessionStarted && sessionStartTime && (
            <SessionTimer
              startTime={sessionStartTime}
              durationMinutes={durationMinutes}
              onTimeWarning={handleTimeWarning}
              onTimeUp={handleTimeUp}
            />
          )}

          {/* Leave Session Button - Always visible */}
          <button
            onClick={handleEndSession}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs font-semibold text-red-400 backdrop-blur transition hover:bg-red-500/20 hover:border-red-500/50 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
            title="Leave Session"
          >
            <PhoneOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{sessionStarted ? 'End Session' : 'Leave'}</span>
          </button>

          {/* Sign Out Button */}
          <button
            onClick={async () => {
              if (confirm('Are you sure you want to sign out? This will end your session.')) {
                const supabase = createClient()
                await supabase.auth.signOut()
                window.location.href = _userRole === 'mechanic' ? '/mechanic/login' : '/signup?mode=login'
              }
            }}
            className="rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-slate-700 hover:border-white/20 sm:px-3 sm:py-2 sm:text-sm"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
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
        <VideoView userRole={_userRole} showPip={showPip} />
        <RoomAudioRenderer />

        {/* Connection Quality Indicator - Top Right */}
        {sessionStarted && (
          <div className="absolute right-2 top-2 z-40 sm:right-3 sm:top-3 md:right-4 md:top-4">
            <ConnectionQualityBadge />
          </div>
        )}

        {/* Video Controls - Bottom Bar */}
        {sessionStarted && (
          <div className="absolute bottom-0 left-0 right-0 z-40 border-t border-slate-700/50 bg-slate-900/90 p-2 backdrop-blur sm:p-3 md:p-4">
            <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2 sm:justify-between">
              <div className="hidden text-xs text-slate-300 sm:block sm:text-sm">
                <strong className="text-white">{_planName}</strong>
              </div>

              <VideoControls
                onEndSession={handleEndSession}
                onUploadFile={handleFileUpload}
                onCaptureScreenshot={handleScreenshotCapture}
                capturingScreenshot={capturingScreenshot}
                showChat={showChat}
                onToggleChat={() => setShowChat(!showChat)}
                unreadCount={unreadCount}
                showPip={showPip}
                onTogglePip={() => setShowPip(!showPip)}
              />
            </div>
          </div>
        )}
      </LiveKitRoom>

      {/* Shared Files Sidebar */}
      {sharedFiles.length > 0 && (
        <div className="absolute right-2 top-16 z-40 hidden w-64 rounded-lg border border-slate-700 bg-slate-900/95 p-3 backdrop-blur sm:right-3 sm:top-18 sm:w-56 md:right-4 md:top-20 lg:block lg:w-72 lg:p-4">
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

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l border-slate-700 bg-slate-900 sm:w-96 md:w-[28rem]">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold text-white">Chat</h3>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="rounded p-1 text-slate-400 transition hover:bg-slate-700 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-3 sm:p-4"
          >
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-center text-sm text-slate-400">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, index) => {
                  const isOwn = msg.sender === _userId
                  return (
                    <div
                      key={index}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          isOwn
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-700 text-slate-100'
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-semibold">
                            {isOwn ? 'You' : msg.senderRole === 'mechanic' ? 'Mechanic' : 'Customer'}
                          </span>
                          <span className="text-[10px] opacity-70">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="break-words text-sm">{msg.text}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="border-t border-slate-700 bg-slate-800 p-3 sm:p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                className="rounded-lg bg-blue-500 p-2 text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
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
