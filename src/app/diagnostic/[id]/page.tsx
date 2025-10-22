'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import VideoSessionClient from './VideoSessionClient'

type PlanKey = 'chat10' | 'video15' | 'diagnostic'

export default function DiagnosticSessionPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [plan, setPlan] = useState<PlanKey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const sessionId = params.id
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://myautodoctorca-oe6r6oqr.livekit.cloud'

  useEffect(() => {
    async function initializeSession() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push(`/signup?redirect=/diagnostic/${sessionId}`)
          return
        }

        // Verify session exists and user has access
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('id, type, status, customer_user_id, plan')
          .eq('id', sessionId)
          .single()

        if (sessionError || !session) {
          setError('Session not found')
          setIsLoading(false)
          return
        }

        setPlan((session.plan as PlanKey) || 'diagnostic')

        if (session.customer_user_id !== user.id) {
          // Check if user is a participant
          const { data: participant } = await supabase
            .from('session_participants')
            .select('user_id')
            .eq('session_id', sessionId)
            .eq('user_id', user.id)
            .single()

          if (!participant) {
            setError('You do not have access to this session')
            setIsLoading(false)
            return
          }
        }

        // Generate LiveKit token
        const roomName = `session-${sessionId}`
        const identity = `user-${user.id}`

        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room: roomName,
            identity: identity,
            metadata: JSON.stringify({
              sessionId,
              userId: user.id,
              role: 'customer',
            }),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('LiveKit token error:', errorData)
          throw new Error(errorData.error || errorData.details || 'Failed to generate access token')
        }

        const data = await response.json()
        console.log('LiveKit token received successfully')
        setToken(data.token)
      } catch (err) {
        console.error('Error initializing session:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize session')
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()
  }, [sessionId, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          <p className="text-slate-300">Loading diagnostic session...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="max-w-md rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-center">
          <h1 className="text-lg font-semibold text-red-200">Session Error</h1>
          <p className="mt-2 text-sm text-red-300">{error}</p>
          <button
            onClick={() => router.push('/customer/dashboard')}
            className="mt-4 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!token || !plan) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <p className="text-slate-300">Unable to connect to session</p>
        </div>
      </div>
    )
  }

  return <VideoSessionClient sessionId={sessionId} plan={plan} token={token} serverUrl={serverUrl} />
}
