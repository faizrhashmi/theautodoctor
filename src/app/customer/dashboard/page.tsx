'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Car,
  DollarSign,
  Shield,
  FileText,
  Clock,
  Calendar,
  MessageSquare,
  Wrench,
  Zap,
  AlertCircle,
  Check,
  User,
  TrendingUp,
  ArrowRight,
  Settings,
  Search,
  Filter,
  Download,
  BarChart3
} from 'lucide-react'
import SessionLauncher from '@/components/customer/SessionLauncher'
import ActiveSessionsManager from '@/components/customer/ActiveSessionsManager'

interface DashboardStats {
  total_services: number
  total_spent: number
  active_warranties: number
  pending_quotes: number
  has_used_free_session: boolean | null
  account_type: string
  is_b2c_customer: boolean
}

interface RecentSession {
  id: string
  mechanic_name: string
  session_type: string
  status: string
  price: number
  created_at: string
}

interface MechanicAvailability {
  total_mechanics: number
  available_now: number
  in_session: number
  availability_percentage: number
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
  mechanicName: string | null
}

export default function CustomerDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionLauncherRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [availability, setAvailability] = useState<MechanicAvailability | null>(null)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'activity'>('overview')
  const [shouldHighlight, setShouldHighlight] = useState(false)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        console.log('[CustomerDashboard] Fetching dashboard data...')
        const [statsResponse, availabilityResponse, activeSessionsResponse] = await Promise.all([
          fetch('/api/customer/dashboard/stats'),
          fetch('/api/mechanics/available-count'),
          fetch('/api/customer/active-sessions')
        ])

        console.log('[CustomerDashboard] Active sessions response status:', activeSessionsResponse.status)

        if (!statsResponse.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const statsData = await statsResponse.json()
        setStats(statsData.stats)
        setRecentSessions(statsData.recent_sessions || [])

        if (availabilityResponse.ok) {
          const availData = await availabilityResponse.json()
          setAvailability(availData)
        }

        if (activeSessionsResponse.ok) {
          const activeData = await activeSessionsResponse.json()
          console.log('[CustomerDashboard] Active sessions data:', activeData)
          const sessions = activeData.sessions || []
          setActiveSessions(sessions)
          console.log('[CustomerDashboard] Set active sessions count:', sessions.length)
        } else {
          const errorText = await activeSessionsResponse.text()
          console.error('[CustomerDashboard] Failed to fetch active sessions:', activeSessionsResponse.status, errorText)
        }
      } catch (err) {
        console.error('Dashboard error:', err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()

    // Refresh availability every 30 seconds
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/mechanics/available-count')
        if (response.ok) {
          const data = await response.json()
          setAvailability(data)
        }
      } catch (err) {
        console.error('Availability refresh error:', err)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Handle auto-focus on session launcher
  useEffect(() => {
    const focusParam = searchParams?.get('focus')

    if (focusParam === 'session' && sessionLauncherRef.current && !loading) {
      // Wait for render to complete
      setTimeout(() => {
        sessionLauncherRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })

        // Add highlight animation
        setShouldHighlight(true)

        // Remove highlight after animation
        setTimeout(() => {
          setShouldHighlight(false)
        }, 2000)
      }, 100)
    }
  }, [searchParams, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-400">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-4 sm:py-6 lg:py-8 pt-16 sm:pt-20 lg:pt-8">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header with Actions */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="w-full sm:w-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-sm sm:text-base text-slate-400 mt-1">Enterprise command center for your vehicle services</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-sm">
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-sm">
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>

        {/* Tabbed Navigation */}
        <div className="mb-6 sm:mb-8 border-b border-slate-700">
          <div className="flex gap-4 sm:gap-6 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 sm:pb-4 px-1 sm:px-2 font-medium transition-colors border-b-2 whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'overview'
                  ? 'text-orange-400 border-orange-400'
                  : 'text-slate-400 border-transparent hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-3 sm:pb-4 px-1 sm:px-2 font-medium transition-colors border-b-2 whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'analytics'
                  ? 'text-orange-400 border-orange-400'
                  : 'text-slate-400 border-transparent hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Analytics
              </div>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-3 sm:pb-4 px-1 sm:px-2 font-medium transition-colors border-b-2 whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'activity'
                  ? 'text-orange-400 border-orange-400'
                  : 'text-slate-400 border-transparent hover:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Activity
              </div>
            </button>
          </div>
        </div>

        {/* Active Sessions Manager - Shows when customer has an active session */}
        {activeSessions.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <ActiveSessionsManager sessions={activeSessions} />
          </div>
        )}

        {/* Unified Session Launcher - Account-Type Aware */}
        {/* Only show if no active sessions */}
        {activeSessions.length === 0 && (
          <div
            ref={sessionLauncherRef}
            className={`mb-6 sm:mb-8 transition-all duration-500 ${
              shouldHighlight
                ? 'ring-2 sm:ring-4 ring-orange-500/50 rounded-2xl shadow-2xl shadow-orange-500/20'
                : ''
            }`}
          >
            <SessionLauncher
              accountType={stats?.account_type}
              hasUsedFreeSession={stats?.has_used_free_session}
              isB2CCustomer={stats?.is_b2c_customer}
              availableMechanics={availability?.available_now || 0}
              workshopId={undefined}
              organizationId={undefined}
            />
          </div>
        )}

        {/* Quick Actions Section - Enhanced */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <Link
              href="/customer/schedule"
              className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-lg p-3 sm:p-4 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/20 transition-all group"
            >
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-white">Schedule</div>
              <div className="text-xs text-slate-400 mt-0.5 sm:mt-1 hidden sm:block">Book appointment</div>
            </Link>

            <Link
              href="/customer/quotes"
              className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-lg p-3 sm:p-4 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20 transition-all group"
            >
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-white">Quotes</div>
              <div className="text-xs text-slate-400 mt-0.5 sm:mt-1 hidden sm:block">View estimates</div>
            </Link>

            <Link
              href="/customer/vehicles"
              className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-lg p-3 sm:p-4 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/20 transition-all group"
            >
              <Car className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-white">Vehicles</div>
              <div className="text-xs text-slate-400 mt-0.5 sm:mt-1 hidden sm:block">Manage fleet</div>
            </Link>

            <Link
              href="/customer/sessions"
              className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-lg p-3 sm:p-4 hover:border-green-400 hover:shadow-lg hover:shadow-green-500/20 transition-all group"
            >
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-white">History</div>
              <div className="text-xs text-slate-400 mt-0.5 sm:mt-1 hidden sm:block">Past sessions</div>
            </Link>

            <Link
              href="/customer/profile"
              className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 rounded-lg p-3 sm:p-4 hover:border-orange-400 hover:shadow-lg hover:shadow-orange-500/20 transition-all group"
            >
              <User className="w-6 h-6 sm:w-8 sm:h-8 text-orange-400 mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-white">Profile</div>
              <div className="text-xs text-slate-400 mt-0.5 sm:mt-1 hidden sm:block">Your account</div>
            </Link>

            <Link
              href="/customer/messages"
              className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/30 rounded-lg p-3 sm:p-4 hover:border-pink-400 hover:shadow-lg hover:shadow-pink-500/20 transition-all group"
            >
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-pink-400 mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-white">Messages</div>
              <div className="text-xs text-slate-400 mt-0.5 sm:mt-1 hidden sm:block">Communicate</div>
            </Link>
          </div>
        </div>

        {/* Key Performance Indicators - Clickable with Trends */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
            Key Metrics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <Link
              href="/customer/sessions"
              className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-blue-500/20 rounded-lg">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-400">Total Services</div>
                </div>
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">{stats?.total_services || 0}</div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {stats?.total_services && stats.total_services > 0
                    ? 'All completed sessions'
                    : 'No sessions yet'}
                </div>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            <Link
              href="/customer/sessions"
              className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-green-500/20 rounded-lg">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-400">Total Spent</div>
                </div>
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">${(stats?.total_spent || 0).toFixed(2)}</div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">Lifetime investment</div>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            <Link
              href="/customer/warranties"
              className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-purple-500/20 rounded-lg">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-400">Active Warranties</div>
                </div>
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">{stats?.active_warranties || 0}</div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {stats?.active_warranties && stats.active_warranties > 0
                    ? 'Currently protected'
                    : 'No active warranties'}
                </div>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            <Link
              href="/customer/quotes"
              className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-amber-500/20 rounded-lg">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-400">Pending Quotes</div>
                </div>
                {stats?.pending_quotes && stats.pending_quotes > 0 ? (
                  <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 animate-pulse" />
                ) : (
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">{stats?.pending_quotes || 0}</div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {stats?.pending_quotes && stats.pending_quotes > 0
                    ? 'Awaiting your review'
                    : 'All quotes reviewed'}
                </div>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity with Advanced Filters */}
        {recentSessions.length > 0 ? (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                Recent Activity
              </h2>
              <div className="flex items-center gap-3 flex-wrap">
                <button className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-900 transition-colors">
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filter</span>
                </button>
                <button className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-900 transition-colors">
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">Search</span>
                </button>
                <Link
                  href="/customer/sessions"
                  className="text-sm text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 font-medium"
                >
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-orange-500/50 transition-all group gap-3"
                >
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg">
                        <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-white truncate block">{session.mechanic_name}</span>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                          <span className="text-xs px-2 py-0.5 sm:py-1 rounded-full bg-slate-700 text-slate-300 capitalize">
                            {session.session_type}
                          </span>
                          <span className={`text-xs px-2 py-0.5 sm:py-1 rounded-full capitalize ${
                            session.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            session.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 ml-9 sm:ml-12">
                      {new Date(session.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 ml-9 sm:ml-0 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-base sm:text-lg font-bold text-white">${session.price.toFixed(2)}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6 sm:p-8 text-center">
            <Car className="w-12 h-12 sm:w-16 sm:h-16 text-slate-600 mx-auto mb-3 sm:mb-4" />
            <p className="text-slate-400 text-base sm:text-lg">No sessions yet</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">Select a plan above and start your first session to see your history here</p>
          </div>
        )}
      </div>
    </div>
  )
}
