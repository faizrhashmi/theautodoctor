'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useLocalParticipant } from '@livekit/components-react'
import { Track } from 'livekit-client'
import {
  Camera, Video, VideoOff, Mic, MicOff, Monitor, MonitorOff,
  Upload, MessageCircle, FileEdit, Eye, EyeOff, Repeat2,
  Maximize2, Minimize2, Settings, Sun, Activity, BarChart3,
  Pencil, Flashlight, SwitchCamera, ZoomIn, ZoomOut, Grid3x3,
  CircleDot, Focus, Palette, Pause, Tag, Mic2, Lock, Unlock,
  HelpCircle, Video as VideoRecordIcon, Download, Ruler,
  Square, PlayCircle, StopCircle, X, ScreenShare, ChevronDown, ChevronUp
} from 'lucide-react'

/**
 * Professional Automotive Inspection Controls
 *
 * Features organized into logical groups:
 * - Group 1: Capture (Screenshot, Record, Multi-capture)
 * - Group 2: View Enhancements (Zoom, Grid, Filters, Freeze)
 * - Group 3: Documentation (Voice notes, Tags, Checklist, Findings)
 * - Group 4: Camera Settings (Exposure, Focus, Flashlight, Switch, Orientation)
 * - Group 5: Session Controls (Chat, Quality, End)
 * - Group 6: Help (Tutorial)
 */

interface InspectionControlsProps {
  // Screenshot & file upload
  onCaptureScreenshot: (blob: Blob) => void
  onFileUpload: (file: File) => void

  // Chat & notes
  showChat: boolean
  onToggleChat: () => void
  unreadCount: number
  showNotes?: boolean
  onToggleNotes?: () => void
  notesChanged?: boolean

  // View controls
  showPip: boolean
  onTogglePip: () => void
  swapView: boolean
  onToggleSwapView: () => void

  // Quality & settings
  videoQuality: 'auto' | 'high' | 'medium' | 'low'
  onVideoQualityChange: (quality: 'auto' | 'high' | 'medium' | 'low') => void
  showBrightnessControl: boolean
  onToggleBrightnessControl: () => void
  showAudioLevels: boolean
  onToggleAudioLevels: () => void
  showNetworkStats: boolean
  onToggleNetworkStats: () => void
  showAnnotations?: boolean
  onToggleAnnotations?: () => void

  // User role
  userRole: 'mechanic' | 'customer'

  // Session ID for metadata
  sessionId: string
}

type ControlGroup = 'capture' | 'view' | 'documentation' | 'camera' | 'session' | 'help' | 'all'

export function InspectionControls(props: InspectionControlsProps) {
  const {
    onCaptureScreenshot, onFileUpload,
    showChat, onToggleChat, unreadCount,
    showNotes, onToggleNotes, notesChanged,
    showPip, onTogglePip, swapView, onToggleSwapView,
    videoQuality, onVideoQualityChange,
    showBrightnessControl, onToggleBrightnessControl,
    showAudioLevels, onToggleAudioLevels,
    showNetworkStats, onToggleNetworkStats,
    showAnnotations, onToggleAnnotations,
    userRole, sessionId
  } = props

  // ========== LIVEKIT HOOKS ==========
  const { isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled, localParticipant } = useLocalParticipant()

  // ========== CAMERA & MIC CONTROLS STATE ==========
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0)
  const [isFlashlightOn, setIsFlashlightOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)

  // ========== CAMERA & MIC CONTROL FUNCTIONS ==========

  // Enumerate available cameras on mount
  useEffect(() => {
    async function getCameras() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameras = devices.filter(device => device.kind === 'videoinput')
        setAvailableCameras(cameras)
        console.log('[InspectionControls] Available cameras:', cameras.length)
      } catch (error) {
        console.error('[InspectionControls] Failed to enumerate cameras:', error)
      }
    }
    getCameras()
  }, [])

  // Check if current camera supports torch (flashlight)
  const checkCurrentCameraTorch = useCallback(async () => {
    try {
      const videoPublication = localParticipant.getTrackPublication(Track.Source.Camera)
      if (!videoPublication || !videoPublication.track) {
        setTorchSupported(false)
        return
      }

      const mediaStreamTrack = videoPublication.track.mediaStreamTrack
      if (!mediaStreamTrack) {
        setTorchSupported(false)
        return
      }

      const capabilities = mediaStreamTrack.getCapabilities()
      // @ts-ignore - torch is not in TypeScript types yet
      const hasTorch = !!capabilities.torch

      setTorchSupported(hasTorch)

      // If torch was on but new camera doesn't support it, turn it off
      if (!hasTorch && isFlashlightOn) {
        setIsFlashlightOn(false)
      }
    } catch (error) {
      setTorchSupported(false)
    }
  }, [localParticipant, isFlashlightOn])

  // Check torch support when camera is ready and when camera changes
  useEffect(() => {
    if (isCameraEnabled) {
      const timer = setTimeout(() => {
        checkCurrentCameraTorch()
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setTorchSupported(false)
      setIsFlashlightOn(false)
    }
  }, [isCameraEnabled, currentCameraIndex, checkCurrentCameraTorch])

  const toggleCamera = useCallback(async () => {
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled)
    } catch (error) {
      console.error('[InspectionControls] Failed to toggle camera:', error)
      alert('Failed to toggle camera. Please check your camera permissions.')
    }
  }, [localParticipant, isCameraEnabled])

  const toggleMic = useCallback(async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
    } catch (error) {
      console.error('[InspectionControls] Failed to toggle microphone:', error)
      alert('Failed to toggle microphone. Please check your microphone permissions.')
    }
  }, [localParticipant, isMicrophoneEnabled])

  const toggleScreenShare = useCallback(async () => {
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled)
    } catch (error) {
      console.error('[InspectionControls] Failed to toggle screen share:', error)
      alert('Failed to toggle screen share.')
    }
  }, [localParticipant, isScreenShareEnabled])

  const flipCamera = useCallback(async () => {
    if (availableCameras.length <= 1) {
      return
    }

    try {
      // Turn off flashlight before switching
      if (isFlashlightOn) {
        setIsFlashlightOn(false)
        const videoPublication = localParticipant.getTrackPublication(Track.Source.Camera)
        if (videoPublication?.track) {
          const mediaStreamTrack = videoPublication.track.mediaStreamTrack as MediaStreamTrack & {
            applyConstraints: (constraints: any) => Promise<void>
          }
          await mediaStreamTrack.applyConstraints({
            // @ts-ignore
            advanced: [{ torch: false }]
          })
        }
      }

      const nextIndex = (currentCameraIndex + 1) % availableCameras.length
      const nextCamera = availableCameras[nextIndex]

      await localParticipant.switchActiveDevice('videoinput', nextCamera.deviceId)
      setCurrentCameraIndex(nextIndex)

      console.log('[InspectionControls] Camera flipped to:', nextCamera.label)
    } catch (error) {
      console.error('[InspectionControls] Failed to flip camera:', error)
      alert('Failed to switch camera.')
    }
  }, [availableCameras, currentCameraIndex, isFlashlightOn, localParticipant])

  const toggleFlashlight = useCallback(async () => {
    if (!torchSupported && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      return
    }

    try {
      const videoPublication = localParticipant.getTrackPublication(Track.Source.Camera)
      if (!videoPublication || !videoPublication.track) {
        return
      }

      const mediaStreamTrack = videoPublication.track.mediaStreamTrack as MediaStreamTrack & {
        applyConstraints: (constraints: any) => Promise<void>
      }

      const newState = !isFlashlightOn
      await mediaStreamTrack.applyConstraints({
        // @ts-ignore
        advanced: [{ torch: newState }]
      })

      setIsFlashlightOn(newState)
      console.log('[InspectionControls] Flashlight toggled to:', newState)
    } catch (error) {
      console.error('[InspectionControls] Failed to toggle flashlight:', error)
    }
  }, [isFlashlightOn, torchSupported, localParticipant])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // ========== NEW INSPECTION FEATURES STATE ==========

  // Zoom controls
  const [zoomLevel, setZoomLevel] = useState(1) // 1x = normal, 2x, 4x, 8x
  const [showZoomControls, setShowZoomControls] = useState(false)

  // Grid overlay
  const [gridType, setGridType] = useState<'none' | 'thirds' | 'alignment' | 'crosshair'>('none')
  const [gridOpacity, setGridOpacity] = useState(0.5)
  const [gridColor, setGridColor] = useState<'white' | 'yellow' | 'red' | 'green'>('white')
  const [showGridSettings, setShowGridSettings] = useState(false)

  // Video recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Color filters
  const [activeFilter, setActiveFilter] = useState<'none' | 'contrast' | 'leak' | 'rust'>('none')
  const [showFilterSettings, setShowFilterSettings] = useState(false)

  // Focus lock
  const [focusLocked, setFocusLocked] = useState(false)

  // Freeze frame
  const [isFrameFrozen, setIsFrameFrozen] = useState(false)
  const [frozenFrameData, setFrozenFrameData] = useState<string | null>(null)

  // Tags system
  const [showTagsPanel, setShowTagsPanel] = useState(false)
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [tagsPanelPosition, setTagsPanelPosition] = useState({ x: 0, y: 0 })
  const [isDraggingTags, setIsDraggingTags] = useState(false)
  const [tagsDragStart, setTagsDragStart] = useState({ x: 0, y: 0 })
  const predefinedTags = [
    // Core Systems
    'Engine',
    'Transmission',
    'Brakes',
    'Suspension',
    'Steering',
    'Exhaust',
    'Cooling System',
    'Fuel System',

    // Electrical
    'Battery',
    'Alternator',
    'Starter',
    'Lights',
    'Electrical System',

    // Exterior
    'Body/Paint',
    'Glass/Windows',
    'Doors',
    'Hood/Trunk',
    'Mirrors',
    'Wipers',

    // Interior
    'Interior/Seats',
    'Dashboard',
    'HVAC/Climate',
    'Audio System',

    // Wheels & Tires
    'Tires',
    'Wheels/Rims',
    'Alignment',

    // Fluids
    'Oil',
    'Coolant',
    'Brake Fluid',
    'Transmission Fluid',

    // Undercarriage
    'Undercarriage',
    'Frame',
    'Exhaust System',

    // Safety
    'Airbags',
    'Seatbelts',
    'Safety Systems',

    // Misc
    'Rust/Corrosion',
    'Leaks',
    'Wear/Damage',
    'Other'
  ]

  // Voice notes
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [voiceTranscription, setVoiceTranscription] = useState<string>('')
  const recognitionRef = useRef<any>(null)

  // Orientation lock
  const [orientationLocked, setOrientationLocked] = useState(false)
  const orientationLockRef = useRef<OrientationLockType | null>(null)

  // Tutorial system
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)

  // UI state
  const [activeControlGroup, setActiveControlGroup] = useState<ControlGroup>('all')
  const [showQualityDropdown, setShowQualityDropdown] = useState(false)
  const [capturingScreenshot, setCapturingScreenshot] = useState(false)
  const [controlsCollapsed, setControlsCollapsed] = useState(false)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qualityDropdownRef = useRef<HTMLDivElement>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)

  // ========== ZOOM CONTROLS ==========

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.5, 8))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.5, 1))
  }, [])

  const setZoomPreset = useCallback((level: number) => {
    setZoomLevel(level)
  }, [])

  // Apply zoom to video element
  useEffect(() => {
    const mainVideo = document.querySelector('video[data-lk-participant-name]') as HTMLVideoElement
    if (mainVideo) {
      mainVideo.style.transform = `scale(${zoomLevel})`
      mainVideo.style.transformOrigin = 'center center'
      mainVideo.style.transition = 'transform 0.2s ease-out'
      videoElementRef.current = mainVideo
    }
  }, [zoomLevel])

  // ========== VIDEO RECORDING ==========

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      })

      recordingChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)

        // Save to device
        const a = document.createElement('a')
        a.href = url
        a.download = `inspection-${sessionId}-${Date.now()}.webm`
        a.click()

        // Cleanup
        URL.revokeObjectURL(url)
        recordingChunksRef.current = []

        console.log('[RECORDING] Video saved to device')
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setRecordingDuration(0)

      // Start duration timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

      console.log('[RECORDING] Started')
    } catch (error) {
      console.error('[RECORDING] Failed to start:', error)
      alert('Failed to start recording. Please check camera permissions.')
    }
  }, [sessionId])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }

      console.log('[RECORDING] Stopped')
    }
  }, [isRecording])

  // ========== SCREENSHOT WITH METADATA ==========

  const captureScreenshotWithMetadata = useCallback(async () => {
    setCapturingScreenshot(true)

    try {
      // Try multiple selectors to find the video element
      let mainVideo = document.querySelector('video[data-lk-participant-name]') as HTMLVideoElement

      if (!mainVideo) {
        // Fallback: try to find any video element
        const videos = document.querySelectorAll('video')
        mainVideo = Array.from(videos).find(v => v.readyState === v.HAVE_ENOUGH_DATA) as HTMLVideoElement
      }

      if (!mainVideo) {
        console.error('[SCREENSHOT] No video element found')
        alert('No video found. Please try again.')
        setCapturingScreenshot(false)
        return
      }

      if (mainVideo.readyState !== mainVideo.HAVE_ENOUGH_DATA) {
        console.error('[SCREENSHOT] Video not ready, readyState:', mainVideo.readyState)
        alert('Video not ready. Please wait and try again.')
        setCapturingScreenshot(false)
        return
      }

      console.log('[SCREENSHOT] Capturing from video:', {
        width: mainVideo.videoWidth,
        height: mainVideo.videoHeight,
        readyState: mainVideo.readyState
      })

      // Create canvas
      const canvas = document.createElement('canvas')
      canvas.width = mainVideo.videoWidth
      canvas.height = mainVideo.videoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('[SCREENSHOT] Failed to get canvas context')
        setCapturingScreenshot(false)
        return
      }

      // Draw video frame
      ctx.drawImage(mainVideo, 0, 0, canvas.width, canvas.height)

      // Add metadata overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, canvas.height - 80, canvas.width, 80)

      ctx.fillStyle = 'white'
      ctx.font = 'bold 16px Arial'

      // Timestamp
      const timestamp = new Date().toLocaleString()
      ctx.fillText(`📅 ${timestamp}`, 20, canvas.height - 50)

      // Session ID
      ctx.fillText(`🔖 Session: ${sessionId.slice(0, 8)}...`, 20, canvas.height - 25)

      // Tags (if any)
      if (activeTags.length > 0) {
        ctx.fillText(`🏷️ ${activeTags.join(', ')}`, canvas.width / 2, canvas.height - 50)
      }

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('[SCREENSHOT] Captured with metadata')
          onCaptureScreenshot(blob)

          // Also save locally
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `inspection-${sessionId}-${Date.now()}.png`
          a.click()
          URL.revokeObjectURL(url)
        }
        setCapturingScreenshot(false)
      }, 'image/png')
    } catch (error) {
      console.error('[SCREENSHOT] Error:', error)
      alert('Failed to capture screenshot')
      setCapturingScreenshot(false)
    }
  }, [sessionId, activeTags, onCaptureScreenshot])

  // ========== GRID OVERLAY ==========

  const toggleGrid = useCallback(() => {
    const types: Array<typeof gridType> = ['none', 'thirds', 'alignment', 'crosshair']
    const currentIndex = types.indexOf(gridType)
    const nextIndex = (currentIndex + 1) % types.length
    setGridType(types[nextIndex])
  }, [gridType])

  // ========== FREEZE FRAME ==========

  const toggleFreezeFrame = useCallback(() => {
    if (!isFrameFrozen) {
      // Capture current frame
      const mainVideo = document.querySelector('video[data-lk-participant-name]') as HTMLVideoElement

      if (mainVideo && mainVideo.readyState === mainVideo.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement('canvas')
        canvas.width = mainVideo.videoWidth
        canvas.height = mainVideo.videoHeight

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(mainVideo, 0, 0, canvas.width, canvas.height)
          setFrozenFrameData(canvas.toDataURL('image/png'))
          setIsFrameFrozen(true)
        }
      }
    } else {
      setIsFrameFrozen(false)
      setFrozenFrameData(null)
    }
  }, [isFrameFrozen])

  // ========== VOICE NOTES with Web Speech API ==========

  const toggleVoiceNote = useCallback(async () => {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Voice notes not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }

    if (isRecordingVoice) {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsRecordingVoice(false)
      return
    }

    // Start recording
    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      let finalTranscript = ''

      recognition.onstart = () => {
        console.log('[VOICE] Recording started')
        setIsRecordingVoice(true)
        setVoiceTranscription('')
      }

      recognition.onresult = (event: any) => {
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        setVoiceTranscription(finalTranscript + interimTranscript)
        console.log('[VOICE] Transcript:', finalTranscript + interimTranscript)
      }

      recognition.onend = async () => {
        console.log('[VOICE] Recording stopped')
        setIsRecordingVoice(false)

        // Save to database if there's content
        if (finalTranscript.trim()) {
          try {
            const response = await fetch(`/api/sessions/${sessionId}/files`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file_category: 'voice_transcript',
                transcript: finalTranscript.trim(),
                tags: activeTags,
                metadata: {
                  timestamp: new Date().toISOString(),
                  duration_seconds: 0 // Web Speech API doesn't provide duration
                }
              })
            })

            if (response.ok) {
              console.log('[VOICE] ✅ Saved to database')
              setVoiceTranscription('') // Clear for next recording
            } else {
              console.error('[VOICE] Failed to save:', await response.text())
            }
          } catch (error) {
            console.error('[VOICE] Save error:', error)
          }
        }
      }

      recognition.onerror = (event: any) => {
        console.error('[VOICE] Error:', event.error)
        setIsRecordingVoice(false)
        if (event.error === 'not-allowed') {
          alert('Microphone permission denied. Please allow microphone access in your browser settings.')
        } else if (event.error === 'no-speech') {
          // Ignore no-speech errors
        } else {
          alert(`Voice recognition error: ${event.error}`)
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (error) {
      console.error('[VOICE] Failed to start recognition:', error)
      setIsRecordingVoice(false)
      alert('Failed to start voice recognition. Please try again.')
    }
  }, [isRecordingVoice, sessionId, activeTags])

  // ========== TAGS SYSTEM ==========

  const toggleTag = useCallback((tag: string) => {
    setActiveTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }, [])

  // ========== FILE UPLOAD ==========

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileUpload(file)
    }
  }, [onFileUpload])

  // ========== ORIENTATION LOCK ==========

  const toggleOrientationLock = useCallback(async () => {
    try {
      if (!orientationLocked) {
        // Lock to current orientation
        const currentOrientation = window.screen.orientation.type.includes('portrait')
          ? 'portrait'
          : 'landscape'

        if ('lock' in window.screen.orientation) {
          await window.screen.orientation.lock(currentOrientation as OrientationLockType)
          setOrientationLocked(true)
          orientationLockRef.current = currentOrientation as OrientationLockType
          console.log(`[ORIENTATION] Locked to ${currentOrientation}`)
        } else {
          alert('Orientation lock not supported on this device')
        }
      } else {
        // Unlock orientation
        if ('unlock' in window.screen.orientation) {
          window.screen.orientation.unlock()
          setOrientationLocked(false)
          orientationLockRef.current = null
          console.log('[ORIENTATION] Unlocked')
        }
      }
    } catch (error) {
      console.error('[ORIENTATION] Error:', error)
      // Orientation lock might not be supported in this context
      setOrientationLocked(!orientationLocked)
    }
  }, [orientationLocked])

  // ========== CLOSE DROPDOWNS ON OUTSIDE CLICK ==========

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (qualityDropdownRef.current && !qualityDropdownRef.current.contains(event.target as Node)) {
        setShowQualityDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ========== FORMAT RECORDING DURATION ==========

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // ========== RENDER ==========

  return (
    <>
      {/* Grid Overlay Canvas */}
      {gridType !== 'none' && (
        <GridOverlay
          type={gridType}
          opacity={gridOpacity}
          color={gridColor}
        />
      )}

      {/* Frozen Frame Overlay */}
      {isFrameFrozen && frozenFrameData && (
        <div className="absolute inset-0 z-[40] pointer-events-none">
          <img
            src={frozenFrameData}
            alt="Frozen frame"
            className="w-full h-full object-contain"
          />
          <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            ⏸️ FROZEN
          </div>
        </div>
      )}

      {/* Zoom Indicator */}
      {zoomLevel > 1 && (
        <div className="absolute top-4 right-4 z-[45] bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm font-bold backdrop-blur-sm">
          🔍 {zoomLevel}x
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[45] bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 animate-pulse">
          <div className="w-3 h-3 bg-white rounded-full"></div>
          REC {formatDuration(recordingDuration)}
        </div>
      )}

      {/* Voice Recognition Indicator & Transcription */}
      {isRecordingVoice && (
        <div className="absolute top-16 left-4 right-4 z-[45] max-w-2xl mx-auto">
          <div className="bg-purple-500/90 backdrop-blur-md text-white px-4 py-3 rounded-lg shadow-2xl border-2 border-purple-300/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-1">
                <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-sm font-bold">Listening...</span>
            </div>
            {voiceTranscription && (
              <div className="text-sm leading-relaxed bg-white/20 px-3 py-2 rounded">
                {voiceTranscription}
              </div>
            )}
            <div className="text-xs mt-2 opacity-75">Click voice note button again to stop and save</div>
          </div>
        </div>
      )}

      {/* Main Controls Container */}
      <div className="flex flex-col gap-2">
        {/* Desktop: Collapse/Expand Toggle */}
        <div className="hidden lg:flex justify-center">
          <button
            onClick={() => setControlsCollapsed(!controlsCollapsed)}
            className="rounded-lg bg-slate-700/80 px-4 py-2 text-white backdrop-blur-sm hover:bg-slate-600/80 transition flex items-center gap-2"
          >
            {controlsCollapsed ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span className="text-sm">Show Controls</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span className="text-sm">Hide Controls</span>
              </>
            )}
          </button>
        </div>

        {/* Mobile: Slide-up Drawer Trigger */}
        <div className="block sm:hidden">
          <button
            onClick={() => setActiveControlGroup(activeControlGroup === 'all' ? 'session' : 'all')}
            className="w-full rounded-lg bg-slate-700/80 px-4 py-2 text-white backdrop-blur-sm"
          >
            {activeControlGroup === 'all' ? 'Hide Controls' : 'Show Controls'}
          </button>
        </div>

        {/* Desktop & Mobile Expanded: All Controls */}
        <div className={`flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 ${
          activeControlGroup !== 'all' && 'hidden sm:flex'
        } ${
          controlsCollapsed && 'hidden lg:hidden'
        }`}>

          {/* ===== GROUP 1: CAPTURE CONTROLS ===== */}
          <div className="flex items-center gap-1.5 rounded-lg p-1.5">
            {/* Screenshot with Metadata */}
            <button
              onClick={captureScreenshotWithMetadata}
              disabled={capturingScreenshot}
              className="group relative rounded-lg bg-blue-500/80 p-2 text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:p-3"
              title="Capture screenshot with timestamp"
            >
              <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
              {!capturingScreenshot && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[8px] font-bold">
                  📅
                </span>
              )}
            </button>

            {/* Video Recording */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`rounded-lg p-2 transition sm:p-3 ${
                isRecording
                  ? 'bg-red-500/80 text-white hover:bg-red-600 animate-pulse'
                  : 'bg-slate-700/80 text-white hover:bg-slate-600'
              }`}
              title={isRecording ? 'Stop recording' : 'Start video recording'}
            >
              {isRecording ? (
                <StopCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
          </div>

          {/* ===== GROUP 2: VIEW ENHANCEMENT CONTROLS ===== */}
          <div className="flex items-center gap-1.5 rounded-lg p-1.5">
            {/* Zoom Toggle - Cycles through 1x, 2x, 4x, 8x */}
            <button
              onClick={() => {
                const levels = [1, 2, 4, 8]
                const currentIndex = levels.indexOf(zoomLevel)
                const nextIndex = (currentIndex + 1) % levels.length
                setZoomLevel(levels[nextIndex])
              }}
              className={`rounded-lg p-2 transition sm:p-3 min-w-[50px] ${
                zoomLevel > 1
                  ? 'bg-blue-500/80 text-white hover:bg-blue-600'
                  : 'bg-slate-700/80 text-white hover:bg-slate-600'
              }`}
              title={`Zoom: ${zoomLevel}x (click to cycle)`}
            >
              <div className="flex items-center gap-1">
                <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs font-bold">{zoomLevel}x</span>
              </div>
            </button>

            {/* Freeze Frame */}
            <button
              onClick={toggleFreezeFrame}
              className={`rounded-lg p-2 transition sm:p-3 ${
                isFrameFrozen
                  ? 'bg-orange-500/80 text-white hover:bg-orange-600'
                  : 'bg-slate-700/80 text-white hover:bg-slate-600'
              }`}
              title={isFrameFrozen ? 'Unfreeze frame' : 'Freeze frame'}
            >
              <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* ===== GROUP 3: DOCUMENTATION CONTROLS ===== */}
          <div className="flex items-center gap-1.5 rounded-lg p-1.5">
            {/* Voice Notes */}
            <button
              onClick={toggleVoiceNote}
              className={`rounded-lg p-2 transition sm:p-3 ${
                isRecordingVoice
                  ? 'bg-purple-500/80 text-white hover:bg-purple-600 animate-pulse'
                  : 'bg-slate-700/80 text-white hover:bg-slate-600'
              }`}
              title="Voice note"
            >
              <Mic2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Tags Panel - Mechanic Only */}
            {userRole === 'mechanic' && (
              <button
                onClick={() => setShowTagsPanel(!showTagsPanel)}
                className={`relative rounded-lg p-2 transition sm:p-3 ${
                  activeTags.length > 0
                    ? 'bg-yellow-500/80 text-white hover:bg-yellow-600'
                    : 'bg-slate-700/80 text-white hover:bg-slate-600'
                }`}
                title="Tags"
              >
                <Tag className="h-4 w-4 sm:h-5 sm:w-5" />
                {activeTags.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {activeTags.length}
                  </span>
                )}
              </button>
            )}

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
          </div>

          {/* ===== GROUP 4: CAMERA SETTINGS ===== */}
          <div className="flex items-center gap-1.5 rounded-lg p-1.5">
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

            {/* Camera Flip */}
            {availableCameras.length > 1 && isCameraEnabled && (
              <button
                onClick={flipCamera}
                className="rounded-lg bg-slate-700/80 p-2 text-white transition hover:bg-slate-600 sm:p-3"
                title="Switch camera"
              >
                <SwitchCamera className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}

            {/* Flashlight Toggle */}
            {isCameraEnabled && (torchSupported || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) && (
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

            {/* Focus Lock */}
            <button
              onClick={() => setFocusLocked(!focusLocked)}
              className={`rounded-lg p-2 transition sm:p-3 ${
                focusLocked
                  ? 'bg-cyan-500/80 text-white hover:bg-cyan-600'
                  : 'bg-slate-700/80 text-white hover:bg-slate-600'
              }`}
              title={focusLocked ? 'Unlock focus' : 'Lock focus'}
            >
              {focusLocked ? <Lock className="h-4 w-4 sm:h-5 sm:w-5" /> : <Unlock className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>

            {/* Orientation Lock */}
            <button
              onClick={toggleOrientationLock}
              className={`rounded-lg p-2 transition sm:p-3 ${
                orientationLocked
                  ? 'bg-indigo-500/80 text-white hover:bg-indigo-600'
                  : 'bg-slate-700/80 text-white hover:bg-slate-600'
              }`}
              title={orientationLocked ? 'Unlock screen rotation' : 'Lock screen rotation'}
            >
              <ScreenShare className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* ===== GROUP 5: SESSION CONTROLS ===== */}
          <div className="flex items-center gap-1.5 rounded-lg p-1.5">
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

            {/* Screen Share */}
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

            {/* Chat Toggle */}
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

            {/* Swap View */}
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

            {/* Fullscreen */}
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
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 rounded-lg border border-slate-600 bg-slate-800/95 p-2 shadow-xl backdrop-blur-sm z-[70]">
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
                </div>
              )}
            </div>

            {/* Drawing Tools - Mechanic Only (moved outside gear) */}
            {userRole === 'mechanic' && onToggleAnnotations && (
              <button
                onClick={onToggleAnnotations}
                className={`rounded-lg p-2 transition sm:p-3 ${
                  showAnnotations
                    ? 'bg-red-500/80 text-white hover:bg-red-600 ring-2 ring-red-400/50'
                    : 'bg-slate-700/80 text-white hover:bg-slate-600'
                }`}
                title={showAnnotations ? 'Hide drawing tools' : 'Show drawing tools'}
              >
                <Pencil className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
          </div>

          {/* ===== GROUP 6: HELP ===== */}
          <div className="flex items-center gap-1.5 rounded-lg p-1.5">
            <button
              onClick={() => setShowTutorial(!showTutorial)}
              className={`rounded-lg p-2 transition sm:p-3 ${
                showTutorial
                  ? 'bg-yellow-500/80 text-white hover:bg-yellow-600'
                  : 'bg-slate-700/80 text-white hover:bg-slate-600'
              }`}
              title="Show tutorial"
            >
              <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tags Panel - Draggable & Mobile-First */}
      {showTagsPanel && (
        <div
          className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
          onMouseMove={(e) => {
            if (isDraggingTags) {
              setTagsPanelPosition({
                x: e.clientX - tagsDragStart.x,
                y: e.clientY - tagsDragStart.y
              })
            }
          }}
          onMouseUp={() => setIsDraggingTags(false)}
          onTouchMove={(e) => {
            if (isDraggingTags && e.touches[0]) {
              setTagsPanelPosition({
                x: e.touches[0].clientX - tagsDragStart.x,
                y: e.touches[0].clientY - tagsDragStart.y
              })
            }
          }}
          onTouchEnd={() => setIsDraggingTags(false)}
        >
          <div
            className="absolute top-1/2 left-1/2 w-[90vw] max-w-sm sm:max-w-md rounded-xl border border-yellow-500/30 bg-slate-900/95 shadow-2xl cursor-move"
            style={{
              transform: `translate(calc(-50% + ${tagsPanelPosition.x}px), calc(-50% + ${tagsPanelPosition.y}px))`,
              userSelect: 'none',
              maxHeight: '80vh'
            }}
            onMouseDown={(e) => {
              setIsDraggingTags(true)
              setTagsDragStart({ x: e.clientX - tagsPanelPosition.x, y: e.clientY - tagsPanelPosition.y })
            }}
            onTouchStart={(e) => {
              if (e.touches[0]) {
                setIsDraggingTags(true)
                setTagsDragStart({ x: e.touches[0].clientX - tagsPanelPosition.x, y: e.touches[0].clientY - tagsPanelPosition.y })
              }
            }}
          >
            <div className="flex flex-col max-h-[80vh]">
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-slate-700">
                <h3 className="text-sm font-bold text-white">🏷️ Quick Tags</h3>
                <button
                  onClick={() => setShowTagsPanel(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Active Tags Summary */}
              {activeTags.length > 0 && (
                <div className="px-3 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
                  <div className="text-xs text-yellow-300 font-medium mb-1">
                    Selected: {activeTags.length}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {activeTags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-300">
                        {tag}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleTag(tag)
                          }}
                          className="hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Scrollable Tags Grid */}
              <div className="overflow-y-auto p-3" style={{ maxHeight: 'calc(80vh - 120px)' }}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {predefinedTags.map(tag => (
                    <button
                      key={tag}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleTag(tag)
                      }}
                      className={`rounded-lg px-2 py-2 text-xs font-medium transition text-left ${
                        activeTags.includes(tag)
                          ? 'bg-yellow-500 text-white shadow-lg'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-2 border-t border-slate-700 text-center">
                <button
                  onClick={() => setShowTagsPanel(false)}
                  className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorial && (
        <TutorialModal
          onClose={() => setShowTutorial(false)}
        />
      )}
    </>
  )
}

// ========== GRID OVERLAY COMPONENT ==========

interface GridOverlayProps {
  type: 'thirds' | 'alignment' | 'crosshair'
  opacity: number
  color: 'white' | 'yellow' | 'red' | 'green'
}

function GridOverlay({ type, opacity, color }: GridOverlayProps) {
  const colorMap = {
    white: '#ffffff',
    yellow: '#fbbf24',
    red: '#ef4444',
    green: '#10b981'
  }

  return (
    <svg
      className="absolute inset-0 z-[40] pointer-events-none"
      style={{ opacity }}
    >
      {type === 'thirds' && (
        <>
          {/* Vertical lines */}
          <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke={colorMap[color]} strokeWidth="2" />
          <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke={colorMap[color]} strokeWidth="2" />
          {/* Horizontal lines */}
          <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke={colorMap[color]} strokeWidth="2" />
          <line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke={colorMap[color]} strokeWidth="2" />
        </>
      )}

      {type === 'alignment' && (
        <>
          {/* Center vertical */}
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke={colorMap[color]} strokeWidth="2" />
          {/* Center horizontal */}
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke={colorMap[color]} strokeWidth="2" />
        </>
      )}

      {type === 'crosshair' && (
        <>
          {/* Full crosshair */}
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke={colorMap[color]} strokeWidth="3" />
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke={colorMap[color]} strokeWidth="3" />
          {/* Center circle */}
          <circle cx="50%" cy="50%" r="40" fill="none" stroke={colorMap[color]} strokeWidth="2" />
        </>
      )}
    </svg>
  )
}

// ========== TUTORIAL MODAL COMPONENT ==========

interface TutorialModalProps {
  onClose: () => void
}

function TutorialModal({ onClose }: TutorialModalProps) {
  const [step, setStep] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const tutorials = [
    {
      title: '📸 Screenshot',
      description: 'Capture with tags & metadata',
      icon: <Camera className="h-5 w-5" />
    },
    {
      title: '🎤 Voice Notes',
      description: 'Auto-transcribed observations',
      icon: <Mic2 className="h-5 w-5" />
    },
    {
      title: '🔍 Zoom',
      description: 'Click to cycle: 1x → 2x → 4x → 8x',
      icon: <ZoomIn className="h-5 w-5" />
    },
    {
      title: '⏸️ Freeze',
      description: 'Pause video, keep audio',
      icon: <Pause className="h-5 w-5" />
    },
    {
      title: '🏷️ Tags',
      description: '40+ categories for organizing',
      icon: <Tag className="h-5 w-5" />
    },
    {
      title: '🔒 Locks',
      description: 'Focus & orientation locking',
      icon: <Lock className="h-5 w-5" />
    }
  ]

  const nextStep = () => {
    if (step < tutorials.length - 1) {
      setStep(step + 1)
    } else {
      onClose()
    }
  }

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div
        className="absolute top-1/2 left-1/2 w-80 sm:w-96 rounded-xl bg-slate-900/95 border border-blue-500/30 shadow-2xl cursor-move"
        style={{
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">Quick Help</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0 rounded-lg bg-blue-500/20 p-2 text-blue-400">
              {tutorials[step].icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white mb-1">{tutorials[step].title}</h3>
              <p className="text-xs text-slate-300">{tutorials[step].description}</p>
            </div>
          </div>

          <div className="flex justify-center gap-1 mb-3">
            {tutorials.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 w-1.5 rounded-full transition ${
                  index === step ? 'bg-blue-500' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className="flex-1 rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ←
            </button>

            <div className="text-xs text-slate-400">
              {step + 1}/{tutorials.length}
            </div>

            <button
              onClick={nextStep}
              className="flex-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
            >
              {step === tutorials.length - 1 ? '✓' : '→'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
