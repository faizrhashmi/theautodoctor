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
import { Track } from 'livekit-client'
import {
  Clock, UserPlus, AlertCircle, Video, VideoOff, Mic, MicOff,
  Monitor, MonitorOff, PhoneOff, Upload, X, FileText, Download,
  Maximize2, Minimize2, SwitchCamera, Flashlight, Camera,
  MessageCircle, Send, LogOut, Menu, Eye, EyeOff, FileEdit, Save, Info,
  Settings, Sun, Activity, BarChart3, Pencil, ArrowRight, Circle,
  Eraser, Paintbrush, MousePointer, Repeat2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { DevicePreflight } from '@/components/video/DevicePreflight'
import { SessionCompletionModal } from '@/components/session/SessionCompletionModal'
import { routeFor } from '@/lib/routes'
import { getOrCreateSessionFingerprint } from '@/lib/deviceFingerprint'
import MechanicProfileModal from '@/components/MechanicProfileModal'

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
  mechanicName: string | null
  customerName: string | null
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
  isPaused = false,
  sessionId,
}: {
  startTime: Date
  durationMinutes: number
  onTimeWarning: (minutesLeft: number) => void
  onTimeUp: () => void
  isPaused?: boolean
  sessionId: string
}) {
  // Server-authoritative timer state
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)
  const [serverOffset, setServerOffset] = useState<number>(0) // RTT/2 adjustment
  const [lastSync, setLastSync] = useState<Date>(new Date())
  const [hasWarned5, setHasWarned5] = useState(false)
  const [hasWarned1, setHasWarned1] = useState(false)

  // Server clock params
  const [serverClockParams, setServerClockParams] = useState<{
    started_at: string | null
    is_paused: boolean
    total_paused_ms: number
    last_state_change_at: string | null
  } | null>(null)

  // Fetch server clock on mount and periodically
  const fetchServerClock = useCallback(async () => {
    try {
      const supabase = createClient()
      const fetchStart = Date.now()

      const { data, error } = await supabase.rpc('session_clock_get', {
        p_session_id: sessionId
      })

      const fetchEnd = Date.now()
      const rtt = fetchEnd - fetchStart
      const newOffset = rtt / 2 // Estimate server time offset

      if (error) {
        console.warn('[SERVER TIMER] RPC not available, using fallback timer:', error.message)
        // Fallback: Use local clock with startTime prop
        setServerClockParams({
          started_at: startTime.toISOString(),
          is_paused: isPaused,
          total_paused_ms: 0,
          last_state_change_at: null
        })
        return
      }

      if (data && data.length > 0) {
        const clock = data[0]
        setServerClockParams({
          started_at: clock.started_at,
          is_paused: clock.is_paused,
          total_paused_ms: clock.total_paused_ms,
          last_state_change_at: clock.last_state_change_at
        })
        setServerOffset(newOffset)
        setLastSync(new Date())

        console.log('[SERVER TIMER] Clock synced:', {
          started_at: clock.started_at,
          is_paused: clock.is_paused,
          total_paused_ms: clock.total_paused_ms,
          rtt,
          offset: newOffset
        })
      }
    } catch (err) {
      console.warn('[SERVER TIMER] RPC error, using fallback timer:', err)
      // Fallback: Use local clock with startTime prop
      setServerClockParams({
        started_at: startTime.toISOString(),
        is_paused: isPaused,
        total_paused_ms: 0,
        last_state_change_at: null
      })
    }
  }, [sessionId, startTime, isPaused])

  // Initial fetch and periodic resync every 20 seconds
  useEffect(() => {
    fetchServerClock()
    const resyncInterval = setInterval(fetchServerClock, 20000)
    return () => clearInterval(resyncInterval)
  }, [fetchServerClock])

  // Compute elapsed time from server params every second
  useEffect(() => {
    if (!serverClockParams?.started_at) {
      return // Timer not started yet
    }

    const computeInterval = setInterval(() => {
      const now = Date.now() + serverOffset // Adjust for network delay
      const startedAt = new Date(serverClockParams.started_at!).getTime()
      const totalPausedMs = serverClockParams.total_paused_ms

      // If currently paused, freeze at last state change time
      if (serverClockParams.is_paused && serverClockParams.last_state_change_at) {
        const pausedAt = new Date(serverClockParams.last_state_change_at).getTime()
        const frozenElapsed = Math.floor((pausedAt - startedAt - totalPausedMs) / 1000)
        setElapsedSeconds(Math.max(0, frozenElapsed))
      } else {
        // Derive elapsed from server-authoritative params
        const rawElapsed = now - startedAt
        const netElapsed = rawElapsed - totalPausedMs
        const elapsedSec = Math.floor(netElapsed / 1000)

        setElapsedSeconds(prev => {
          const diff = Math.abs(elapsedSec - prev)

          // Drift correction: snap if >1.5s, ease otherwise
          if (diff > 1.5) {
            console.log(`[SERVER TIMER] Snap correction: ${prev}s → ${elapsedSec}s (drift: ${diff}s)`)
            return Math.max(0, elapsedSec)
          } else if (diff > 0.1) {
            // Ease towards server time
            const eased = prev + Math.sign(elapsedSec - prev) * 0.5
            return Math.max(0, Math.floor(eased))
          }

          return Math.max(0, elapsedSec)
        })
      }

      // Check warnings and time up
      const remaining = Math.max(0, durationMinutes * 60 - elapsedSeconds)
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

    return () => clearInterval(computeInterval)
  }, [serverClockParams, serverOffset, durationMinutes, elapsedSeconds, hasWarned5, hasWarned1, onTimeWarning, onTimeUp])

  // Resync on participant changes (passed as isPaused prop)
  useEffect(() => {
    if (serverClockParams) {
      console.log('[SERVER TIMER] Participant change detected, resyncing...')
      fetchServerClock()
    }
  }, [isPaused, fetchServerClock])

  // Calculate time remaining
  const timeLeft = Math.max(0, durationMinutes * 60 - elapsedSeconds)
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  const isWarning = minutes < 5
  const isDanger = minutes < 1

  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
      isPaused ? 'bg-gray-500/20 text-gray-300' :
      isDanger ? 'bg-red-500/20 text-red-200' :
      isWarning ? 'bg-amber-500/20 text-amber-200' :
      'bg-slate-800/80 text-slate-200'
    }`}>
      <Clock className="h-4 w-4" />
      <span className="font-mono text-sm font-semibold">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        {isPaused && <span className="ml-2 text-xs">(PAUSED)</span>}
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
  swapView,
  onToggleSwapView,
  userRole,
  showNotes,
  onToggleNotes,
  notesChanged,
  videoQuality,
  onVideoQualityChange,
  showBrightnessControl,
  onToggleBrightnessControl,
  showAudioLevels,
  onToggleAudioLevels,
  showNetworkStats,
  onToggleNetworkStats,
  showAnnotations,
  onToggleAnnotations,
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
  swapView: boolean
  onToggleSwapView: () => void
  userRole: string
  showNotes?: boolean
  onToggleNotes?: () => void
  notesChanged?: boolean
  videoQuality: 'auto' | 'high' | 'medium' | 'low'
  onVideoQualityChange: (quality: 'auto' | 'high' | 'medium' | 'low') => void
  showBrightnessControl: boolean
  onToggleBrightnessControl: () => void
  showAudioLevels: boolean
  onToggleAudioLevels: () => void
  showNetworkStats: boolean
  onToggleNetworkStats: () => void
  showAnnotations: boolean
  onToggleAnnotations: () => void
}) {
  const { isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled, localParticipant } = useLocalParticipant()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0)
  const [isFlashlightOn, setIsFlashlightOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [showQualityDropdown, setShowQualityDropdown] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qualityDropdownRef = useRef<HTMLDivElement>(null)

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

  // Check if current camera supports torch (flashlight)
  // This is checked whenever camera changes or session starts
  const checkCurrentCameraTorch = useCallback(async () => {
    try {
      const videoPublication = localParticipant.getTrackPublication(Track.Source.Camera)
      if (!videoPublication || !videoPublication.track) {
        console.log('[VideoControls] No camera track available for torch check')
        setTorchSupported(false)
        return
      }

      const mediaStreamTrack = videoPublication.track.mediaStreamTrack
      if (!mediaStreamTrack) {
        console.log('[VideoControls] No MediaStreamTrack available for torch check')
        setTorchSupported(false)
        return
      }

      const capabilities = mediaStreamTrack.getCapabilities()
      // @ts-ignore - torch is not in TypeScript types yet
      const hasTorch = !!capabilities.torch

      setTorchSupported(hasTorch)
      console.log('[VideoControls] Torch supported on current camera:', hasTorch)

      // If torch was on but new camera doesn't support it, turn it off
      if (!hasTorch && isFlashlightOn) {
        setIsFlashlightOn(false)
      }
    } catch (error) {
      console.log('[VideoControls] Error checking torch support:', error)
      setTorchSupported(false)
    }
  }, [localParticipant, isFlashlightOn])

  // Check torch support when camera is ready and when camera changes
  useEffect(() => {
    if (isCameraEnabled) {
      // Delay to ensure track is published
      const timer = setTimeout(() => {
        checkCurrentCameraTorch()
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setTorchSupported(false)
      setIsFlashlightOn(false)
    }
  }, [isCameraEnabled, currentCameraIndex, checkCurrentCameraTorch])

  // Close quality dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (qualityDropdownRef.current && !qualityDropdownRef.current.contains(event.target as Node)) {
        setShowQualityDropdown(false)
      }
    }

    if (showQualityDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showQualityDropdown])

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
      alert('Only one camera detected. Cannot switch cameras.')
      return
    }

    try {
      console.log('[VideoControls] Flipping camera, current index:', currentCameraIndex)

      // Turn off flashlight before switching (if it's on)
      if (isFlashlightOn) {
        console.log('[VideoControls] Turning off flashlight before camera switch')
        setIsFlashlightOn(false)
      }

      // Cycle to next camera
      const nextIndex = (currentCameraIndex + 1) % availableCameras.length
      const nextCamera = availableCameras[nextIndex]

      console.log('[VideoControls] Switching to camera:', nextCamera.label)

      // Switch camera by restarting the camera track with new deviceId
      const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera)
      if (cameraTrack?.track) {
        await cameraTrack.track.restartTrack({
          deviceId: nextCamera.deviceId
        })
      } else {
        throw new Error('No camera track found')
      }

      setCurrentCameraIndex(nextIndex)
      console.log('[VideoControls] Camera flipped successfully to:', nextCamera.label)

      // The torch support check will automatically run via useEffect
    } catch (error: any) {
      console.error('[VideoControls] Failed to flip camera:', error)
      alert(`Failed to switch camera: ${error.message || 'Please try again'}`)
    }
  }, [localParticipant, availableCameras, currentCameraIndex, isFlashlightOn])

  const toggleFlashlight = useCallback(async () => {
    if (!torchSupported) {
      console.log('[VideoControls] Torch not supported on this device')
      alert('Flashlight is not supported on this device')
      return
    }

    try {
      console.log('[VideoControls] Toggling flashlight, current state:', isFlashlightOn)

      // Get the current video track publication from LiveKit
      const videoPublication = localParticipant.getTrackPublication(Track.Source.Camera)
      if (!videoPublication || !videoPublication.track) {
        console.error('[VideoControls] No camera track publication available')
        alert('Camera track not available. Please ensure your camera is on.')
        return
      }

      // Access the underlying MediaStreamTrack
      const videoTrack = videoPublication.track
      const mediaStreamTrack = videoTrack.mediaStreamTrack

      if (!mediaStreamTrack) {
        console.error('[VideoControls] No MediaStreamTrack available')
        alert('Cannot access camera track')
        return
      }

      console.log('[VideoControls] MediaStreamTrack found:', mediaStreamTrack.label)

      // Check capabilities to confirm torch is supported
      const capabilities = mediaStreamTrack.getCapabilities()
      // @ts-ignore - torch is not in TypeScript types yet
      if (!capabilities.torch) {
        console.error('[VideoControls] Torch capability not available on this track')
        alert('Flashlight not available on current camera. Try switching to rear camera.')
        return
      }

      // Apply torch constraint
      // @ts-ignore - torch is not in TypeScript types yet
      await mediaStreamTrack.applyConstraints({
        advanced: [{ torch: !isFlashlightOn }]
      })

      setIsFlashlightOn(!isFlashlightOn)
      console.log('[VideoControls] Flashlight toggled successfully to:', !isFlashlightOn)
    } catch (error: any) {
      console.error('[VideoControls] Failed to toggle flashlight:', error)
      alert(`Failed to toggle flashlight: ${error.message || 'Unknown error'}`)
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

      {/* Chat Toggle - Higher z-index to stay above chat window */}
      <button
        onClick={onToggleChat}
        className={`relative z-[60] rounded-lg p-2 transition sm:p-3 ${
          showChat
            ? 'bg-blue-500/80 text-white hover:bg-blue-600 ring-2 ring-blue-400/50'
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

      {/* Notes Toggle (mechanic only) */}
      {userRole === 'mechanic' && onToggleNotes && (
        <button
          onClick={onToggleNotes}
          className={`relative z-[60] rounded-lg p-2 transition sm:p-3 ${
            showNotes
              ? 'bg-purple-500/80 text-white hover:bg-purple-600 ring-2 ring-purple-400/50'
              : 'bg-slate-700/80 text-white hover:bg-slate-600'
          }`}
          title={showNotes ? 'Close notes' : 'Open notes'}
        >
          <FileEdit className="h-4 w-4 sm:h-5 sm:w-5" />
          {notesChanged && !showNotes && (
            <span className="absolute -right-1 -top-1 flex h-2 w-2 rounded-full bg-orange-500"></span>
          )}
        </button>
      )}

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

      {/* Swap View Toggle */}
      <button
        onClick={onToggleSwapView}
        className={`rounded-lg p-2 transition sm:p-3 ${
          swapView
            ? 'bg-purple-500/80 text-white hover:bg-purple-600 ring-2 ring-purple-400/50'
            : 'bg-slate-700/80 text-white hover:bg-slate-600'
        }`}
        title={swapView ? 'Show their video as main' : 'Show your video as main'}
      >
        <Repeat2 className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      {/* Fullscreen Toggle */}
      <button
        onClick={toggleFullscreen}
        className="rounded-lg bg-slate-700/80 p-2 text-white transition hover:bg-slate-600 sm:p-3"
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />}
      </button>

      {/* Video Quality Selector */}
      <div className="relative" ref={qualityDropdownRef}>
        <button
          onClick={() => setShowQualityDropdown(!showQualityDropdown)}
          className={`rounded-lg p-2 transition sm:p-3 ${
            showQualityDropdown
              ? 'bg-blue-500/80 text-white hover:bg-blue-600 ring-2 ring-blue-400/50'
              : 'bg-slate-700/80 text-white hover:bg-slate-600'
          }`}
          title="Video quality"
        >
          <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {showQualityDropdown && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 rounded-lg border border-slate-600 bg-slate-800/95 p-2 shadow-xl backdrop-blur-sm">
            <div className="mb-2 px-2 py-1 text-xs font-semibold text-slate-400">VIDEO QUALITY</div>
            {(['auto', 'high', 'medium', 'low'] as const).map((quality) => (
              <button
                key={quality}
                onClick={() => {
                  onVideoQualityChange(quality)
                  setShowQualityDropdown(false)
                }}
                className={`w-full rounded px-3 py-2 text-left text-sm transition ${
                  videoQuality === quality
                    ? 'bg-blue-500/20 text-blue-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                {quality === 'auto' && '🔄 Auto'}
                {quality === 'high' && '⚡ High (720p)'}
                {quality === 'medium' && '📊 Medium (480p)'}
                {quality === 'low' && '📱 Low (360p)'}
              </button>
            ))}

            <div className="my-2 border-t border-slate-600"></div>

            <button
              onClick={() => {
                onToggleBrightnessControl()
                setShowQualityDropdown(false)
              }}
              className={`w-full rounded px-3 py-2 text-left text-sm transition flex items-center gap-2 ${
                showBrightnessControl
                  ? 'bg-orange-500/20 text-orange-300 font-semibold'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <Sun className="h-4 w-4" />
              Brightness
            </button>

            <button
              onClick={() => {
                onToggleAudioLevels()
                setShowQualityDropdown(false)
              }}
              className={`w-full rounded px-3 py-2 text-left text-sm transition flex items-center gap-2 ${
                showAudioLevels
                  ? 'bg-green-500/20 text-green-300 font-semibold'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <Activity className="h-4 w-4" />
              Audio Levels
            </button>

            <button
              onClick={() => {
                onToggleNetworkStats()
                setShowQualityDropdown(false)
              }}
              className={`w-full rounded px-3 py-2 text-left text-sm transition flex items-center gap-2 ${
                showNetworkStats
                  ? 'bg-purple-500/20 text-purple-300 font-semibold'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Network Stats
            </button>

            {userRole === 'mechanic' && (
              <button
                onClick={() => {
                  onToggleAnnotations()
                  setShowQualityDropdown(false)
                }}
                className={`w-full rounded px-3 py-2 text-left text-sm transition flex items-center gap-2 ${
                  showAnnotations
                    ? 'bg-red-500/20 text-red-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                <Pencil className="h-4 w-4" />
                Drawing Tools
              </button>
            )}
          </div>
        )}
      </div>

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

// Draggable Picture-in-Picture Component
function DraggablePip({ trackRef, label }: { trackRef: any, label: string }) {
  const pipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ x: number, y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Initialize position at top-right on mount
  useEffect(() => {
    if (position === null && pipRef.current) {
      const pipWidth = pipRef.current.offsetWidth
      setPosition({
        x: window.innerWidth - pipWidth - 12, // 12px from right edge
        y: 80 // 80px from top
      })
    }
  }, [position])

  // Handle drag start (mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  // Handle drag start (touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    const touch = e.touches[0]
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    })
  }

  // Handle drag move (mouse)
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!pipRef.current) return

      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      // Keep PIP within bounds
      const maxX = window.innerWidth - pipRef.current.offsetWidth
      const maxY = window.innerHeight - pipRef.current.offsetHeight

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])

  // Handle drag move (touch)
  useEffect(() => {
    if (!isDragging) return

    const handleTouchMove = (e: TouchEvent) => {
      if (!pipRef.current) return

      const touch = e.touches[0]
      const newX = touch.clientX - dragStart.x
      const newY = touch.clientY - dragStart.y

      // Keep PIP within bounds
      const maxX = window.innerWidth - pipRef.current.offsetWidth
      const maxY = window.innerHeight - pipRef.current.offsetHeight

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    }

    const handleTouchEnd = () => {
      setIsDragging(false)
    }

    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, dragStart])

  // Don't render until position is initialized
  if (!position) {
    return (
      <div
        ref={pipRef}
        className="absolute right-3 top-20 z-50 h-24 w-32 overflow-hidden rounded-lg border-2 border-slate-700 bg-slate-900 shadow-2xl sm:h-32 sm:w-40 md:h-36 md:w-48 lg:h-40 lg:w-56 opacity-0"
      >
        <VideoTrack trackRef={trackRef} className="h-full w-full object-contain" />
      </div>
    )
  }

  return (
    <div
      ref={pipRef}
      className={`absolute z-50 h-24 w-32 overflow-hidden rounded-lg border-2 bg-slate-900 shadow-2xl transition-shadow sm:h-32 sm:w-40 md:h-36 md:w-48 lg:h-40 lg:w-56 ${
        isDragging ? 'cursor-grabbing border-blue-500 shadow-blue-500/50' : 'cursor-grab border-slate-700 hover:border-slate-600'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none', // Prevent default touch actions during drag
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <VideoTrack
        trackRef={trackRef}
        className="h-full w-full object-contain pointer-events-none"
      />
      <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white sm:bottom-2 sm:left-2 sm:px-2 sm:py-1 sm:text-xs pointer-events-none">
        {label}
      </div>
    </div>
  )
}

function VideoView({
  userRole,
  showPip = true,
  swapView = false,
  mechanicName,
  customerName,
}: {
  userRole: 'mechanic' | 'customer'
  showPip?: boolean
  swapView?: boolean
  mechanicName?: string | null
  customerName?: string | null
}) {
  const cameraTracks = useTracks([Track.Source.Camera])
  const screenTracks = useTracks([Track.Source.ScreenShare])

  const localCameraTrack = cameraTracks.find((t) => t.participant.isLocal)
  const remoteCameraTrack = cameraTracks.find((t) => !t.participant.isLocal)
  const screenShareTrack = screenTracks.find((t) => t.publication.isSubscribed)

  // Determine main and PiP tracks based on swapView state
  // Default: main = remote camera, pip = local camera
  // Swapped: main = local camera, pip = remote camera
  // Screen share always takes precedence as main
  let mainTrack, pipTrack

  if (screenShareTrack) {
    // Screen share always main, local camera in PiP
    mainTrack = screenShareTrack
    pipTrack = localCameraTrack
  } else if (swapView) {
    // Swapped: your camera is main, their camera is PiP
    mainTrack = localCameraTrack
    pipTrack = remoteCameraTrack
  } else {
    // Normal: their camera is main, your camera is PiP
    mainTrack = remoteCameraTrack
    pipTrack = localCameraTrack
  }

  console.log('[VideoView] Tracks detected:', {
    hasLocal: !!localCameraTrack,
    hasRemote: !!remoteCameraTrack,
    hasScreenShare: !!screenShareTrack,
    mainIsLocal: mainTrack?.participant.isLocal,
    pipIsLocal: pipTrack?.participant.isLocal,
  })

  return (
    <div className="relative h-full w-full">
      {/* Main Video - Full frame visible on all screen sizes (no cropping) */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
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
                {localCameraTrack ? `Waiting for ${userRole === 'mechanic' ? (customerName || 'customer') : (mechanicName || 'mechanic')}...` : 'Turn on your camera to start'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Picture-in-Picture (Other person's camera) - Draggable */}
      {pipTrack && showPip && (
        <DraggablePip
          trackRef={pipTrack}
          label={pipTrack.participant.isLocal ? 'You' : (userRole === 'mechanic' ? (customerName || 'Customer') : (mechanicName || 'Mechanic'))}
        />
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
  mechanicName: _mechanicName,
  customerName: _customerName,
  dashboardUrl,
}: VideoSessionClientProps) {
  const [mechanicPresent, setMechanicPresent] = useState(false)
  const [customerPresent, setCustomerPresent] = useState(false)
  // Track whether parties have ever joined (to distinguish "never joined" from "disconnected")
  const [mechanicEverJoined, setMechanicEverJoined] = useState(false)
  const [customerEverJoined, setCustomerEverJoined] = useState(false)
  // Initialize from database: only mark as started if session status is 'live'
  // Don't initialize for scheduled/pending sessions even if they have started_at
  const [sessionStarted, setSessionStarted] = useState(_status === 'live')
  const [mechanicName, setMechanicName] = useState<string | null>(_mechanicName)
  const [customerName, setCustomerName] = useState<string | null>(_customerName)
  // Initialize timer only for already-live sessions (e.g., page reload during active session)
  // Don't initialize for scheduled/pending sessions
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(
    _status === 'live' && _startedAt ? new Date(_startedAt) : null
  )
  // Timer pause state - pauses when one party disconnects
  const [isTimerPaused, setIsTimerPaused] = useState(false)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [endingSession, setEndingSession] = useState(false)
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
  const [messages, setMessages] = useState<Array<{ sender: string; senderRole: string; text: string; timestamp: number; status?: 'sending' | 'sent' | 'delivered' | 'read' }>>([])
  const [messageInput, setMessageInput] = useState('')
  const [unreadCount, setUnreadCount] = useState(0) // Unread message count
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [showPip, setShowPip] = useState(true) // PIP visibility toggle
  const [swapView, setSwapView] = useState(false) // Swap main/PiP views
  const [isTyping, setIsTyping] = useState(false) // Other person typing indicator
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const broadcastChannelRef = useRef<any>(null) // Store channel for broadcasting

  // Notes (mechanic only)
  const [showNotes, setShowNotes] = useState(false) // Notes panel visibility
  const [notes, setNotes] = useState('') // Notes content
  const [notesInitialValue, setNotesInitialValue] = useState('') // Track initial value to detect changes
  const [savingNotes, setSavingNotes] = useState(false)
  const notesInputRef = useRef<HTMLTextAreaElement>(null)

  // P0-2 FIX: Token refresh state
  const [currentToken, setCurrentToken] = useState(token)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Session Completion Modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completionSessionData, setCompletionSessionData] = useState<any>(null)
  // Mechanic Profile Modal state
  const [showMechanicProfileModal, setShowMechanicProfileModal] = useState(false)
  // Session ended notification state
  const [sessionEnded, setSessionEnded] = useState(false)
  const [sessionEndedBy, setSessionEndedBy] = useState<'customer' | 'mechanic' | 'timer' | null>(null)

  // LiveKit Room connection state - disconnect when session ends
  const [isRoomConnected, setIsRoomConnected] = useState(true)

  // Device enforcement state
  const [deviceKicked, setDeviceKicked] = useState(false)
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null)

  // ⭐ NEW: Enhanced video session features
  const [videoQuality, setVideoQuality] = useState<'auto' | 'high' | 'medium' | 'low'>('auto')
  const [showAnnotations, setShowAnnotations] = useState(false)
  const [annotationMode, setAnnotationMode] = useState<'draw' | 'arrow' | 'circle' | 'laser' | null>(null)
  const [annotations, setAnnotations] = useState<Array<any>>([])
  const [brightness, setBrightness] = useState(100) // 0-200, 100 = normal
  const [contrast, setContrast] = useState(100) // 0-200, 100 = normal
  const [showBrightnessControl, setShowBrightnessControl] = useState(false)
  const [showAudioLevels, setShowAudioLevels] = useState(false)
  const [localAudioLevel, setLocalAudioLevel] = useState(0) // 0-100
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0) // 0-100
  const [showNetworkStats, setShowNetworkStats] = useState(false)
  const [networkStats, setNetworkStats] = useState<{
    latency: number | null
    jitter: number | null
    packetLoss: number | null
    bandwidth: number | null
  }>({
    latency: null,
    jitter: null,
    packetLoss: null,
    bandwidth: null,
  })

  // Debug: Track modal state changes
  useEffect(() => {
    console.log('[VIDEO] Modal state changed:', {
      showCompletionModal,
      hasData: !!completionSessionData,
      dataId: completionSessionData?.id
    })
  }, [showCompletionModal, completionSessionData])

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
    console.log('[VIDEO SECURITY L2] Checking initial session status:', _status)
    if (_status === 'completed' || _status === 'cancelled') {
      console.log('[VIDEO SECURITY L2] ⚠️ Session already ended, redirecting...')
      window.location.href = dashboardUrl
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount, not on status changes

  // Helper: Fetch session data and show completion modal
  const fetchAndShowCompletionModal = useCallback(async () => {
    console.log('[VIDEO] Fetching session data for completion modal...', { sessionId, userRole: _userRole })

    // Helper function to attempt fetching session data
    const attemptFetch = async (attemptNumber: number, delayMs: number): Promise<boolean> => {
      try {
        console.log(`[VIDEO] Fetch attempt ${attemptNumber}/${4} (${delayMs}ms delay)`)

        // Fetch from role-specific API
        const apiPath = _userRole === 'customer' ? '/api/customer/sessions' : '/api/mechanic/sessions'
        const response = await fetch(apiPath)

        console.log(`[VIDEO] Attempt ${attemptNumber} - API response status:`, response.status)

        if (response.ok) {
          const data = await response.json()
          console.log(`[VIDEO] Attempt ${attemptNumber} - Sessions received:`, {
            count: data.sessions?.length,
            sessionIds: data.sessions?.map((s: any) => s.id).slice(0, 5)
          })

          const session = data.sessions?.find((s: any) => s.id === sessionId)

          if (session) {
            console.log(`[VIDEO] ✅ Session found on attempt ${attemptNumber}!`, {
              id: session.id,
              status: session.status,
              mechanic_name: session.mechanic_name
            })
            setCompletionSessionData(session)
            setShowCompletionModal(true)
            return true
          } else {
            console.warn(`[VIDEO] ⚠️ Session ${sessionId} not found in response on attempt ${attemptNumber}`)
            return false
          }
        } else {
          console.error(`[VIDEO] Attempt ${attemptNumber} - API error:`, response.status)
          const errorText = await response.text()
          console.error(`[VIDEO] Error response:`, errorText)
          return false
        }
      } catch (error) {
        console.error(`[VIDEO] Attempt ${attemptNumber} - Exception:`, error)
        return false
      }
    }

    try {
      // Try immediately (attempt 1)
      const success1 = await attemptFetch(1, 0)
      if (success1) return

      // Retry after 1.5 seconds (attempt 2)
      await new Promise(resolve => setTimeout(resolve, 1500))
      const success2 = await attemptFetch(2, 1500)
      if (success2) return

      // Retry after 3 seconds total (attempt 3)
      await new Promise(resolve => setTimeout(resolve, 1500))
      const success3 = await attemptFetch(3, 3000)
      if (success3) return

      // Final retry after 5 seconds total (attempt 4)
      await new Promise(resolve => setTimeout(resolve, 2000))
      const success4 = await attemptFetch(4, 5000)
      if (success4) return

      // All retries exhausted - redirect to dashboard
      console.error('[VIDEO] ❌ Session not found after 4 attempts over 5 seconds')
      console.error('[VIDEO] This indicates a database replication issue or auth problem')
      console.error('[VIDEO] Redirecting to dashboard as fallback...')
      window.location.href = dashboardUrl
    } catch (error) {
      console.error('[VIDEO] Fatal error in fetchAndShowCompletionModal:', error)
      window.location.href = dashboardUrl
    }
  }, [sessionId, dashboardUrl, _userRole])

  // 🔒 SECURITY LAYER 3: Real-time database listener for status changes
  // Shows completion modal for normal endings, redirects for external cancellations
  useEffect(() => {
    console.log('[VIDEO SECURITY L3] Setting up real-time status monitor')

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
        async (payload) => {
          console.log('[VIDEO SECURITY L3] 🔄 Session status changed:', payload)
          const newStatus = payload.new?.status

          if (newStatus === 'cancelled' || newStatus === 'completed') {
            // Show completion modal for both completed and cancelled sessions
            // This handles both normal user-initiated ends (which may result in 'cancelled'
            // if session wasn't in 'live' status) and admin/external cancellations
            console.log(`[VIDEO SECURITY L3] ✅ Session ${newStatus}, showing modal...`)

            // Disconnect from LiveKit room immediately
            setIsRoomConnected(false)

            await fetchAndShowCompletionModal()
          }
        }
      )
      .subscribe((status) => {
        console.log('[VIDEO SECURITY L3] Database subscription status:', status)
      })

    return () => {
      console.log('[VIDEO SECURITY L3] Cleaning up status monitor')
      supabase.removeChannel(statusChannel)
    }
  }, [sessionId, dashboardUrl, supabase, fetchAndShowCompletionModal])

  // 🔒 SECURITY LAYER 4: Single-device enforcement
  // Generate device fingerprint on mount
  useEffect(() => {
    const fingerprint = getOrCreateSessionFingerprint()
    setDeviceFingerprint(fingerprint)
    console.log('[VIDEO DEVICE] Device fingerprint:', fingerprint)
  }, [])

  // Subscribe to session_devices table for device conflicts
  useEffect(() => {
    if (!deviceFingerprint || !_userId) return

    console.log('[VIDEO DEVICE] Setting up device conflict monitor')

    const deviceChannel = supabase
      .channel(`session-devices:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_devices',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          console.log('[VIDEO DEVICE] 🔄 New device detected:', payload)
          const newDevice = payload.new

          // Check if this is a different device for the same user
          if (newDevice.user_id === _userId && newDevice.device_fingerprint !== deviceFingerprint) {
            console.log('[VIDEO DEVICE] ⚠️ CONFLICT: Another device joined for this user!')
            console.log('[VIDEO DEVICE] Current device:', deviceFingerprint)
            console.log('[VIDEO DEVICE] New device:', newDevice.device_fingerprint)

            // Disconnect from LiveKit room immediately
            setIsRoomConnected(false)
            setDeviceKicked(true)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_devices',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          console.log('[VIDEO DEVICE] Device updated:', payload)
          const updatedDevice = payload.new

          // Check if another device was registered for same user (last_seen_at updated)
          if (updatedDevice.user_id === _userId &&
              updatedDevice.device_fingerprint !== deviceFingerprint &&
              updatedDevice.last_seen_at) {
            console.log('[VIDEO DEVICE] ⚠️ CONFLICT: Another device is active for this user!')

            // Disconnect from LiveKit room immediately
            setIsRoomConnected(false)
            setDeviceKicked(true)
          }
        }
      )
      .subscribe((status) => {
        console.log('[VIDEO DEVICE] Device monitor subscription status:', status)
      })

    return () => {
      console.log('[VIDEO DEVICE] Cleaning up device monitor')
      supabase.removeChannel(deviceChannel)
    }
  }, [sessionId, deviceFingerprint, _userId, supabase])

  // PHASE 3C: Listen for session end via postgres_changes (more reliable on Render)
  useEffect(() => {
    console.log('[VIDEO] Setting up postgres_changes listener for session end')

    // Handler for when session ends
    const handleSessionEnd = async (endedBy?: string) => {
      console.log('[VIDEO] 📡 Session ended, endedBy:', endedBy)

      // Disconnect from LiveKit room immediately
      console.log('[VIDEO] 📡 Disconnecting from LiveKit room...')
      setIsRoomConnected(false)

      // Clear all annotations
      setAnnotations([])
      setShowAnnotations(false)
      setAnnotationMode(null)

      // Show notification first
      setSessionEnded(true)
      setSessionEndedBy(endedBy || 'Other participant')

      // Show modal immediately (no delay)
      console.log('[VIDEO] 📡 Session ended, showing completion modal immediately...')
      await fetchAndShowCompletionModal()
      console.log('[VIDEO] 📡 Modal fetch completed')
    }

    // postgres_changes listener for session status changes
    const statusChannel = supabase
      .channel(`session-status-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        async (payload) => {
          console.log('[VIDEO] Session status change detected:', payload)
          const newRecord = payload.new as any
          if (newRecord?.status === 'completed' || newRecord?.status === 'cancelled') {
            await handleSessionEnd(newRecord?.metadata?.ended_by)
          }
        }
      )
      .subscribe((status) => {
        console.log('[VIDEO] postgres_changes subscription status:', status)
      })

    // Polling backup - check session status every 10 seconds
    const pollingInterval = setInterval(async () => {
      try {
        const { data: session } = await supabase
          .from('sessions')
          .select('status, metadata')
          .eq('id', sessionId)
          .single()

        if (session && (session.status === 'completed' || session.status === 'cancelled')) {
          console.log('[VIDEO] Polling detected session end:', session.status)
          clearInterval(pollingInterval)
          await handleSessionEnd(session.metadata?.ended_by)
        }
      } catch (error) {
        console.error('[VIDEO] Error polling session status:', error)
      }
    }, 10000) // Poll every 10 seconds

    // Keep annotations/extensions broadcast channel (peer-to-peer communication)
    const channel = supabase
      .channel(`session:${sessionId}`, {
        config: {
          broadcast: { self: false }, // Don't receive own broadcasts
        },
      })
      .on('broadcast', { event: 'annotation' }, (payload) => {
        console.log('[VIDEO] 📡 Received annotation:', payload)
        const { annotation, sender } = payload.payload

        // Add annotation from other participant
        if (sender !== _userId && annotation) {
          setAnnotations(prev => [...prev, annotation])
        }
      })
      .on('broadcast', { event: 'annotation:clear' }, (payload) => {
        console.log('[VIDEO] 📡 Received clear annotations')
        // Clear all annotations
        setAnnotations([])
      })
      .on('broadcast', { event: 'session:extended' }, (payload) => {
        console.log('[VIDEO] Session extended:', payload)
        const { extensionMinutes, newDuration } = payload.payload

        // Show notification (non-blocking, matching chat behavior)
        const toastDiv = document.createElement('div')
        toastDiv.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #10B981;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          z-index: 99999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `
        toastDiv.textContent = `⏱️ Session extended by ${extensionMinutes} minutes!`
        document.body.appendChild(toastDiv)

        setTimeout(() => {
          toastDiv.style.transition = 'opacity 0.3s'
          toastDiv.style.opacity = '0'
          setTimeout(() => document.body.removeChild(toastDiv), 300)
        }, 3500)

        // Update duration state - SessionTimer will automatically recalculate
        setExtendedDuration(newDuration)

        console.log(`[VIDEO] Duration updated: ${newDuration} minutes`)
      })
      .subscribe((status) => {
        console.log('[VIDEO] Broadcast subscription status:', status)
      })

    // Store channel in ref for broadcasting from other useEffects
    broadcastChannelRef.current = channel

    return () => {
      console.log('[VIDEO] Cleaning up subscriptions')
      clearInterval(pollingInterval)
      supabase.removeChannel(statusChannel)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, dashboardUrl, supabase])

  // P0-2 FIX: Token auto-refresh at T-10m (50 minutes after initial token)
  useEffect(() => {
    const REFRESH_DELAY = 50 * 60 * 1000 // 50 minutes in milliseconds

    const refreshToken = async () => {
      try {
        console.log('[TOKEN-REFRESH] Refreshing LiveKit token...')

        const roomName = `session-${sessionId}`
        const identity = _userRole === 'mechanic' ? `mechanic-${_userId}` : `customer-${_userId}`

        const response = await fetch('/api/livekit/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room: roomName,
            identity: identity,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to refresh token')
        }

        const data = await response.json()
        setCurrentToken(data.token)
        console.log('[TOKEN-REFRESH] Token refreshed successfully, expires in', data.expiresIn, 'seconds')

        // Schedule next refresh at T-10m of the new token
        refreshTimerRef.current = setTimeout(refreshToken, REFRESH_DELAY)
      } catch (error) {
        console.error('[TOKEN-REFRESH] Failed to refresh token:', error)
        // Don't retry automatically to avoid infinite loop
        // LiveKit will handle disconnection gracefully when token expires
      }
    }

    // Schedule first refresh at T-10m
    console.log('[TOKEN-REFRESH] Scheduling token refresh in 50 minutes')
    refreshTimerRef.current = setTimeout(refreshToken, REFRESH_DELAY)

    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        console.log('[TOKEN-REFRESH] Clearing refresh timer')
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [sessionId, _userId, _userRole])

  // Task 6: Monitor for disconnections and pause/resume timer
  useEffect(() => {
    // Only show reconnect banner if someone who previously joined has now left (true disconnect)
    // Don't show for people who never joined in the first place
    const mechanicDisconnected = mechanicEverJoined && !mechanicPresent
    const customerDisconnected = customerEverJoined && !customerPresent

    if (sessionStarted && (mechanicDisconnected || customerDisconnected)) {
      setShowReconnectBanner(true)

      // Pause timer if session has started and one party disconnects
      if (sessionStartTime && !isTimerPaused) {
        console.log('[VIDEO] One party disconnected - Pausing timer')
        setIsTimerPaused(true)
      }
    } else if (sessionStarted && mechanicPresent && customerPresent) {
      setShowReconnectBanner(false)

      // Resume timer if both parties are back
      if (isTimerPaused) {
        console.log('[VIDEO] Both parties reconnected - Resuming timer')
        setIsTimerPaused(false)
      }
    }
  }, [mechanicPresent, customerPresent, mechanicEverJoined, customerEverJoined, sessionStarted, sessionStartTime, isTimerPaused])

  // CRITICAL FIX: On page load/refresh, if session is 'live' but both parties aren't present, pause timer
  // This handles the case where someone refreshes during an active session
  useEffect(() => {
    // Only run this check if session has a start time (i.e., was previously started)
    if (sessionStartTime && sessionStarted) {
      const bothPresent = mechanicPresent && customerPresent

      // If not both present and timer is running, pause it
      if (!bothPresent && !isTimerPaused) {
        console.log('[VIDEO] Page loaded with live session but not both parties present - Pausing timer')
        setIsTimerPaused(true)
      }
    }
  }, [sessionStartTime, sessionStarted, mechanicPresent, customerPresent, isTimerPaused])

  // Chat: Subscribe to realtime messages and typing indicators
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${sessionId}`, {
        config: {
          broadcast: { self: true }, // ✅ FIX: Receive own messages so sender can see them
        },
      })
      .on('broadcast', { event: 'message' }, (payload) => {
        const message = payload.payload
        console.log('[CHAT] Received message:', message)

        // Deduplicate: only add if not already in messages (prevents double-add from optimistic update)
        setMessages((prev) => {
          const exists = prev.some((m) => m.timestamp === message.timestamp && m.sender === message.sender)
          if (exists) {
            // Update status if message already exists (optimistic -> delivered)
            return prev.map((m) =>
              m.timestamp === message.timestamp && m.sender === message.sender
                ? { ...m, status: 'delivered' }
                : m
            )
          }
          return [...prev, { ...message, status: 'delivered' }]
        })

        // Increment unread count if chat is closed and message is from other person
        if (!showChat && message.sender !== _userId) {
          setUnreadCount((prev) => prev + 1)
        }

        // Play notification sound (subtle)
        if (message.sender !== _userId) {
          try {
            const audio = new Audio('/sounds/message-pop.mp3')
            audio.volume = 0.3
            audio.play().catch(() => {})
          } catch (e) {
            // Silently fail if sound not available
          }
        }
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { sender, typing } = payload.payload
        console.log('[CHAT] Typing indicator:', sender, typing)

        if (sender !== _userId) {
          setIsTyping(typing)

          // Auto-hide typing indicator after 3 seconds
          if (typing && typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
          }
          if (typing) {
            typingTimeoutRef.current = setTimeout(() => {
              setIsTyping(false)
            }, 3000)
          }
        }
      })
      .subscribe()

    console.log('[CHAT] Subscribed to chat channel:', sessionId)

    return () => {
      console.log('[CHAT] Unsubscribing from chat channel')
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
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

  // Load existing notes (mechanic only)
  useEffect(() => {
    if (_userRole === 'mechanic' && sessionStarted) {
      const loadNotes = async () => {
        try {
          const response = await fetch(`/api/mechanic/sessions/${sessionId}/notes`)
          if (response.ok) {
            const data = await response.json()
            setNotes(data.notes || '')
            setNotesInitialValue(data.notes || '')
          }
        } catch (error) {
          console.error('Error loading notes:', error)
        }
      }
      loadNotes()
    }
  }, [sessionId, _userRole, sessionStarted])

  const handleMechanicJoined = useCallback(() => {
    console.log('[VIDEO] Mechanic joined')
    setMechanicPresent(true)
    setMechanicEverJoined(true)
  }, [])

  const handleMechanicLeft = useCallback(() => {
    console.log('[VIDEO] Mechanic left')
    setMechanicPresent(false)
  }, [])

  const handleCustomerJoined = useCallback(() => {
    console.log('[VIDEO] Customer joined')
    setCustomerPresent(true)
    setCustomerEverJoined(true)
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

      // Call server to start session and get synchronized timestamp
      fetch(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('[VIDEO] Session start API response:', data)

          // Use server's synchronized timestamp so both clients have exact same start time
          if (data.session?.started_at) {
            const serverStartTime = new Date(data.session.started_at)
            setSessionStartTime(serverStartTime)
            console.log('[VIDEO] Timer synchronized to server time:', serverStartTime.toISOString())
          } else {
            // Fallback to current time if server doesn't return timestamp
            console.warn('[VIDEO] No started_at in response, using local time')
            setSessionStartTime(new Date())
          }
        })
        .catch((err) => {
          console.error('[VIDEO] Failed to call session start API:', err)
          // Fallback to current time on error
          setSessionStartTime(new Date())
        })
    }
  }, [mechanicPresent, customerPresent, sessionStarted, sessionId])

  // CRITICAL: Ensure camera is enabled after preflight
  // Note: Microphone is NOT auto-enabled - user has full control via toggle button
  const CameraEnabler = () => {
    const { localParticipant } = useLocalParticipant()
    const hasTriedEnabling = useRef(false)

    useEffect(() => {
      if (!hasTriedEnabling.current && localParticipant) {
        hasTriedEnabling.current = true
        console.log('[CameraEnabler] Explicitly enabling camera...')

        // Small delay to ensure LiveKit is fully initialized
        setTimeout(() => {
          // Enable camera only - let user control microphone via toggle
          localParticipant.setCameraEnabled(true)
            .then(() => {
              console.log('[CameraEnabler] Camera enabled successfully')
            })
            .catch((err) => {
              console.error('[CameraEnabler] Failed to enable camera:', err)
              alert('Failed to enable camera. Please check your permissions and try again.')
            })

          // FIX: Do NOT auto-enable microphone
          // User should have full control over mic state via toggle button
          console.log('[CameraEnabler] Microphone control left to user')
        }, 500)
      }
    }, [localParticipant])

    return null
  }

  const handleTimeWarning = useCallback((minutesLeft: number) => {
    setTimeWarning(`${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} remaining`)
    setTimeout(() => setTimeWarning(null), 5000)
  }, [])

  const handleTimeUp = useCallback(() => {
    setTimeWarning('Session time has ended')

    // Server-authoritative auto-end
    console.log('[VIDEO] Timer expired - auto-ending session')

    // Add network timeout (30 seconds)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    fetch(`/api/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })
      .then(async (res) => {
        clearTimeout(timeoutId)

        if (res.ok) {
          const sessionData = await res.json()
          console.log('[VIDEO] ⏱️ Timer expired - Session auto-ended:', sessionData)

          // Clear all annotations
          setAnnotations([])
          setShowAnnotations(false)
          setAnnotationMode(null)

          // Show notification first
          setSessionEnded(true)
          setSessionEndedBy('timer')

          // Pass data directly to modal (no delay, no re-fetch)
          setCompletionSessionData(sessionData.session || sessionData)
          setShowCompletionModal(true)
          console.log('[VIDEO] ⏱️ Completion modal shown immediately')
        } else {
          throw new Error(`API returned ${res.status}`)
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId)
        console.error('[VIDEO] Failed to auto-end session:', err)

        // Show error toast
        const toast = document.createElement('div')
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #EF4444;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          z-index: 99999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `

        if (err.name === 'AbortError') {
          toast.textContent = 'Session end timeout - please refresh the page'
        } else {
          toast.textContent = 'Failed to end session - please refresh the page'
        }

        document.body.appendChild(toast)
        setTimeout(() => toast.remove(), 5000)

        // Show extend modal as fallback
        setShowExtendModal(true)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

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
    if (endingSession) {
      console.log('[VIDEO] 🛑 Already ending session, ignoring duplicate click')
      return
    }

    try {
      console.log('[VIDEO] 🛑 Manual end session clicked')
      setEndingSession(true)
      setShowEndConfirm(false) // Close modal immediately

      // Disconnect from LiveKit room immediately
      console.log('[VIDEO] 🛑 Disconnecting from LiveKit room...')
      setIsRoomConnected(false)

      // Add network timeout (30 seconds)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const sessionData = await response.json()
        console.log('[VIDEO] 🛑 Session ended successfully:', sessionData)

        // Clear all annotations
        setAnnotations([])
        setShowAnnotations(false)
        setAnnotationMode(null)

        // Show notification first
        setSessionEnded(true)
        setSessionEndedBy(_userRole)

        // Pass data directly to modal (no delay, no re-fetch)
        setCompletionSessionData(sessionData.session || sessionData)
        setShowCompletionModal(true)
        console.log('[VIDEO] 🛑 Completion modal shown immediately')
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[VIDEO] 🛑 Failed to end session:', response.status, errorData)

        // Show error toast
        const toast = document.createElement('div')
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #EF4444;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          z-index: 99999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `
        toast.textContent = `Failed to end session: ${errorData.error || 'Please try again'}`
        document.body.appendChild(toast)
        setTimeout(() => toast.remove(), 5000)

        setEndingSession(false)
      }
    } catch (error: any) {
      console.error('Error ending session:', error)

      // Show error toast with specific message
      const toast = document.createElement('div')
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #EF4444;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 99999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `

      if (error.name === 'AbortError') {
        toast.textContent = 'Request timeout - please check your connection and try again'
      } else {
        toast.textContent = `Network error: ${error.message || 'Please try again'}`
      }

      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 5000)

      setEndingSession(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, endingSession])

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
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
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

  // Handle video quality change
  const handleVideoQualityChange = useCallback(async (quality: 'auto' | 'high' | 'medium' | 'low') => {
    try {
      console.log('[VIDEO_QUALITY] Changing quality to:', quality)
      setVideoQuality(quality)

      // LiveKit doesn't have a direct setQuality API, but we can adjust by restarting the camera with new constraints
      // For now, we'll just update the state - in a production app, you'd use LiveKit's adaptive streaming
      // or manually adjust constraints when creating/updating tracks

      // Note: LiveKit handles quality automatically based on network conditions
      // This is more of a preference setting that could be used when initializing tracks
      console.log('[VIDEO_QUALITY] Quality preference set to:', quality)

    } catch (error) {
      console.error('[VIDEO_QUALITY] Error changing quality:', error)
    }
  }, [])

  // Annotation Canvas Drawing Logic
  useEffect(() => {
    // Render canvas if we have annotations OR if mechanic has drawing mode active
    const shouldRenderCanvas = showAnnotations || annotations.length > 0
    if (!shouldRenderCanvas) return

    const canvas = document.getElementById('annotation-canvas') as HTMLCanvasElement
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Only add drawing interactions for mechanics with active annotation mode
    const canDraw = showAnnotations && annotationMode && _userRole === 'mechanic'

    // Drawing state
    let isDrawing = false
    let startX = 0
    let startY = 0
    let currentPath: Array<{x: number; y: number}> = []

    // Draw arrow helper - DEFINED FIRST
    const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
      const headlen = 20
      const angle = Math.atan2(toY - fromY, toX - fromX)

      ctx.beginPath()
      ctx.moveTo(fromX, fromY)
      ctx.lineTo(toX, toY)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(toX, toY)
      ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6))
      ctx.moveTo(toX, toY)
      ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6))
      ctx.stroke()
    }

    // Redraw all existing annotations - DEFINED SECOND
    const redrawAnnotations = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const canvasWidth = canvas.width
      const canvasHeight = canvas.height

      annotations.forEach((annotation: any) => {
        ctx.strokeStyle = annotation.color || '#FF4444'
        ctx.lineWidth = annotation.lineWidth || 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        if (annotation.type === 'draw' && annotation.path) {
          ctx.beginPath()
          annotation.path.forEach((point: {x: number; y: number}, index: number) => {
            // Denormalize coordinates from 0-1 range to current canvas size
            const absoluteX = point.x * canvasWidth
            const absoluteY = point.y * canvasHeight
            if (index === 0) {
              ctx.moveTo(absoluteX, absoluteY)
            } else {
              ctx.lineTo(absoluteX, absoluteY)
            }
          })
          ctx.stroke()
        } else if (annotation.type === 'arrow') {
          // Denormalize arrow coordinates
          const startX = annotation.startX * canvasWidth
          const startY = annotation.startY * canvasHeight
          const endX = annotation.endX * canvasWidth
          const endY = annotation.endY * canvasHeight
          drawArrow(ctx, startX, startY, endX, endY)
        } else if (annotation.type === 'circle') {
          // Denormalize circle coordinates
          const startX = annotation.startX * canvasWidth
          const startY = annotation.startY * canvasHeight
          const endX = annotation.endX * canvasWidth
          const endY = annotation.endY * canvasHeight
          const radius = Math.sqrt(
            Math.pow(endX - startX, 2) +
            Math.pow(endY - startY, 2)
          )
          ctx.beginPath()
          ctx.arc(startX, startY, radius, 0, 2 * Math.PI)
          ctx.stroke()
        }
      })
    }

    // Set canvas size to match video container - NOW USES DEFINED FUNCTIONS
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      redrawAnnotations()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Get coordinates from mouse or touch event
    const getCoordinates = (e: MouseEvent | TouchEvent) => {
      if (!e) {
        console.error('[ANNOTATION] Event is undefined in getCoordinates')
        return { x: 0, y: 0 }
      }
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e && e.touches && e.touches.length > 0) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        }
      }
      if ('clientX' in e && 'clientY' in e) {
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        }
      }
      console.error('[ANNOTATION] Event has no clientX/clientY or touches')
      return { x: 0, y: 0 }
    }

    // Start drawing
    const handleStart = (e: MouseEvent | TouchEvent) => {
      if (!e) return
      e.preventDefault()
      const { x, y } = getCoordinates(e)
      isDrawing = true
      startX = x
      startY = y
      currentPath = [{x, y}]

      ctx.strokeStyle = '#FF4444'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }

    // Draw/Move
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!e || !annotationMode) return

      const { x, y } = getCoordinates(e)

      // Laser pointer mode - just show cursor
      if (annotationMode === 'laser') {
        redrawAnnotations()
        ctx.fillStyle = '#FF0000'
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, 2 * Math.PI)
        ctx.fill()
        return
      }

      if (!isDrawing) return
      e.preventDefault()

      if (annotationMode === 'draw') {
        currentPath.push({x, y})
        ctx.beginPath()
        ctx.moveTo(currentPath[currentPath.length - 2].x, currentPath[currentPath.length - 2].y)
        ctx.lineTo(x, y)
        ctx.stroke()
      } else if (annotationMode === 'arrow' || annotationMode === 'circle') {
        redrawAnnotations()
        if (annotationMode === 'arrow') {
          drawArrow(ctx, startX, startY, x, y)
        } else {
          const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2))
          ctx.beginPath()
          ctx.arc(startX, startY, radius, 0, 2 * Math.PI)
          ctx.stroke()
        }
      }
    }

    // End drawing
    const handleEnd = (e: MouseEvent | TouchEvent) => {
      if (!e || !isDrawing) return
      e.preventDefault()
      isDrawing = false

      const { x, y } = getCoordinates(e)

      // Create annotation object with NORMALIZED coordinates (0-1 range for cross-device compatibility)
      let newAnnotation: any = null
      const canvasWidth = canvas.width
      const canvasHeight = canvas.height

      if (annotationMode === 'draw') {
        // Normalize path coordinates
        const normalizedPath = currentPath.map(point => ({
          x: point.x / canvasWidth,
          y: point.y / canvasHeight
        }))
        newAnnotation = {
          type: 'draw',
          path: normalizedPath,
          color: '#FF4444',
          lineWidth: 3
        }
      } else if (annotationMode === 'arrow') {
        newAnnotation = {
          type: 'arrow',
          startX: startX / canvasWidth,
          startY: startY / canvasHeight,
          endX: x / canvasWidth,
          endY: y / canvasHeight,
          color: '#FF4444',
          lineWidth: 3
        }
      } else if (annotationMode === 'circle') {
        newAnnotation = {
          type: 'circle',
          startX: startX / canvasWidth,
          startY: startY / canvasHeight,
          endX: x / canvasWidth,
          endY: y / canvasHeight,
          color: '#FF4444',
          lineWidth: 3
        }
      }

      if (newAnnotation) {
        // Save annotation locally
        setAnnotations(prev => [...prev, newAnnotation])

        // Broadcast annotation to other participant using the stored channel
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current
            .send({
              type: 'broadcast',
              event: 'annotation',
              payload: {
                annotation: newAnnotation,
                sender: _userId,
              },
            })
            .catch((err: any) => console.error('[ANNOTATION] Broadcast error:', err))
        } else {
          console.error('[ANNOTATION] Broadcast channel not available yet')
        }
      }
    }

    // Add event listeners ONLY if mechanic can draw
    if (canDraw) {
      canvas.addEventListener('mousedown', handleStart)
      canvas.addEventListener('mousemove', handleMove)
      canvas.addEventListener('mouseup', handleEnd)
      canvas.addEventListener('mouseleave', handleEnd)
      canvas.addEventListener('touchstart', handleStart)
      canvas.addEventListener('touchmove', handleMove)
      canvas.addEventListener('touchend', handleEnd)
    }

    return () => {
      if (canDraw) {
        canvas.removeEventListener('mousedown', handleStart)
        canvas.removeEventListener('mousemove', handleMove)
        canvas.removeEventListener('mouseup', handleEnd)
        canvas.removeEventListener('mouseleave', handleEnd)
        canvas.removeEventListener('touchstart', handleStart)
        canvas.removeEventListener('touchmove', handleMove)
        canvas.removeEventListener('touchend', handleEnd)
      }
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [showAnnotations, annotationMode, annotations, _userRole])

  // Chat: Handle typing indicator
  const handleTyping = useCallback(async () => {
    try {
      await supabase
        .channel(`chat:${sessionId}`)
        .send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            sender: _userId,
            typing: true,
          },
        })
    } catch (error) {
      console.error('[CHAT] Error sending typing indicator:', error)
    }
  }, [_userId, sessionId, supabase])

  // Chat: Send message
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim()) return

    const message = {
      sender: _userId,
      senderRole: _userRole,
      text: messageInput.trim(),
      timestamp: Date.now(),
      status: 'sending' as const,
    }

    // Optimistically add message to UI
    setMessages((prev) => [...prev, message])

    try {
      // Broadcast message to channel
      await supabase
        .channel(`chat:${sessionId}`)
        .send({
          type: 'broadcast',
          event: 'message',
          payload: message,
        })

      // Update message status to sent
      setMessages((prev) =>
        prev.map((msg) =>
          msg.timestamp === message.timestamp && msg.sender === _userId
            ? { ...msg, status: 'sent' as const }
            : msg
        )
      )

      console.log('[CHAT] Sent message:', message)

      // Clear input
      setMessageInput('')

      // Stop typing indicator
      await supabase
        .channel(`chat:${sessionId}`)
        .send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            sender: _userId,
            typing: false,
          },
        })

      // Focus back on input (especially important for mobile)
      messageInputRef.current?.focus()
    } catch (error) {
      console.error('[CHAT] Error sending message:', error)
      // Update message status to failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.timestamp === message.timestamp && msg.sender === _userId
            ? { ...msg, status: undefined }
            : msg
        )
      )
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
      {/* Waiting Room Overlay - Only show BEFORE session starts */}
      {!sessionStarted && (!mechanicPresent || !customerPresent) && (
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
              {(!mechanicPresent || !customerPresent) && (
                <p className="mt-2 text-sm text-slate-400">
                  {!mechanicPresent && !customerPresent
                    ? 'Session will start when both participants join.'
                    : !mechanicPresent
                    ? 'A certified mechanic will join shortly.'
                    : ''}
                </p>
              )}
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

      {/* Session Ended Notification */}
      {sessionEnded && (
        <div className="absolute left-1/2 top-1/3 z-50 -translate-x-1/2 -translate-y-1/2 transform">
          <div className="rounded-2xl border-2 border-red-500/40 bg-gradient-to-br from-red-950/95 via-slate-900/95 to-slate-950/95 px-8 py-6 shadow-2xl backdrop-blur-lg">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-red-500/20 p-4 ring-2 ring-red-500/30">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-red-300">Session Ended</h3>
                <p className="mt-2 text-sm text-slate-300">
                  {sessionEndedBy === 'timer' ? (
                    'Your session time has expired'
                  ) : sessionEndedBy === _userRole ? (
                    'You ended the session'
                  ) : sessionEndedBy === 'mechanic' ? (
                    `${mechanicName || 'The mechanic'} ended the session`
                  ) : sessionEndedBy === 'customer' ? (
                    `${customerName || 'The customer'} ended the session`
                  ) : (
                    'The session has ended'
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Loading summary...
                </p>
              </div>
            </div>
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

      {/* Connection Status Bar - Positioned above bottom controls */}
      {showReconnectBanner && !sessionEnded && sessionStarted && (
        <div className="absolute inset-x-0 bottom-24 z-30 sm:bottom-28 md:bottom-24">
          <div className="mx-auto max-w-4xl px-2 sm:px-4">
            <div className="rounded-t-lg border border-orange-500/30 bg-gradient-to-r from-orange-950/95 via-orange-900/95 to-orange-950/95 backdrop-blur-md shadow-lg">
              <div className="flex items-center justify-between px-3 py-2 sm:px-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-orange-400 flex-shrink-0"></div>
                    <span className="text-xs font-medium text-orange-200 sm:text-sm">
                      {_userRole === 'customer'
                        ? 'Connection interrupted'
                        : `${mechanicPresent ? (customerName || 'Customer') : (mechanicName || 'Mechanic')} disconnected`
                      }
                    </span>
                  </div>
                  <span className="hidden text-xs text-orange-300/80 sm:inline">
                    {_userRole === 'customer' ? 'Reconnecting...' : 'Timer paused'}
                  </span>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-md bg-orange-600/90 px-2 py-1 text-xs font-semibold text-white transition hover:bg-orange-600 sm:px-3"
                >
                  Retry
                </button>
              </div>
            </div>
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

          {/* PARTICIPANT NAME - Shows the other participant's name */}
          {_userRole === 'customer' && mechanicName && _mechanicId ? (
            <button
              onClick={() => setShowMechanicProfileModal(true)}
              className="rounded-full border-2 border-blue-400 bg-blue-500/20 px-2 py-1 text-xs font-bold text-blue-100 backdrop-blur transition hover:bg-blue-500/30 sm:px-4 sm:py-2 sm:text-sm flex items-center gap-1.5"
              title="View mechanic profile"
            >
              🔧 {mechanicName}
              <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          ) : _userRole === 'mechanic' && customerName ? (
            <div className="rounded-full border-2 border-green-400 bg-green-500/20 px-2 py-1 text-xs font-bold text-green-100 backdrop-blur sm:px-4 sm:py-2 sm:text-sm">
              👤 {customerName}
            </div>
          ) : (
            <div className={`rounded-full border-2 px-2 py-1 text-xs font-bold backdrop-blur sm:px-4 sm:py-2 sm:text-sm ${
              _userRole === 'mechanic'
                ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                : 'border-green-400 bg-green-500/20 text-green-100'
            }`}>
              {_userRole === 'mechanic' ? '🔧 Mechanic' : '👤 Customer'}
            </div>
          )}

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
              isPaused={isTimerPaused}
              sessionId={sessionId}
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
                window.location.href = _userRole === 'mechanic' ? routeFor.mechanicLogin() : routeFor.login()
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
        token={currentToken}
        connect={isRoomConnected}
        video={true}
        audio={true}
        className="h-full w-full"
        options={{
          publishDefaults: {
            videoSimulcastLayers: [
              { width: 1280, height: 720, encoding: { maxBitrate: 1500000 } },
              { width: 640, height: 360, encoding: { maxBitrate: 500000 } },
            ],
          },
        }}
        onConnected={() => {
          console.log('[LiveKitRoom] ✅ CONNECTED to room:', `session-${sessionId}`)
          console.log('[LiveKitRoom] My identity:', _userRole === 'mechanic' ? `mechanic-${_userId}` : `customer-${_userId}`)
          console.log('[LiveKitRoom] Server URL:', serverUrl)
        }}
        onDisconnected={() => {
          console.log('[LiveKitRoom] ❌ DISCONNECTED from room')
        }}
        onError={(error) => {
          console.error('[LiveKitRoom] ⚠️ ERROR:', error)
          if (error.message.includes('permission') || error.message.includes('NotAllowedError')) {
            alert('Camera or microphone access denied. Please allow permissions and reload the page.')
          }
        }}
      >
        {isRoomConnected && <CameraEnabler />}
        <ParticipantMonitor
          onMechanicJoined={handleMechanicJoined}
          onMechanicLeft={handleMechanicLeft}
          onCustomerJoined={handleCustomerJoined}
          onCustomerLeft={handleCustomerLeft}
        />
        <VideoView userRole={_userRole} showPip={showPip} swapView={swapView} mechanicName={mechanicName} customerName={customerName} />
        <RoomAudioRenderer />

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
                swapView={swapView}
                onToggleSwapView={() => setSwapView(!swapView)}
                userRole={_userRole}
                showNotes={showNotes}
                onToggleNotes={() => setShowNotes(!showNotes)}
                notesChanged={notes !== notesInitialValue}
                videoQuality={videoQuality}
                onVideoQualityChange={handleVideoQualityChange}
                showBrightnessControl={showBrightnessControl}
                onToggleBrightnessControl={() => setShowBrightnessControl(!showBrightnessControl)}
                showAudioLevels={showAudioLevels}
                onToggleAudioLevels={() => setShowAudioLevels(!showAudioLevels)}
                showNetworkStats={showNetworkStats}
                onToggleNetworkStats={() => setShowNetworkStats(!showNetworkStats)}
                showAnnotations={showAnnotations}
                onToggleAnnotations={() => setShowAnnotations(!showAnnotations)}
              />
            </div>
          </div>
        )}
      </LiveKitRoom>

      {/* Annotation Canvas Overlay - Shows drawings from mechanic */}
      {(showAnnotations || annotations.length > 0) && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          {/* Drawing Toolbar - Only shown for mechanics - DRAGGABLE */}
          {showAnnotations && _userRole === 'mechanic' && (
            <motion.div
              drag
              dragMomentum={false}
              dragElastic={0.1}
              initial={{ x: 16, y: '-50%' }}
              className="absolute left-0 top-1/2 pointer-events-auto z-[60] cursor-move"
              style={{ touchAction: 'none' }}
            >
            <div className="flex flex-col gap-2 rounded-xl border-2 border-slate-600 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-sm">
              {/* Drag Handle */}
              <div className="flex items-center justify-center cursor-grab active:cursor-grabbing">
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                  <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                  <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                </div>
              </div>
              <div className="border-b border-slate-600 pb-2 text-center">
                <p className="text-xs font-bold text-white">DRAW TOOLS</p>
              </div>

              {/* Freehand Draw */}
              <button
                onClick={() => setAnnotationMode(annotationMode === 'draw' ? null : 'draw')}
                className={`rounded-lg p-2.5 transition ${
                  annotationMode === 'draw'
                    ? 'bg-blue-500 text-white ring-2 ring-blue-400'
                    : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}
                title="Freehand draw"
              >
                <Pencil className="h-5 w-5" />
              </button>

              {/* Arrow */}
              <button
                onClick={() => setAnnotationMode(annotationMode === 'arrow' ? null : 'arrow')}
                className={`rounded-lg p-2.5 transition ${
                  annotationMode === 'arrow'
                    ? 'bg-green-500 text-white ring-2 ring-green-400'
                    : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}
                title="Draw arrow"
              >
                <ArrowRight className="h-5 w-5" />
              </button>

              {/* Circle */}
              <button
                onClick={() => setAnnotationMode(annotationMode === 'circle' ? null : 'circle')}
                className={`rounded-lg p-2.5 transition ${
                  annotationMode === 'circle'
                    ? 'bg-purple-500 text-white ring-2 ring-purple-400'
                    : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}
                title="Draw circle"
              >
                <Circle className="h-5 w-5" />
              </button>

              {/* Laser Pointer */}
              <button
                onClick={() => setAnnotationMode(annotationMode === 'laser' ? null : 'laser')}
                className={`rounded-lg p-2.5 transition ${
                  annotationMode === 'laser'
                    ? 'bg-red-500 text-white ring-2 ring-red-400'
                    : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}
                title="Laser pointer"
              >
                <MousePointer className="h-5 w-5" />
              </button>

              <div className="border-t border-slate-600 my-1"></div>

              {/* Clear All */}
              <button
                onClick={() => {
                  setAnnotations([])
                  setAnnotationMode(null)
                  // Broadcast clear to customer using stored channel
                  if (broadcastChannelRef.current) {
                    broadcastChannelRef.current
                      .send({
                        type: 'broadcast',
                        event: 'annotation:clear',
                        payload: { sender: _userId },
                      })
                      .catch((err: any) => console.error('[ANNOTATION] Clear broadcast error:', err))
                  }
                }}
                className="rounded-lg bg-red-500/80 p-2.5 text-white transition hover:bg-red-600"
                title="Clear all annotations"
              >
                <Eraser className="h-5 w-5" />
              </button>

              {/* Close Drawing Mode */}
              <button
                onClick={() => {
                  setShowAnnotations(false)
                  setAnnotationMode(null)
                }}
                className="rounded-lg bg-slate-700/80 p-2.5 text-slate-300 transition hover:bg-slate-600 hover:text-white"
                title="Exit drawing mode"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            </motion.div>
          )}

          {/* Canvas for drawing - z-index BELOW toolbar */}
          <canvas
            id="annotation-canvas"
            className={`absolute inset-0 w-full h-full z-40 ${annotationMode && _userRole === 'mechanic' ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
            style={{
              touchAction: 'none',
            }}
          />

          {/* Helper text */}
          {annotationMode && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="rounded-lg border border-slate-600 bg-slate-900/90 px-4 py-2 backdrop-blur-sm">
                <p className="text-sm text-slate-300">
                  {annotationMode === 'draw' && '✏️ Draw on screen to highlight areas'}
                  {annotationMode === 'arrow' && '➡️ Click and drag to draw an arrow'}
                  {annotationMode === 'circle' && '⭕ Click and drag to draw a circle'}
                  {annotationMode === 'laser' && '🔴 Move cursor to point at areas'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* Chat Panel - WhatsApp-like Enhanced UI */}
      {showChat && (
        <>
          {/* Backdrop - Click to close (only on mobile where chat is full-width) */}
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm sm:hidden"
            onClick={() => setShowChat(false)}
          />

          <div className="fixed bottom-0 right-0 top-0 z-[70] flex w-full flex-col border-l border-slate-700 bg-slate-900 sm:w-96 md:w-[28rem]">
            {/* Chat Header with prominent close button */}
            <div className="flex items-center justify-between border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-750 p-3 shadow-lg sm:p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                  {_userRole === 'mechanic' ? '👤' : '🔧'}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">
                    {_userRole === 'mechanic' ? (
                      customerName || 'Customer'
                    ) : mechanicName && _mechanicId ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowMechanicProfileModal(true)
                        }}
                        className="hover:text-orange-300 hover:underline transition-colors text-left"
                        title="View mechanic profile"
                      >
                        {mechanicName}
                      </button>
                    ) : (
                      'Mechanic'
                    )}
                  </h3>
                  {isTyping && (
                    <p className="text-xs text-green-400 animate-pulse">typing...</p>
                  )}
                </div>
              </div>

              {/* Enhanced close button - Always visible with text on mobile */}
              <button
                onClick={() => setShowChat(false)}
                className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-red-600 active:scale-95 sm:bg-slate-700 sm:hover:bg-slate-600"
              >
                <span>Close</span>
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages Container - WhatsApp pattern background */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto bg-slate-950 p-3 sm:p-4"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23334155' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          >
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="mx-auto mb-3 h-16 w-16 text-slate-700" />
                  <p className="text-sm text-slate-400">
                    No messages yet
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Start the conversation!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg, index) => {
                  const isOwn = msg.sender === _userId
                  const prevMsg = index > 0 ? messages[index - 1] : null
                  const showDateSeparator = !prevMsg ||
                    new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString()
                  const isFirstInGroup = !prevMsg || prevMsg.sender !== msg.sender
                  const isLastInGroup = index === messages.length - 1 || messages[index + 1]?.sender !== msg.sender

                  return (
                    <div key={index}>
                      {/* Date Separator */}
                      {showDateSeparator && (
                        <div className="my-4 flex items-center justify-center">
                          <div className="rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-300 shadow-lg backdrop-blur">
                            {new Date(msg.timestamp).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: new Date(msg.timestamp).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                            })}
                          </div>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                          isFirstInGroup ? 'mt-3' : 'mt-0.5'
                        }`}
                      >
                        <div
                          className={`group relative max-w-[85%] ${
                            isOwn
                              ? 'rounded-2xl rounded-tr-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20'
                              : 'rounded-2xl rounded-tl-sm bg-slate-800 text-slate-100 shadow-lg'
                          } px-3 py-2 transition-all hover:scale-[1.02]`}
                        >
                          {/* Sender name (only for first in group from others) */}
                          {!isOwn && isFirstInGroup && (
                            <div className="mb-1 text-xs font-semibold text-blue-400">
                              {msg.senderRole === 'mechanic' ? '🔧 Mechanic' : '👤 Customer'}
                            </div>
                          )}

                          {/* Message Text - Rendered as plain text to prevent XSS */}
                          <p className="break-words text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.text}
                          </p>

                          {/* Timestamp and Status */}
                          <div className={`mt-1 flex items-center justify-end gap-1 ${
                            isOwn ? 'text-blue-100' : 'text-slate-400'
                          }`}>
                            <span className="text-[10px] opacity-70">
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {/* Message Status (checkmarks for sent messages) */}
                            {isOwn && (
                              <span className="text-xs">
                                {msg.status === 'sending' && '🕐'}
                                {msg.status === 'sent' && '✓'}
                                {msg.status === 'delivered' && '✓✓'}
                                {msg.status === 'read' && '✓✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-3 shadow-lg">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '0ms' }}></span>
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '150ms' }}></span>
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Message Input - Mobile-friendly with keyboard support */}
          <div className="border-t border-slate-700 bg-slate-800 p-2 sm:p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={messageInputRef}
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value)
                  handleTyping()
                  // Auto-resize textarea
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                    // Reset height
                    if (messageInputRef.current) {
                      messageInputRef.current.style.height = 'auto'
                    }
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:text-base"
                style={{ maxHeight: '120px' }}
              />
              <button
                onClick={() => {
                  handleSendMessage()
                  // Reset height
                  if (messageInputRef.current) {
                    messageInputRef.current.style.height = 'auto'
                  }
                }}
                disabled={!messageInput.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 transition hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:h-11 sm:w-11"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>

            {/* Keyboard hint for mobile */}
            <p className="mt-1.5 text-center text-[10px] text-slate-500 sm:hidden">
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        </div>
        </>
      )}

      {/* Notes Panel (Mechanic Only) */}
      {showNotes && _userRole === 'mechanic' && (
        <>
          {/* Backdrop - Click to close (only on mobile) */}
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm sm:hidden"
            onClick={() => setShowNotes(false)}
          />

          <div className="fixed bottom-0 right-0 top-0 z-[70] flex w-full flex-col border-l border-slate-700 bg-slate-900 sm:w-96 md:w-[28rem]">
            {/* Notes Header */}
            <div className="flex items-center justify-between border-b border-slate-700 bg-gradient-to-r from-purple-800 to-purple-750 p-3 shadow-lg sm:p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-600">
                  <FileEdit className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">Session Notes</h3>
                  <p className="text-xs text-purple-200">For your findings and observations</p>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowNotes(false)}
                className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-red-600 active:scale-95 sm:bg-slate-700 sm:hover:bg-slate-600"
              >
                <span>Close</span>
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Notes Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <textarea
                ref={notesInputRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-full w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                placeholder="Write your findings, observations, and recommendations here...

Examples:
• Checked oil level - appears low
• Battery terminals show corrosion
• Recommended brake pad replacement within 3 months
• Customer mentioned intermittent noise when turning left"
              />
            </div>

            {/* Notes Footer with Save Button */}
            <div className="border-t border-slate-700 bg-slate-800 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-400">
                  {notes !== notesInitialValue ? (
                    <span className="text-orange-400">• Unsaved changes</span>
                  ) : (
                    <span>All changes saved</span>
                  )}
                </p>
                <button
                  onClick={async () => {
                    setSavingNotes(true)
                    try {
                      const response = await fetch(`/api/mechanic/sessions/${sessionId}/notes`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notes }),
                      })
                      if (response.ok) {
                        setNotesInitialValue(notes)
                      } else {
                        alert('Failed to save notes. Please try again.')
                      }
                    } catch (error) {
                      console.error('Error saving notes:', error)
                      alert('Failed to save notes. Please try again.')
                    } finally {
                      setSavingNotes(false)
                    }
                  }}
                  disabled={savingNotes || notes === notesInitialValue}
                  className="flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingNotes ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Notes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
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
                disabled={endingSession}
                className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/35 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmEndSession}
                disabled={endingSession}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {endingSession ? 'Ending...' : 'End Session'}
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

      {/* Device Conflict Modal - Another device joined */}
      {deviceKicked && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-w-md rounded-xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-red-500/20 p-3">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Session Ended</h2>
            </div>
            <p className="mb-6 text-slate-300">
              This session was joined from another device. Only one device can be connected at a time for security reasons.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = dashboardUrl}
                className="flex-1 rounded-lg bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-600"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Completion Modal - Simplified to match working chat implementation */}
      {completionSessionData && (
        <SessionCompletionModal
          isOpen={showCompletionModal}
          sessionData={completionSessionData}
          onClose={() => {
            console.log('[VIDEO] Modal onClose called')
            setShowCompletionModal(false)
          }}
          onViewDashboard={() => {
            console.log('[VIDEO] Modal onViewDashboard called')
            window.location.href = dashboardUrl
          }}
          onViewDetails={() => {
            console.log('[VIDEO] Modal onViewDetails called')
            window.location.href = _userRole === 'mechanic' ? '/mechanic/sessions' : '/customer/sessions'
          }}
          userRole={_userRole}
        />
      )}

      {/* Mechanic Profile Modal (Customer Only) */}
      {_userRole === 'customer' && _mechanicId && (
        <MechanicProfileModal
          mechanicId={_mechanicId}
          isOpen={showMechanicProfileModal}
          onClose={() => setShowMechanicProfileModal(false)}
        />
      )}
    </div>
  )
}
