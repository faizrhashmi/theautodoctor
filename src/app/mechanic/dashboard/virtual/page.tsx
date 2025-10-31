'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageCircle,
  Video,
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
  Calendar,
  AlertCircle,
  Settings,
  ArrowRight
} from 'lucide-react'
import MechanicActiveSessionsManager from '@/components/mechanic/MechanicActiveSessionsManager'
import OnShiftToggle from '@/components/mechanic/OnShiftToggle'

interface DashboardStats {
  pending_sessions: number
  accepted_sessions: number
  completed_today: number
  earnings_today: number
  earnings_week: number
  earnings_month: number
  total_sessions: number
  average_rating: number
}

interface RecentSession {
  id: string
  customer_name: string
  session_type: 'chat' | 'video'
  status: string
  earnings: number
  created_at: string
}

interface ActiveSession {
  id: string
  plan: string
  planLabel: string
  type: 'chat' | 'video' | 'diagnostic'
  typeLabel: string
  status: string
  createdAt: string
  startedAt: string | null
  customerName: string | null
}

export default function VirtualMechanicDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [mechanicInfo, setMechanicInfo] = useState<any>(null)
  const [isAvailable, setIsAvailable] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get mechanic info
      const mechanicRes = await fetch('/api/mechanics/me')
      const mechanicData = await mechanicRes.json()

      if (!mechanicRes.ok) {
        throw new Error(mechanicData.error || 'Failed to load profile')
      }

      setMechanicInfo(mechanicData)
      setIsAvailable(mechanicData.is_active || false)

      // Verify they're virtual-only
      if (mechanicData.service_tier !== 'virtual_only') {
        router.push('/mechanic/dashboard')
        return
      }

      // Get dashboard stats and active sessions in parallel
      const [statsRes, activeSessionsRes] = await Promise.all([
        fetch('/api/mechanics/dashboard/stats'),
        fetch('/api/mechanic/active-sessions')
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats || null)
        setRecentSessions(statsData.recent_sessions || [])
      }

      if (activeSessionsRes.ok) {
        const activeData = await activeSessionsRes.json()
        console.log('[VirtualDashboard] Active sessions:', activeData)
        setActiveSessions(activeData.sessions || [])
      } else {
        console.error('[VirtualDashboard] Failed to fetch active sessions:', activeSessionsRes.status)
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAvailability = async () => {
    try {
      const newStatus = !isAvailable

      const response = await fetch('/api/mechanics/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update availability')
      }

      setIsAvailable(newStatus)

    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 lg:pt-8">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Virtual Consultation Dashboard
              </h1>
              <p className="text-slate-400 mt-1">
                Welcome back, {mechanicInfo?.full_name || 'Mechanic'}!
              </p>
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-slate-400">Availability Status</p>
                <p className={`text-sm font-semibold ${isAvailable ? 'text-green-600' : 'text-slate-400'}`}>
                  {isAvailable ? 'Available for Sessions' : 'Unavailable'}
                </p>
              </div>
              <button
                onClick={handleToggleAvailability}
                className={`relative inline-flex h-11 w-20 items-center rounded-full transition-colors ${
                  isAvailable ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-8 w-8 transform rounded-full bg-slate-800/50 backdrop-blur-sm border border-slate-700 transition-transform ${
                    isAvailable ? 'translate-x-11' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Service Tier Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <MessageCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Virtual Consultation Specialist
            </span>
          </div>
        </div>

        {/* On-Shift Status Toggle */}
        <div className="mb-8">
          <OnShiftToggle onStatusChange={(status) => {
            console.log('[VirtualDashboard] Shift status changed:', status)
          }} />
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

        {/* Active Sessions Manager - Shows active session and enforces one-session-at-a-time rule */}
        {activeSessions.length > 0 && (
          <div className="mb-8">
            <MechanicActiveSessionsManager sessions={activeSessions} />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Pending Sessions */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-400">Pending Requests</p>
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-white">
              {stats?.pending_sessions || 0}
            </p>
            <button
              onClick={() => router.push('/mechanic/sessions/virtual?filter=pending')}
              disabled={activeSessions.length > 0}
              className={`mt-3 text-sm font-medium flex items-center gap-1 py-2.5 ${
                activeSessions.length > 0
                  ? 'text-slate-500 cursor-not-allowed'
                  : 'text-orange-600 hover:text-orange-700'
              }`}
            >
              View requests
              <ArrowRight className="w-4 h-4" />
            </button>
            {activeSessions.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">Complete current session first</p>
            )}
          </div>

          {/* Active Sessions */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-400">Active Sessions</p>
              <Video className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-white">
              {stats?.accepted_sessions || 0}
            </p>
            <button
              onClick={() => router.push('/mechanic/sessions/virtual?filter=accepted')}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 py-2.5"
            >
              View sessions
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Today's Earnings */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-400">Today's Earnings</p>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-white">
              ${(stats?.earnings_today || 0).toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {stats?.completed_today || 0} sessions completed
            </p>
          </div>

          {/* Total Sessions */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-400">Total Sessions</p>
              <CheckCircle2 className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-white">
              {stats?.total_sessions || 0}
            </p>
            {stats && stats.average_rating > 0 && (
              <p className="mt-1 text-sm text-slate-400">
                ⭐ {stats.average_rating.toFixed(1)} average rating
              </p>
            )}
          </div>
        </div>

        {/* Earnings Summary */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Weekly Earnings */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">This Week</h3>
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-4xl font-bold mb-2">
              ${(stats?.earnings_week || 0).toFixed(2)}
            </p>
            <p className="text-blue-100 text-sm">
              Keep it up! You're doing great.
            </p>
          </div>

          {/* Monthly Earnings */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">This Month</h3>
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-4xl font-bold mb-2">
              ${(stats?.earnings_month || 0).toFixed(2)}
            </p>
            <button
              onClick={() => router.push('/mechanic/earnings')}
              className="text-green-100 hover:text-white text-sm font-medium flex items-center gap-1 py-2.5"
            >
              View detailed breakdown
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => activeSessions.length === 0 && router.push('/mechanic/sessions/virtual?filter=pending')}
            disabled={activeSessions.length > 0}
            className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6 text-left transition-all ${
              activeSessions.length > 0
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-slate-700/50 hover:border-orange-500/50'
            }`}
          >
            <Clock className={`w-8 h-8 mb-3 ${activeSessions.length > 0 ? 'text-slate-600' : 'text-orange-500'}`} />
            <h3 className="text-lg font-semibold text-white mb-1">
              View Pending Requests
            </h3>
            <p className="text-sm text-slate-400">
              {activeSessions.length > 0
                ? 'Complete your current session first'
                : 'Accept new consultation requests from customers'}
            </p>
          </button>

          <button
            onClick={() => router.push('/mechanic/sessions/virtual?filter=accepted')}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:bg-slate-700/50 rounded-xl shadow-sm p-6 text-left transition-all hover:border-blue-500/50"
          >
            <Video className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">
              Active Sessions
            </h3>
            <p className="text-sm text-slate-400">
              Continue with your ongoing consultations
            </p>
          </button>

          <button
            onClick={() => router.push('/mechanic/earnings')}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:bg-slate-700/50 rounded-xl shadow-sm p-6 text-left transition-all hover:border-green-500/50"
          >
            <DollarSign className="w-8 h-8 text-green-500 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">
              Earnings & Reports
            </h3>
            <p className="text-sm text-slate-400">
              View detailed earnings and download reports
            </p>
          </button>
        </div>

        {/* Recent Activity */}
        {recentSessions.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
              <button
                onClick={() => router.push('/mechanic/sessions/virtual?filter=completed')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium py-2.5 px-3"
              >
                View all
              </button>
            </div>

            <div className="space-y-3">
              {recentSessions.slice(0, 5).map(session => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => router.push(`/mechanic/session/${session.id}`)}
                >
                  <div className="flex items-center gap-3">
                    {session.session_type === 'chat' ? (
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Video className="w-5 h-5 text-purple-600" />
                    )}
                    <div>
                      <p className="font-medium text-white">{session.customer_name}</p>
                      <p className="text-sm text-slate-400">
                        {new Date(session.created_at).toLocaleDateString()} • {session.status}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      ${session.earnings.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for New Mechanics */}
        {!loading && (!stats || stats.total_sessions === 0) && activeSessions.length === 0 && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8 text-center">
            <MessageCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Ready to Start Earning?
            </h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Check for pending consultation requests and start helping customers with their vehicle issues!
            </p>
            <button
              onClick={() => router.push('/mechanic/sessions/virtual?filter=pending')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              View Pending Requests
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
