'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import VirtualSessionCard from '@/components/mechanic/VirtualSessionCard'
import { MessageCircle, Video, RefreshCw, Filter, AlertCircle, CheckCircle2 } from 'lucide-react'

interface VirtualSession {
  id: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  session_type: 'chat' | 'video' | 'upgraded_from_chat'
  status: string
  base_price: number
  total_price: number
  vehicle_info?: any
  issue_description?: string
  created_at: string
  scheduled_start?: string
  scheduled_end?: string
}

export default function VirtualSessionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)  // ✅ Auth guard
  const [isAuthenticated, setIsAuthenticated] = useState(false)  // ✅ Auth guard
  const [refreshing, setRefreshing] = useState(false)
  const [sessions, setSessions] = useState<VirtualSession[]>([])
  const [filter, setFilter] = useState<'pending' | 'accepted' | 'scheduled' | 'completed'>('pending')
  const [error, setError] = useState<string | null>(null)
  const [mechanicInfo, setMechanicInfo] = useState<any>(null)

  const loadSessions = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError(null)

    try {
      const response = await fetch(`/api/mechanics/sessions/virtual?status=${filter}&limit=50`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load sessions')
      }

      setSessions(data.sessions || [])
      setMechanicInfo(data.mechanic)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // ✅ Auth guard - Check mechanic authentication first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/mechanics/me')
        if (!response.ok) {
          router.replace('/mechanic/login')
          return
        }
        setIsAuthenticated(true)
        setAuthChecking(false)
      } catch (err) {
        console.error('Auth check failed:', err)
        router.replace('/mechanic/login')
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (!isAuthenticated) return  // ✅ Wait for auth check
    loadSessions()
  }, [filter, isAuthenticated])

  const handleAcceptSession = async (sessionId: string) => {
    try {
      const response = await fetch('/api/mechanics/sessions/virtual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept session')
      }

      // Redirect to session page
      router.push(data.redirect_url)

    } catch (err: any) {
      throw new Error(err.message)
    }
  }

  const handleViewSession = (sessionId: string) => {
    router.push(`/mechanic/session/${sessionId}`)
  }

  const getFilterStats = () => {
    // In a real app, this would come from the API
    return {
      pending: sessions.length,
      accepted: 0,
      scheduled: 0,
      completed: 0
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading virtual sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Virtual Consultations</h1>
              <p className="text-slate-400 mt-1">
                Manage your chat and video consultation requests
              </p>
            </div>

            <button
              onClick={() => loadSessions(false)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 border border-slate-700 rounded-lg hover:bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Service Tier Badge */}
          {mechanicInfo && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {mechanicInfo.service_tier === 'virtual_only'
                  ? 'Virtual Consultation Specialist'
                  : 'Workshop-Affiliated (Virtual + Physical)'}
              </span>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow-sm p-2 inline-flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>Pending</span>
              {filter === 'pending' && sessions.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-slate-800/50 backdrop-blur-sm border border-slate-700 text-blue-600 rounded-full text-xs font-semibold">
                  {sessions.length}
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setFilter('accepted')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'accepted'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-gray-100'
            }`}
          >
            Accepted
          </button>

          <button
            onClick={() => setFilter('scheduled')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'scheduled'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-gray-100'
            }`}
          >
            Scheduled
          </button>

          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Completed</span>
            </div>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl border-2 border-dashed border-slate-700 p-12 text-center">
            <div className="max-w-md mx-auto">
              {filter === 'pending' ? (
                <>
                  <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    No Pending Requests
                  </h3>
                  <p className="text-slate-400 mb-6">
                    New virtual consultation requests will appear here. You'll be notified when customers request your expertise.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Tip:</strong> Make sure your availability is set and your profile is complete to receive more requests!
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-gray-400 mb-4">
                    {filter === 'accepted' && <CheckCircle2 className="w-16 h-16 mx-auto" />}
                    {filter === 'scheduled' && <Video className="w-16 h-16 mx-auto" />}
                    {filter === 'completed' && <CheckCircle2 className="w-16 h-16 mx-auto" />}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    No {filter.charAt(0).toUpperCase() + filter.slice(1)} Sessions
                  </h3>
                  <p className="text-slate-400">
                    You don't have any {filter} sessions at the moment.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map(session => (
              <VirtualSessionCard
                key={session.id}
                session={session}
                onAccept={filter === 'pending' ? handleAcceptSession : undefined}
                onView={handleViewSession}
              />
            ))}
          </div>
        )}

        {/* Earnings Summary for Pending */}
        {filter === 'pending' && sessions.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-green-900 mb-1">
                  Potential Earnings (if you accept all)
                </h3>
                <p className="text-3xl font-bold text-green-900">
                  ${sessions.reduce((sum, s) => sum + (s.total_price * 0.85), 0).toFixed(2)}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  {sessions.length} session{sessions.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-green-700 mb-1">Average per session</div>
                <div className="text-2xl font-bold text-green-900">
                  ${((sessions.reduce((sum, s) => sum + s.total_price, 0) / sessions.length) * 0.85).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
