'use client'

import { useEffect, useState, useMemo } from 'react'
import { Clock, X, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface PendingRequest {
  id: string
  sessionType: string
  planCode: string
  createdAt: string
  expiresAt: string | null
  status: string
}

interface PendingRequestBannerProps {
  initialRequest?: PendingRequest | null
}

export default function PendingRequestBanner({ initialRequest }: PendingRequestBannerProps) {
  const supabase = useMemo(() => createClient(), [])
  const [request, setRequest] = useState<PendingRequest | null>(initialRequest ?? null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)

  // Calculate time remaining
  useEffect(() => {
    if (!request || !request.expiresAt) return

    const updateTimer = () => {
      const now = new Date()
      const expires = new Date(request.expiresAt!)
      const diff = expires.getTime() - now.getTime()

      if (diff <= 0) {
        setIsExpired(true)
        setTimeRemaining('Expired')
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [request])

  // Real-time subscription to detect when request is accepted or expires
  useEffect(() => {
    if (!request) return

    console.log('[PendingRequestBanner] Setting up real-time subscription for request:', request.id)

    const channel = supabase
      .channel('pending-request-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_requests',
          filter: `id=eq.${request.id}`,
        },
        (payload) => {
          console.log('[PendingRequestBanner] Request updated:', payload)
          const updated = payload.new as any

          // If request was accepted or cancelled or expired, remove banner
          if (updated.status !== 'pending') {
            console.log('[PendingRequestBanner] Request resolved, removing banner')
            setRequest(null)
          } else {
            // Update the request data
            setRequest({
              id: updated.id,
              sessionType: updated.session_type,
              planCode: updated.plan_code,
              createdAt: updated.created_at,
              expiresAt: updated.expires_at,
              status: updated.status,
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('[PendingRequestBanner] Subscription status:', status)
      })

    return () => {
      console.log('[PendingRequestBanner] Cleaning up subscription')
      supabase.removeChannel(channel)
    }
  }, [request, supabase])

  const handleCancel = async () => {
    if (!request) return

    if (!confirm('Are you sure you want to cancel this request?')) {
      return
    }

    try {
      const response = await fetch(`/api/requests/${request.id}/cancel`, {
        method: 'POST',
      })

      if (response.ok) {
        setRequest(null)
      } else {
        alert('Failed to cancel request. Please try again.')
      }
    } catch (error) {
      console.error('Error cancelling request:', error)
      alert('An error occurred. Please try again.')
    }
  }

  if (!request) return null

  const sessionLabel =
    request.planCode === 'chat10'
      ? 'Quick Chat'
      : request.sessionType === 'video'
      ? 'Video Session'
      : request.sessionType === 'diagnostic'
      ? 'Diagnostic Session'
      : 'Session'

  return (
    <div className="rounded-2xl border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 p-6 shadow-2xl backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-lg">
            <Clock className="h-6 w-6 text-white" />
            {!isExpired && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex h-4 w-4 rounded-full bg-yellow-500"></span>
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {isExpired ? 'Request Expired' : 'Waiting for Mechanic'}
            </h2>
            <p className="text-sm text-yellow-300">
              {isExpired
                ? 'No mechanics were available'
                : 'Your request is being broadcast to available mechanics'}
            </p>
          </div>
        </div>
        <button
          onClick={handleCancel}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-800/50 text-yellow-200 transition hover:bg-yellow-700/50 hover:text-white"
          title="Cancel request"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-yellow-400/30 bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 p-4">
          <div>
            <p className="text-sm text-yellow-300">Request Type</p>
            <p className="text-lg font-semibold text-white">{sessionLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-yellow-300">
              {isExpired ? 'Expired' : 'Time Remaining'}
            </p>
            <p
              className={`text-2xl font-bold ${
                isExpired
                  ? 'text-red-400'
                  : timeRemaining.startsWith('0:') || timeRemaining.startsWith('1:')
                  ? 'text-red-400'
                  : timeRemaining.startsWith('2:') || timeRemaining.startsWith('3:')
                  ? 'text-yellow-400'
                  : 'text-green-400'
              }`}
            >
              {timeRemaining}
            </p>
          </div>
        </div>

        {isExpired ? (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
              <div>
                <p className="text-sm font-semibold text-red-200">Request Timed Out</p>
                <p className="mt-1 text-xs text-red-300">
                  No mechanics were available to accept your request. Please try again or contact
                  support if you need immediate assistance.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
            <p className="text-xs text-yellow-200">
              <strong>Tip:</strong> Mechanics are typically available during business hours. Your
              request will expire after 15 minutes if not accepted.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
