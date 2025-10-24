'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, XCircle, Loader2, Video, Mic, AlertTriangle } from 'lucide-react'

type PreflightStatus = 'checking' | 'passed' | 'failed'
type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'critical'

interface DevicePreflightProps {
  onComplete: () => void
  skipPreflight?: boolean // ⚠️ TESTING ONLY - REMOVE BEFORE PRODUCTION
}

export function DevicePreflight({ onComplete, skipPreflight = false }: DevicePreflightProps) {
  const [cameraStatus, setCameraStatus] = useState<PreflightStatus>('checking')
  const [micStatus, setMicStatus] = useState<PreflightStatus>('checking')
  const [networkStatus, setNetworkStatus] = useState<PreflightStatus>('checking')
  const [networkRTT, setNetworkRTT] = useState<number | null>(null)
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Helper function to determine network quality
  function getNetworkQuality(rtt: number): NetworkQuality {
    if (rtt < 100) return 'excellent'
    if (rtt < 300) return 'good'
    if (rtt < 500) return 'fair'
    if (rtt < 1000) return 'poor'
    return 'critical'
  }

  useEffect(() => {
    // ⚠️ TESTING ONLY - REMOVE BEFORE PRODUCTION
    // If skipPreflight is enabled, bypass all checks
    if (skipPreflight) {
      setCameraStatus('passed')
      setMicStatus('passed')
      setNetworkStatus('passed')
      setNetworkRTT(50)
      setNetworkQuality('excellent')
      return
    }

    testDevices()
    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [skipPreflight])

  async function testDevices() {
    // Test camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraStatus('passed')
    } catch (err) {
      console.error('Camera test failed:', err)
      setCameraStatus('failed')
    }

    // Test microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop()) // Don't keep mic open
      setMicStatus('passed')
    } catch (err) {
      console.error('Mic test failed:', err)
      setMicStatus('failed')
    }

    // Test network (ping API)
    try {
      const start = Date.now()
      await fetch('/api/health', { method: 'GET' })
      const rtt = Date.now() - start
      setNetworkRTT(rtt)
      const quality = getNetworkQuality(rtt)
      setNetworkQuality(quality)
      // Only fail if network is completely offline (no response or > 2000ms)
      setNetworkStatus(rtt < 2000 ? 'passed' : 'failed')
    } catch (err) {
      console.error('Network test failed:', err)
      setNetworkStatus('failed')
      setNetworkQuality(null)
    }
  }

  // Only block on camera/mic failures - network warnings are shown but don't block
  const isDevelopment = process.env.NODE_ENV === 'development'
  const canJoin = isDevelopment ? true : (cameraStatus === 'passed' && micStatus === 'passed')
  const hasNetworkWarning = networkQuality && ['fair', 'poor', 'critical'].includes(networkQuality)

  // Helper function to get network warning message
  function getNetworkWarningMessage(quality: NetworkQuality | null): string | null {
    if (!quality) return null
    switch (quality) {
      case 'excellent':
      case 'good':
        return null
      case 'fair':
        return 'Your connection is slower than recommended. You may experience minor delays.'
      case 'poor':
        return 'Your connection is slow. You may experience significant lag and audio drops.'
      case 'critical':
        return 'Your connection is very slow. You may experience severe quality issues. Consider switching networks or moving closer to your router.'
      default:
        return null
    }
  }

  const networkWarning = getNetworkWarningMessage(networkQuality)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-6 md:p-8">
        {/* ⚠️ TESTING MODE WARNING - REMOVE BEFORE PRODUCTION */}
        {skipPreflight && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border-2 border-red-500 bg-red-500/20 p-4 text-red-200">
            <AlertTriangle className="h-6 w-6 flex-shrink-0" />
            <div>
              <p className="font-bold">⚠️ TESTING MODE - PREFLIGHT CHECKS BYPASSED</p>
              <p className="text-sm">Remove ?skipPreflight=true before production deployment</p>
            </div>
          </div>
        )}

        <h2 className="mb-4 text-xl font-bold text-white sm:mb-6 sm:text-2xl">Device Check</h2>
        <p className="mb-4 text-xs text-slate-400 sm:mb-6 sm:text-sm">
          We need to test your camera, microphone, and connection before you can join.
        </p>

        {/* Camera Preview */}
        <div className="mb-4 sm:mb-6">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-48 w-full rounded-lg border border-slate-700 bg-black object-cover sm:h-56 md:h-64"
          />
        </div>

        {/* Status Checks */}
        <div className="space-y-3">
          <StatusRow icon={<Video className="h-5 w-5" />} label="Camera" status={cameraStatus} />
          <StatusRow icon={<Mic className="h-5 w-5" />} label="Microphone" status={micStatus} />
          <StatusRow
            icon={<div className="h-5 w-5">⚡</div>}
            label="Network"
            status={networkStatus}
            detail={networkRTT ? `${networkRTT}ms RTT` : undefined}
          />
        </div>

        {/* Network Warning Banner */}
        {networkWarning && (
          <div className={`mt-4 rounded-lg border p-3 sm:p-4 ${
            networkQuality === 'fair'
              ? 'border-yellow-500/50 bg-yellow-500/10'
              : networkQuality === 'poor'
              ? 'border-orange-500/50 bg-orange-500/10'
              : 'border-red-500/50 bg-red-500/10'
          }`}>
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
                networkQuality === 'fair'
                  ? 'text-yellow-400'
                  : networkQuality === 'poor'
                  ? 'text-orange-400'
                  : 'text-red-400'
              }`} />
              <div>
                <p className={`text-sm font-semibold sm:text-base ${
                  networkQuality === 'fair'
                    ? 'text-yellow-200'
                    : networkQuality === 'poor'
                    ? 'text-orange-200'
                    : 'text-red-200'
                }`}>
                  {networkQuality === 'fair' ? 'Fair Connection' : networkQuality === 'poor' ? 'Poor Connection' : 'Critical Connection'}
                </p>
                <p className={`mt-1 text-xs sm:text-sm ${
                  networkQuality === 'fair'
                    ? 'text-yellow-300'
                    : networkQuality === 'poor'
                    ? 'text-orange-300'
                    : 'text-red-300'
                }`}>
                  {networkWarning}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Join Button */}
        <button
          onClick={onComplete}
          disabled={!canJoin}
          className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6 sm:px-6 sm:py-3 sm:text-base ${
            !canJoin
              ? 'bg-slate-600 hover:bg-slate-700'
              : hasNetworkWarning && networkQuality === 'critical'
              ? 'bg-red-600 hover:bg-red-700'
              : hasNetworkWarning && networkQuality === 'poor'
              ? 'bg-orange-600 hover:bg-orange-700'
              : hasNetworkWarning && networkQuality === 'fair'
              ? 'bg-yellow-600 hover:bg-yellow-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {!canJoin
            ? 'Fix Issues to Continue'
            : hasNetworkWarning
            ? 'Join Anyway'
            : 'Join Session'
          }
        </button>

        {/* Retry Test Button */}
        {hasNetworkWarning && (
          <button
            onClick={testDevices}
            className="mt-3 w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 sm:text-base"
          >
            🔄 Retry Connection Test
          </button>
        )}

        {!canJoin && (
          <p className="mt-3 text-center text-xs text-slate-400 sm:mt-4 sm:text-sm">
            Please allow camera and microphone access to continue.
          </p>
        )}
      </div>
    </div>
  )
}

function StatusRow({
  icon,
  label,
  status,
  detail,
}: {
  icon: React.ReactNode
  label: string
  status: PreflightStatus
  detail?: string
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3 sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="text-slate-400">{icon}</div>
        <span className="text-sm font-medium text-white sm:text-base">{label}</span>
        {detail && <span className="text-xs text-slate-400 sm:text-sm">{detail}</span>}
      </div>
      <div>
        {status === 'checking' && <Loader2 className="h-5 w-5 animate-spin text-blue-400" />}
        {status === 'passed' && <CheckCircle className="h-5 w-5 text-green-500" />}
        {status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
      </div>
    </div>
  )
}
