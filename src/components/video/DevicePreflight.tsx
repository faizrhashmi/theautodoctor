'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, XCircle, Loader2, Video, Mic } from 'lucide-react'

type PreflightStatus = 'checking' | 'passed' | 'failed'

interface DevicePreflightProps {
  onComplete: () => void
}

export function DevicePreflight({ onComplete }: DevicePreflightProps) {
  const [cameraStatus, setCameraStatus] = useState<PreflightStatus>('checking')
  const [micStatus, setMicStatus] = useState<PreflightStatus>('checking')
  const [networkStatus, setNetworkStatus] = useState<PreflightStatus>('checking')
  const [networkRTT, setNetworkRTT] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    testDevices()
    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

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
      setNetworkStatus(rtt < 300 ? 'passed' : 'failed')
    } catch (err) {
      console.error('Network test failed:', err)
      setNetworkStatus('failed')
    }
  }

  const allPassed = cameraStatus === 'passed' && micStatus === 'passed' && networkStatus === 'passed'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <h2 className="mb-6 text-2xl font-bold text-white">Device Check</h2>
        <p className="mb-6 text-sm text-slate-400">
          We need to test your camera, microphone, and connection before you can join.
        </p>

        {/* Camera Preview */}
        <div className="mb-6">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-64 w-full rounded-lg border border-slate-700 bg-black object-cover"
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

        {/* Join Button */}
        <button
          onClick={onComplete}
          disabled={!allPassed}
          className="mt-6 w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {allPassed ? 'Join Session' : 'Fix Issues to Continue'}
        </button>

        {!allPassed && (
          <p className="mt-4 text-center text-sm text-slate-400">
            Please allow camera and microphone access, then check your internet connection.
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
    <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4">
      <div className="flex items-center gap-3">
        <div className="text-slate-400">{icon}</div>
        <span className="font-medium text-white">{label}</span>
        {detail && <span className="text-sm text-slate-400">{detail}</span>}
      </div>
      <div>
        {status === 'checking' && <Loader2 className="h-5 w-5 animate-spin text-blue-400" />}
        {status === 'passed' && <CheckCircle className="h-5 w-5 text-green-500" />}
        {status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
      </div>
    </div>
  )
}
