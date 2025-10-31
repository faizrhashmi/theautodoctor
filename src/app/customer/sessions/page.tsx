'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Clock, MessageSquare, Video, CheckCircle, XCircle, AlertCircle,
  Filter, Search, Calendar, Download, Star, FileText, MoreVertical,
  TrendingUp, DollarSign, Award, Play, Edit, Trash2, RefreshCw,
  X, Phone, User, ChevronDown, ExternalLink, Image as ImageIcon,
  BarChart3, Zap
} from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'

interface Session {
  id: string
  type: 'chat' | 'video' | 'diagnostic'
  status: 'pending' | 'waiting' | 'live' | 'completed' | 'cancelled' | 'scheduled'
  mechanic_name: string | null
  plan: string
  created_at: string
  completed_at: string | null
  price: number
  rating?: number
  review?: string
  vehicle?: string
  issue?: string
  duration?: number
  mechanic_id?: string
  notes?: string
}

interface SessionAnalytics {
  total_sessions: number
  total_spent: number
  avg_rating: number
  total_hours: number
}

export default function CustomerSessionsPage() {
  // ✅ Auth guard - ensures user is authenticated as customer
  const { isLoading: authLoading, user } = useAuthGuard({ requiredRole: 'customer' })

  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'scheduled' | 'completed' | 'cancelled'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [analytics, setAnalytics] = useState<SessionAnalytics>({
    total_sessions: 0,
    total_spent: 0,
    avg_rating: 0,
    total_hours: 0
  })

  // Filters
  const [dateRange, setDateRange] = useState<'all' | '7days' | '30days' | '90days'>('all')
  const [sessionType, setSessionType] = useState<'all' | 'chat' | 'video' | 'diagnostic'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'rating'>('date')

  useEffect(() => {
    if (user) {
      fetchSessions()
    }
  }, [user])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null)
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openDropdown])

  async function fetchSessions() {
    try {
      const response = await fetch('/api/customer/sessions')
      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }
      const data = await response.json()
      setSessions(data.sessions || [])

      // Calculate analytics
      const completed = data.sessions?.filter((s: Session) => s.status === 'completed') || []
      setAnalytics({
        total_sessions: completed.length,
        total_spent: completed.reduce((sum: number, s: Session) => sum + s.price, 0),
        avg_rating: completed.reduce((sum: number, s: Session) => sum + (s.rating || 0), 0) / (completed.length || 1),
        total_hours: completed.reduce((sum: number, s: Session) => sum + (s.duration || 0), 0) / 60
      })
    } catch (err) {
      console.error('Sessions error:', err)
      setError('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm('Are you sure you want to delete this session from your history? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/customer/sessions/${sessionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete session')
      }

      // Remove from local state
      setSessions(sessions.filter(s => s.id !== sessionId))
      setSelectedSession(null)
      setOpenDropdown(null)
      setSelectedSessions(prev => {
        const next = new Set(prev)
        next.delete(sessionId)
        return next
      })

      alert('Session deleted successfully')
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete session. Please try again.')
    }
  }

  async function handleBulkDelete() {
    if (selectedSessions.size === 0) {
      alert('Please select sessions to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedSessions.size} session(s)? This action cannot be undone.`)) {
      return
    }

    const deletePromises = Array.from(selectedSessions).map(sessionId =>
      fetch(`/api/customer/sessions/${sessionId}`, { method: 'DELETE' })
    )

    try {
      await Promise.all(deletePromises)
      setSessions(sessions.filter(s => !selectedSessions.has(s.id)))
      setSelectedSessions(new Set())
      alert(`${selectedSessions.size} session(s) deleted successfully`)
    } catch (err) {
      console.error('Bulk delete error:', err)
      alert('Failed to delete some sessions. Please try again.')
    }
  }

  async function handleClearAllHistory() {
    const completedAndCancelled = sessions.filter(s => ['completed', 'cancelled'].includes(s.status))

    if (completedAndCancelled.length === 0) {
      alert('No completed or cancelled sessions to clear')
      return
    }

    if (!confirm(`⚠️ WARNING: This will permanently delete all ${completedAndCancelled.length} completed and cancelled sessions from your history. This action cannot be undone.\n\nAre you absolutely sure you want to continue?`)) {
      return
    }

    const deletePromises = completedAndCancelled.map(session =>
      fetch(`/api/customer/sessions/${session.id}`, { method: 'DELETE' })
    )

    try {
      await Promise.all(deletePromises)
      setSessions(sessions.filter(s => !['completed', 'cancelled'].includes(s.status)))
      setSelectedSessions(new Set())
      alert(`${completedAndCancelled.length} session(s) cleared from history`)
    } catch (err) {
      console.error('Clear all error:', err)
      alert('Failed to clear all sessions. Please try again.')
    }
  }

  function toggleSelectAll() {
    const deletableSessions = filteredSessions.filter(s => ['completed', 'cancelled'].includes(s.status))
    if (selectedSessions.size === deletableSessions.length && deletableSessions.length > 0) {
      setSelectedSessions(new Set())
    } else {
      setSelectedSessions(new Set(deletableSessions.map(s => s.id)))
    }
  }

  function toggleSelectSession(sessionId: string) {
    setSelectedSessions(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }

  const filteredSessions = sessions.filter(session => {
    // Tab filter
    if (activeTab === 'active' && !['live', 'waiting'].includes(session.status)) return false
    if (activeTab === 'scheduled' && session.status !== 'scheduled') return false
    if (activeTab === 'completed' && session.status !== 'completed') return false
    if (activeTab === 'cancelled' && session.status !== 'cancelled') return false

    // Search filter
    if (searchQuery && !session.mechanic_name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !session.id.toLowerCase().includes(searchQuery.toLowerCase())) return false

    // Type filter
    if (sessionType !== 'all' && session.type !== sessionType) return false

    // Date range filter
    if (dateRange !== 'all') {
      const sessionDate = new Date(session.created_at)
      const now = new Date()
      const daysAgo = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90
      const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      if (sessionDate < cutoff) return false
    }

    return true
  }).sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    } else if (sortBy === 'price') {
      return b.price - a.price
    } else {
      return (b.rating || 0) - (a.rating || 0)
    }
  })

  const getStatusBadge = (status: string) => {
    const badges = {
      live: { icon: Play, color: 'bg-green-500/20 text-green-400 border-green-500/50', label: 'Live' },
      waiting: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', label: 'Waiting' },
      scheduled: { icon: Calendar, color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', label: 'Scheduled' },
      completed: { icon: CheckCircle, color: 'bg-green-500/20 text-green-400 border-green-500/50', label: 'Completed' },
      cancelled: { icon: XCircle, color: 'bg-red-500/20 text-red-400 border-red-500/50', label: 'Cancelled' },
      pending: { icon: AlertCircle, color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', label: 'Pending' }
    }
    const badge = badges[status as keyof typeof badges] || badges.pending
    const Icon = badge.icon
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${badge.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {badge.label}
      </div>
    )
  }

  const getTypeIcon = (type: string) => {
    const icons = {
      chat: MessageSquare,
      video: Video,
      diagnostic: FileText
    }
    const Icon = icons[type as keyof typeof icons] || FileText
    return <Icon className="w-5 h-5" />
  }

  // Show loading state while checking authentication
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">
            {authLoading ? 'Verifying authentication...' : 'Loading sessions...'}
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center text-red-400">
          <p>{error}</p>
          <button
            onClick={fetchSessions}
            className="mt-4 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Session Management</h1>
            <p className="text-slate-400">Track, manage, and review all your diagnostic sessions</p>
          </div>
          <Link
            href="/customer/dashboard?focus=session"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all shadow-lg"
          >
            <Zap className="w-5 h-5" />
            New Session
          </Link>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-sm text-slate-400">Total Sessions</div>
            </div>
            <div className="text-3xl font-bold text-white">{analytics.total_sessions}</div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-sm text-slate-400">Total Spent</div>
            </div>
            <div className="text-3xl font-bold text-white">${analytics.total_spent.toFixed(2)}</div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-sm text-slate-400">Avg Rating</div>
            </div>
            <div className="text-3xl font-bold text-white">{analytics.avg_rating.toFixed(1)}</div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-sm text-slate-400">Total Hours</div>
            </div>
            <div className="text-3xl font-bold text-white">{analytics.total_hours.toFixed(1)}</div>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 mb-6">
          <div className="p-4 border-b border-slate-700">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
                {[
                  { key: 'all', label: 'All Sessions', count: sessions.length },
                  { key: 'active', label: 'Active', count: sessions.filter(s => ['live', 'waiting'].includes(s.status)).length },
                  { key: 'scheduled', label: 'Scheduled', count: sessions.filter(s => s.status === 'scheduled').length },
                  { key: 'completed', label: 'Completed', count: sessions.filter(s => s.status === 'completed').length },
                  { key: 'cancelled', label: 'Cancelled', count: sessions.filter(s => s.status === 'cancelled').length }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      activeTab === tab.key
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Search and Filters */}
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    showFilters ? 'bg-orange-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Date Range</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="all">All Time</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="90days">Last 90 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Session Type</label>
                  <select
                    value={sessionType}
                    onChange={(e) => setSessionType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="all">All Types</option>
                    <option value="chat">Chat Only</option>
                    <option value="video">Video Call</option>
                    <option value="diagnostic">Full Diagnostic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="date">Date (Newest First)</option>
                    <option value="price">Price (Highest First)</option>
                    <option value="rating">Rating (Highest First)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Actions Bar */}
          {filteredSessions.filter(s => ['completed', 'cancelled'].includes(s.status)).length > 0 && (
            <div className="p-4 border-b border-slate-700 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedSessions.size === filteredSessions.filter(s => ['completed', 'cancelled'].includes(s.status)).length && filteredSessions.filter(s => ['completed', 'cancelled'].includes(s.status)).length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-sm font-medium">
                    Select All ({filteredSessions.filter(s => ['completed', 'cancelled'].includes(s.status)).length})
                  </span>
                </label>
                {selectedSessions.size > 0 && (
                  <span className="text-sm text-slate-400">
                    {selectedSessions.size} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedSessions.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected ({selectedSessions.size})
                  </button>
                )}
                <button
                  onClick={handleClearAllHistory}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All History
                </button>
              </div>
            </div>
          )}

          {/* Sessions List */}
          <div className="p-4">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No sessions found</p>
                <p className="text-sm text-slate-500 mt-2">Try adjusting your filters or search criteria</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSessions.map((session) => {
                  const isSelectable = ['completed', 'cancelled'].includes(session.status)
                  return (
                    <div
                      key={session.id}
                      className="bg-slate-900/50 rounded-lg border border-slate-700 hover:border-orange-500/50 transition-all p-4 cursor-pointer"
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        {/* Checkbox for selectable sessions */}
                        {isSelectable && (
                          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedSessions.has(session.id)}
                              onChange={() => toggleSelectSession(session.id)}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900 cursor-pointer"
                            />
                          </div>
                        )}

                        {/* Session Info */}
                        <div className="flex flex-col sm:flex-row items-start gap-4 flex-1">
                          <div className="p-3 bg-slate-800 rounded-lg">
                            {getTypeIcon(session.type)}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="text-white font-semibold">
                                {session.mechanic_name || 'Waiting for assignment'}
                              </h3>
                              {getStatusBadge(session.status)}
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(session.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(session.created_at).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className="capitalize px-2 py-0.5 bg-slate-700 rounded text-xs">
                                {session.type}
                              </span>
                            </div>

                            {session.rating && (
                              <div className="flex items-center gap-1 mt-2">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < session.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Price and Actions */}
                        <div className="flex items-center gap-4 lg:ml-auto">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-white">${session.price.toFixed(2)}</div>
                            <div className="text-xs text-slate-400 capitalize">{session.plan}</div>
                          </div>

                          {/* Dropdown Menu */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenDropdown(openDropdown === session.id ? null : session.id)
                              }}
                              className="p-3 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-5 h-5 text-slate-400" />
                            </button>

                            {openDropdown === session.id && (
                              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedSession(session)
                                    setOpenDropdown(null)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2 rounded-t-lg"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  View Details
                                </button>
                                {session.status === 'completed' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      // TODO: Download report
                                      alert('Download report functionality coming soon')
                                      setOpenDropdown(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <Download className="w-4 h-4" />
                                    Download Report
                                  </button>
                                )}
                                {['completed', 'cancelled'].includes(session.status) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteSession(session.id)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 rounded-b-lg border-t border-slate-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete from History
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions for Active Sessions */}
                      {['pending', 'live', 'waiting', 'scheduled'].includes(session.status) && (
                        <div className="mt-4 pt-4 border-t border-slate-700 flex gap-2 flex-wrap">
                          {session.status === 'live' && (
                            <>
                              <Link
                                href={`/video/${session.id}`}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                              >
                                <Play className="w-4 h-4" />
                                Join Now
                              </Link>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  if (!confirm('Are you sure you want to end this live session?')) return
                                  const reason = prompt('Reason for ending session (optional):')

                                  try {
                                    const response = await fetch(`/api/customer/sessions/${session.id}/cancel`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ reason })
                                    })

                                    if (!response.ok) {
                                      const error = await response.json()
                                      throw new Error(error.error || 'Failed to end session')
                                    }

                                    const result = await response.json()
                                    alert(`Session ended.\n\n${result.refund_note}`)
                                    fetchSessions()
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to end session')
                                  }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors"
                              >
                                <X className="w-4 h-4" />
                                End Session
                              </button>
                            </>
                          )}
                          {['waiting', 'pending'].includes(session.status) && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (!confirm('Are you sure you want to cancel this session?')) return
                                const reason = prompt('Reason for cancellation (optional):')

                                try {
                                  const response = await fetch(`/api/customer/sessions/${session.id}/cancel`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ reason })
                                  })

                                  if (!response.ok) {
                                    const error = await response.json()
                                    throw new Error(error.error || 'Failed to cancel')
                                  }

                                  const result = await response.json()
                                  alert(`Session cancelled.\n\n${result.refund_note}`)
                                  fetchSessions()
                                } catch (err: any) {
                                  alert(err.message || 'Failed to cancel')
                                }
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Cancel Session
                            </button>
                          )}
                          {session.status === 'scheduled' && (
                            <>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  const newTime = prompt('Enter new scheduled time (YYYY-MM-DD HH:MM):')
                                  if (!newTime) return

                                  try {
                                    const response = await fetch(`/api/customer/sessions/${session.id}/reschedule`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        new_scheduled_time: new Date(newTime).toISOString(),
                                        reason: 'Customer requested reschedule'
                                      })
                                    })

                                    if (!response.ok) {
                                      const error = await response.json()
                                      throw new Error(error.error || 'Failed to reschedule')
                                    }

                                    const result = await response.json()
                                    alert(`Session rescheduled!\n\n${result.note}`)
                                    fetchSessions()
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to reschedule')
                                  }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                                Reschedule
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  const reason = prompt('Reason for cancellation (optional):')

                                  try {
                                    const response = await fetch(`/api/customer/sessions/${session.id}/cancel`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ reason })
                                    })

                                    if (!response.ok) {
                                      const error = await response.json()
                                      throw new Error(error.error || 'Failed to cancel')
                                    }

                                    const result = await response.json()
                                    alert(`Session cancelled.\n\n${result.refund_note}`)
                                    fetchSessions()
                                  } catch (err: any) {
                                    alert(err.message || 'Failed to cancel')
                                  }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                )})}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onUpdate={fetchSessions}
          onDelete={handleDeleteSession}
        />
      )}
    </div>
  )
}

// Session Detail Modal Component
function SessionDetailModal({
  session,
  onClose,
  onUpdate,
  onDelete
}: {
  session: Session
  onClose: () => void
  onUpdate: () => void
  onDelete: (id: string) => void
}) {
  const [activeSection, setActiveSection] = useState<'details' | 'timeline' | 'files'>('details')
  const [rating, setRating] = useState(session.rating || 0)
  const [review, setReview] = useState(session.review || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitRating = async () => {
    if (rating === 0) {
      alert('Please select a rating')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/customer/sessions/${session.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit rating')
      }

      alert('Thank you for your feedback!')
      onUpdate()
      onClose()
    } catch (err: any) {
      console.error('Rating error:', err)
      alert(err.message || 'Failed to submit rating. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelSession = async () => {
    const reason = prompt('Please provide a reason for cancellation (optional):')

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/customer/sessions/${session.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel session')
      }

      const result = await response.json()
      alert(`Session cancelled.\n\n${result.refund_note}`)
      onUpdate()
      onClose()
    } catch (err: any) {
      console.error('Cancel error:', err)
      alert(err.message || 'Failed to cancel session. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRescheduleSession = async () => {
    const newTime = prompt('Enter new scheduled time (YYYY-MM-DD HH:MM):')

    if (!newTime) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/customer/sessions/${session.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_scheduled_time: new Date(newTime).toISOString(),
          reason: 'Customer requested reschedule'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reschedule session')
      }

      const result = await response.json()
      alert(`Session rescheduled successfully!\n\n${result.note}`)
      onUpdate()
      onClose()
    } catch (err: any) {
      console.error('Reschedule error:', err)
      alert(err.message || 'Failed to reschedule session. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Session Details</h2>
            <p className="text-sm text-slate-400 mt-1">ID: {session.id.slice(0, 8)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-slate-700">
          <div className="flex gap-6">
            {['details', 'timeline', 'files'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSection(tab as any)}
                className={`py-3 border-b-2 font-medium capitalize transition-colors ${
                  activeSection === tab
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'details' && (
            <div className="space-y-6">
              {/* Mechanic Info */}
              <div>
                <label className="text-sm text-slate-400 block mb-2">Mechanic</label>
                <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg">
                  <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">{session.mechanic_name || 'Not assigned yet'}</div>
                    <div className="text-sm text-slate-400">Certified Mechanic</div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-2">Created</label>
                  <div className="text-white">
                    {new Date(session.created_at).toLocaleString()}
                  </div>
                </div>
                {session.completed_at && (
                  <div>
                    <label className="text-sm text-slate-400 block mb-2">Completed</label>
                    <div className="text-white">
                      {new Date(session.completed_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Price */}
              <div>
                <label className="text-sm text-slate-400 block mb-2">Price</label>
                <div className="text-3xl font-bold text-white">${session.price.toFixed(2)}</div>
              </div>

              {/* Rating Form */}
              {session.status === 'completed' && !session.rating && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-200 text-sm mb-3 font-medium">How was your experience?</p>
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Share your experience (optional)"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 mb-3"
                    rows={3}
                  />
                  <button
                    onClick={submitRating}
                    disabled={rating === 0 || isSubmitting}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                  </button>
                </div>
              )}

              {session.rating && (
                <div>
                  <label className="text-sm text-slate-400 block mb-2">Your Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-6 h-6 ${
                          star <= session.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  {session.review && (
                    <p className="mt-2 text-slate-300 text-sm">{session.review}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeSection === 'timeline' && (
            <div className="text-slate-400">
              <p>Session timeline coming soon...</p>
            </div>
          )}

          {activeSection === 'files' && (
            <div className="text-slate-400">
              <p>Shared files coming soon...</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-700 flex gap-3 flex-wrap items-center">
          {session.status === 'completed' && (
            <>
              <button
                onClick={() => alert('Download report functionality coming soon')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Report
              </button>
              <button
                onClick={() => alert('Request follow-up functionality coming soon')}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Request Follow-up
              </button>
            </>
          )}

          {session.status === 'scheduled' && (
            <>
              <button
                onClick={handleRescheduleSession}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                <Edit className="w-4 h-4" />
                {isSubmitting ? 'Processing...' : 'Reschedule'}
              </button>
              <button
                onClick={handleCancelSession}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {isSubmitting ? 'Processing...' : 'Cancel Session'}
              </button>
            </>
          )}

          {/* Delete Button - Only for completed/cancelled sessions */}
          {['completed', 'cancelled'].includes(session.status) && (
            <button
              onClick={() => onDelete(session.id)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="ml-auto px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
