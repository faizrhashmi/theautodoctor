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
  BarChart3,
  RefreshCw,
  PieChart,
  Activity,
  MapPin,
  Star,
  TrendingDown,
  Eye,
  MoreHorizontal
} from 'lucide-react'
import SessionLauncher from '@/components/customer/SessionLauncher'
import ActiveSessionsManager from '@/components/customer/ActiveSessionsManager'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ProgressTracker } from '@/components/ui/ProgressTracker'
import { PresenceChip } from '@/components/ui/PresenceChip'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { NotificationBell } from '@/components/notifications/NotificationBell'

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

// Analytics data interfaces
interface AnalyticsData {
  monthlySpending: MonthlySpending[]
  serviceDistribution: ServiceDistribution[]
  mechanicRatings: MechanicRating[]
  vehicleStats: VehicleStats
}

interface MonthlySpending {
  month: string
  amount: number
  trend: 'up' | 'down' | 'stable'
  change: number
}

interface ServiceDistribution {
  type: string
  count: number
  percentage: number
  color: string
}

interface MechanicRating {
  id: string
  name: string
  rating: number
  sessions: number
  specialization: string
}

interface VehicleStats {
  total_vehicles: number
  most_serviced: string
  average_mileage: number
}

// Activity data interfaces
interface ActivityData {
  sessions: ActivitySession[]
  quotes: ActivityQuote[]
  warranties: ActivityWarranty[]
  timeline: ActivityTimeline[]
}

interface ActivitySession {
  id: string
  type: string
  mechanic: string
  status: string
  date: string
  duration: string
  cost: number
  vehicle: string
}

interface ActivityQuote {
  id: string
  vehicle: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  created: string
  expires: string
}

interface ActivityWarranty {
  id: string
  service: string
  expires: string
  months: number
  status: 'active' | 'expired' | 'void'
}

interface ActivityTimeline {
  id: string
  type: 'session' | 'quote' | 'payment' | 'warranty'
  title: string
  description: string
  date: string
  icon: string
}

export default function CustomerDashboardPage() {
  // ✅ Auth guard - ensures user is authenticated as customer
  const { loading: authLoading, user } = useAuthGuard({ requiredRole: 'customer' })

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
  const [retryCount, setRetryCount] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  
  // Analytics and Activity states
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [activityData, setActivityData] = useState<ActivityData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [activityLoading, setActivityLoading] = useState(false)

  const fetchDashboardData = async () => {
    if (!user) return

    try {
      console.log('[CustomerDashboard] Fetching dashboard data...')
      setRefreshing(true)
      
      const [statsResponse, availabilityResponse, activeSessionsResponse] = await Promise.all([
        fetch(`/api/customer/dashboard/stats?t=${Date.now()}`), // Cache busting
        fetch('/api/mechanics/available-count'),
        fetch(`/api/customer/active-sessions?t=${Date.now()}`, {  // ✅ CRITICAL FIX: Cache busting + no-cache headers
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })
      ])

      console.log('[CustomerDashboard] Active sessions response status:', activeSessionsResponse.status)

      if (!statsResponse.ok) {
        throw new Error(`Failed to fetch dashboard data: ${statsResponse.status}`)
      }

      const statsData = await statsResponse.json()
      
      // Handle API errors in response body
      if (statsData.error) {
        throw new Error(statsData.error)
      }
      
      setStats(statsData.stats)
      setRecentSessions(statsData.recent_sessions || [])
      setError(null) // Clear any previous errors

      if (availabilityResponse.ok) {
        const availData = await availabilityResponse.json()
        setAvailability(availData)
      } else {
        console.warn('[CustomerDashboard] Failed to fetch availability data')
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
        setActiveSessions([]) // Reset active sessions on error
      }
    } catch (err) {
      console.error('Dashboard error:', err)
      setError(`Failed to load dashboard data: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchAnalyticsData = async () => {
    if (!user) return
    
    try {
      setAnalyticsLoading(true)
      const response = await fetch('/api/customer/analytics')
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }
      
      const data = await response.json()
      setAnalyticsData(data)
    } catch (err) {
      console.error('Analytics error:', err)
      // Don't set main error, just log it
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const fetchActivityData = async () => {
    if (!user) return
    
    try {
      setActivityLoading(true)
      const response = await fetch('/api/customer/activity')
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity data')
      }
      
      const data = await response.json()
      setActivityData(data)
    } catch (err) {
      console.error('Activity error:', err)
      // Don't set main error, just log it
    } finally {
      setActivityLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return

    fetchDashboardData()

    // Refresh availability every 30 seconds
    const interval = setInterval(async () => {
      if (!user) return
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
  }, [user, retryCount])

  // Fetch tab-specific data when tab changes
  useEffect(() => {
    if (!user) return

    if (activeTab === 'analytics' && !analyticsData) {
      fetchAnalyticsData()
    } else if (activeTab === 'activity' && !activityData) {
      fetchActivityData()
    }
  }, [activeTab, user, analyticsData, activityData])

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

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    setRetryCount(prev => prev + 1)
  }

  const handleRefresh = () => {
    fetchDashboardData()
  }

  // Show loading state while checking authentication
  if (authLoading || (loading && !refreshing)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">
            {authLoading ? 'Verifying authentication...' : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    )
  }

  // Auth guard will redirect if not authenticated, but add safety check
  if (!user) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Unable to Load Dashboard</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={handleRetry}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Try Again
            </button>
            <button 
              onClick={() => router.push('/customer/sessions')}
              className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
            >
              View Sessions
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab()
      case 'analytics':
        return renderAnalyticsTab()
      case 'activity':
        return renderActivityTab()
      default:
        return renderOverviewTab()
    }
  }

  const renderOverviewTab = () => (
    <>
      {/* Active Sessions Manager - Shows when customer has an active session */}
      {activeSessions.length > 0 && (
        <>
          {/* Progress Tracker */}
          <div className="mb-4 sm:mb-6">
            <ProgressTracker
              steps={[
                {
                  id: 'intake',
                  label: 'Intake',
                  completed: true,
                },
                {
                  id: 'photos',
                  label: 'Photos',
                  completed: activeSessions[0].status !== 'pending',
                  current: activeSessions[0].status === 'pending',
                },
                {
                  id: 'session',
                  label: 'Session',
                  completed: activeSessions[0].status === 'completed',
                  current: activeSessions[0].status === 'live' || activeSessions[0].status === 'waiting',
                },
                {
                  id: 'summary',
                  label: 'Summary',
                  completed: false,
                  current: activeSessions[0].status === 'completed',
                },
              ]}
            />
          </div>
          <div className="mb-6 sm:mb-8">
            <ActiveSessionsManager sessions={activeSessions} />
          </div>
        </>
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

      {/* Quick Actions Section */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Schedule - Disabled when active session exists */}
          {activeSessions.length > 0 ? (
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-lg p-3 sm:p-4 opacity-50 cursor-not-allowed relative">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mb-2 sm:mb-3" />
              <div className="text-xs sm:text-sm font-medium text-white">Schedule</div>
              <div className="text-xs text-slate-400 mt-0.5 sm:mt-1 hidden sm:block">Book appointment</div>
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-lg">
                <span className="text-xs text-orange-400 font-medium px-2 text-center">Complete active session first</span>
              </div>
            </div>
          ) : (
            <Link
              href="/customer/schedule"
              className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-lg p-3 sm:p-4 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/20 transition-all group"
            >
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-xs sm:text-sm font-medium text-white">Schedule</div>
              <div className="text-xs text-slate-400 mt-0.5 sm:mt-1 hidden sm:block">Book appointment</div>
            </Link>
          )}

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

          <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/30 rounded-lg p-3 sm:p-4 opacity-50 cursor-not-allowed">
            <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-pink-400 mb-2 sm:mb-3" />
            <div className="text-xs sm:text-sm font-medium text-white">Messages</div>
            <div className="text-xs text-slate-400 mt-0.5 sm:mt-1 hidden sm:block">Coming Soon</div>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
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

      {/* Recent Activity */}
      {recentSessions.length > 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
              Recent Activity
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <button className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
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
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        <PresenceChip
                          name={session.mechanic_name}
                          status={session.status === 'live' || session.status === 'waiting' ? 'online' : 'offline'}
                          size="sm"
                          showName={true}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 sm:py-1 rounded-full bg-slate-700 text-slate-300 capitalize">
                          {session.session_type}
                        </span>
                        <StatusBadge status={session.status as any} size="sm" showIcon={true} />
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
    </>
  )

  const renderAnalyticsTab = () => (
    <div className="space-y-6 sm:space-y-8">
      {analyticsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="ml-3 text-slate-300">Loading analytics...</span>
        </div>
      ) : analyticsData ? (
        <>
          {/* Spending Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="md:col-span-2 lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                Monthly Spending
              </h3>
              <div className="space-y-4">
                {analyticsData.monthlySpending.map((month, index) => (
                  <div key={month.month} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        month.trend === 'up' ? 'bg-green-500' : 
                        month.trend === 'down' ? 'bg-red-500' : 'bg-blue-500'
                      }`}></div>
                      <span className="text-white font-medium">{month.month}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white font-bold">${month.amount.toFixed(2)}</span>
                      <div className={`flex items-center gap-1 text-sm ${
                        month.trend === 'up' ? 'text-green-400' : 
                        month.trend === 'down' ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {month.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
                         month.trend === 'down' ? <TrendingDown className="w-4 h-4" /> : 
                         <Activity className="w-4 h-4" />}
                        <span>{month.change}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Distribution */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-orange-500" />
                Service Distribution
              </h3>
              <div className="space-y-3">
                {analyticsData.serviceDistribution.map((service, index) => (
                  <div key={service.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: service.color }}
                      ></div>
                      <span className="text-slate-300 text-sm">{service.type}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{service.count}</div>
                      <div className="text-slate-400 text-xs">{service.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mechanic Ratings */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-orange-500" />
              Top Mechanics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyticsData.mechanicRatings.map((mechanic) => (
                <div key={mechanic.id} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 hover:border-orange-500/50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold">{mechanic.name}</h4>
                      <p className="text-slate-400 text-sm">{mechanic.specialization}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-white font-bold">{mechanic.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>{mechanic.sessions} sessions</span>
                    <button className="text-orange-400 hover:text-orange-300 transition-colors text-xs">
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6 text-center">
              <Car className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{analyticsData.vehicleStats.total_vehicles}</div>
              <div className="text-slate-400 text-sm">Total Vehicles</div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6 text-center">
              <Wrench className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="text-lg font-bold text-white truncate">{analyticsData.vehicleStats.most_serviced}</div>
              <div className="text-slate-400 text-sm">Most Serviced</div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6 text-center">
              <MapPin className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{analyticsData.vehicleStats.average_mileage.toLocaleString()} mi</div>
              <div className="text-slate-400 text-sm">Average Mileage</div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No analytics data available</p>
          <p className="text-slate-500 text-sm mt-2">Analytics will appear after you complete your first session</p>
        </div>
      )}
    </div>
  )

  const renderActivityTab = () => (
    <div className="space-y-6 sm:space-y-8">
      {activityLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="ml-3 text-slate-300">Loading activity...</span>
        </div>
      ) : activityData ? (
        <>
          {/* Activity Timeline */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />
              Recent Timeline
            </h3>
            <div className="space-y-4">
              {activityData.timeline.map((item, index) => (
                <div key={item.id} className="flex items-start gap-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className={`p-2 rounded-full ${
                    item.type === 'session' ? 'bg-blue-500/20' :
                    item.type === 'quote' ? 'bg-amber-500/20' :
                    item.type === 'payment' ? 'bg-green-500/20' : 'bg-purple-500/20'
                  }`}>
                    {item.type === 'session' && <Wrench className="w-4 h-4 text-blue-400" />}
                    {item.type === 'quote' && <FileText className="w-4 h-4 text-amber-400" />}
                    {item.type === 'payment' && <DollarSign className="w-4 h-4 text-green-400" />}
                    {item.type === 'warranty' && <Shield className="w-4 h-4 text-purple-400" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-white font-semibold">{item.title}</h4>
                      <span className="text-slate-400 text-sm">{item.date}</span>
                    </div>
                    <p className="text-slate-400 text-sm">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quotes and Warranties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pending Quotes */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Pending Quotes
              </h3>
              <div className="space-y-3">
                {activityData.quotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <div>
                      <div className="text-white font-medium">{quote.vehicle}</div>
                      <div className="text-slate-400 text-sm">Expires {quote.expires}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">${quote.amount.toFixed(2)}</div>
                      <div className={`text-xs ${
                        quote.status === 'pending' ? 'text-amber-400' :
                        quote.status === 'approved' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {quote.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Warranties */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-500" />
                Active Warranties
              </h3>
              <div className="space-y-3">
                {activityData.warranties.map((warranty) => (
                  <div key={warranty.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <div>
                      <div className="text-white font-medium">{warranty.service}</div>
                      <div className="text-slate-400 text-sm">{warranty.months} months</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-medium ${
                        warranty.status === 'active' ? 'text-green-400' :
                        warranty.status === 'expired' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {warranty.status}
                      </div>
                      <div className="text-slate-400 text-sm">Expires {warranty.expires}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No activity data available</p>
          <p className="text-slate-500 text-sm mt-2">Activity will appear after you complete your first session</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen py-4 sm:py-6 lg:py-8 pt-16 sm:pt-20 lg:pt-8">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header with Actions */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-slate-400 hover:text-orange-400 transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-sm sm:text-base text-slate-400 mt-1">Enterprise command center for your vehicle services</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {user && <NotificationBell userId={user.id} />}
            <button className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
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

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  )
}