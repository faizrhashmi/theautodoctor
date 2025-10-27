'use client'

/**
 * Admin: Profile Completion Statistics
 * Monitor mechanic profile completion scores and identify incomplete profiles
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { AlertCircle, CheckCircle, RefreshCw, TrendingUp, Users, Award, Clock } from 'lucide-react'
import Link from 'next/link'

interface CompletionStats {
  totalMechanics: number
  canAcceptSessions: number
  averageScore: number
  scoreDistribution: {
    '0-20': number
    '20-40': number
    '40-60': number
    '60-80': number
    '80-100': number
  }
}

interface MechanicProfile {
  id: string
  full_name: string
  email: string
  profile_completion_score: number
  can_accept_sessions: boolean
  is_brand_specialist: boolean
  status: string
  created_at: string
  country: string
  city: string
}

export default function ProfileCompletionAdminPage() {
  const [stats, setStats] = useState<CompletionStats | null>(null)
  const [mechanics, setMechanics] = useState<MechanicProfile[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'incomplete' | 'complete'>('all')
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'created'>('score')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all mechanics with completion scores
      const { data: mechanicsData, error: mechanicsError } = await supabase
        .from('mechanics')
        .select('id, full_name, email, profile_completion_score, can_accept_sessions, is_brand_specialist, status, created_at, country, city')
        .order('profile_completion_score', { ascending: true })

      if (mechanicsError) throw mechanicsError

      setMechanics(mechanicsData || [])

      // Calculate stats
      if (mechanicsData) {
        const total = mechanicsData.length
        const canAccept = mechanicsData.filter(m => m.can_accept_sessions).length
        const avg = mechanicsData.reduce((sum, m) => sum + (m.profile_completion_score || 0), 0) / total

        const dist = {
          '0-20': 0,
          '20-40': 0,
          '40-60': 0,
          '60-80': 0,
          '80-100': 0
        }

        mechanicsData.forEach(m => {
          const score = m.profile_completion_score || 0
          if (score < 20) dist['0-20']++
          else if (score < 40) dist['20-40']++
          else if (score < 60) dist['40-60']++
          else if (score < 80) dist['60-80']++
          else dist['80-100']++
        })

        setStats({
          totalMechanics: total,
          canAcceptSessions: canAccept,
          averageScore: Math.round(avg),
          scoreDistribution: dist
        })
      }
    } catch (err: any) {
      console.error('Error fetching profile completion data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter and sort mechanics
  const filteredMechanics = mechanics
    .filter(m => {
      if (filterStatus === 'incomplete') return !m.can_accept_sessions
      if (filterStatus === 'complete') return m.can_accept_sessions
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'score') {
        return (a.profile_completion_score || 0) - (b.profile_completion_score || 0)
      } else if (sortBy === 'name') {
        return (a.full_name || '').localeCompare(b.full_name || '')
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white dark:text-white">
            Profile Completion Statistics
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-400 mt-1">
            Monitor mechanic profile completion and session readiness
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/25 text-white rounded-lg hover:from-orange-600 hover:to-red-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900 dark:text-red-100">Error loading data</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Mechanics"
            value={stats.totalMechanics}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Can Accept Sessions"
            value={stats.canAcceptSessions}
            subtitle={`${Math.round((stats.canAcceptSessions / stats.totalMechanics) * 100)}% of total`}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Average Completion"
            value={`${stats.averageScore}%`}
            icon={TrendingUp}
            color="orange"
          />
          <StatCard
            title="Need Attention"
            value={stats.scoreDistribution['0-20'] + stats.scoreDistribution['20-40']}
            subtitle="Below 40% complete"
            icon={AlertCircle}
            color="red"
          />
        </div>
      )}

      {/* Distribution Chart */}
      {stats && (
        <div className="bg-slate-800/50 backdrop-blur-sm dark:bg-slate-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold text-white dark:text-white mb-4">
            Completion Score Distribution
          </h2>
          <div className="space-y-3">
            <DistributionBar label="0-20%" count={stats.scoreDistribution['0-20']} total={stats.totalMechanics} color="red" />
            <DistributionBar label="20-40%" count={stats.scoreDistribution['20-40']} total={stats.totalMechanics} color="orange" />
            <DistributionBar label="40-60%" count={stats.scoreDistribution['40-60']} total={stats.totalMechanics} color="yellow" />
            <DistributionBar label="60-80%" count={stats.scoreDistribution['60-80']} total={stats.totalMechanics} color="blue" />
            <DistributionBar label="80-100%" count={stats.scoreDistribution['80-100']} total={stats.totalMechanics} color="green" />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-sm dark:bg-slate-800 p-4 rounded-lg shadow flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-200 dark:text-slate-300">
            Filter:
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-slate-700 dark:border-slate-600 bg-slate-800/50 backdrop-blur-sm dark:bg-slate-900 text-sm"
          >
            <option value="all">All Mechanics</option>
            <option value="incomplete">Incomplete (&lt;80%)</option>
            <option value="complete">Complete (≥80%)</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-200 dark:text-slate-300">
            Sort by:
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-slate-700 dark:border-slate-600 bg-slate-800/50 backdrop-blur-sm dark:bg-slate-900 text-sm"
          >
            <option value="score">Completion Score</option>
            <option value="name">Name</option>
            <option value="created">Recently Added</option>
          </select>
        </div>
      </div>

      {/* Mechanics List */}
      <div className="bg-slate-800/50 backdrop-blur-sm dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                  Mechanic
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                  Location
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                  Completion
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                  Can Accept
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-200 dark:text-slate-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredMechanics.map((mechanic) => (
                <tr key={mechanic.id} className="hover:bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-white dark:text-white">
                        {mechanic.full_name || 'Unknown'}
                        {mechanic.is_brand_specialist && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                            Specialist
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400 dark:text-slate-400">
                        {mechanic.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-200 dark:text-slate-300">
                    {mechanic.city && mechanic.country ? (
                      `${mechanic.city}, ${mechanic.country}`
                    ) : (
                      <span className="text-slate-400">Not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-24 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (mechanic.profile_completion_score || 0) >= 80
                              ? 'bg-green-500'
                              : (mechanic.profile_completion_score || 0) >= 60
                              ? 'bg-blue-500'
                              : (mechanic.profile_completion_score || 0) >= 40
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${mechanic.profile_completion_score || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-white dark:text-white">
                        {mechanic.profile_completion_score || 0}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      mechanic.status === 'approved'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {mechanic.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {mechanic.can_accept_sessions ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-orange-500 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/mechanics/${mechanic.id}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMechanics.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No mechanics found matching the selected filter
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: any
  color: 'blue' | 'green' | 'orange' | 'red'
}) {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm dark:bg-slate-800 p-6 rounded-lg shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400 dark:text-slate-400">
            {title}
          </p>
          <p className="text-3xl font-bold text-white dark:text-white mt-2">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

function DistributionBar({
  label,
  count,
  total,
  color
}: {
  label: string
  count: number
  total: number
  color: 'red' | 'orange' | 'yellow' | 'blue' | 'green'
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0

  const colors = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500'
  }

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-slate-200 dark:text-slate-300">{label}</span>
        <span className="text-slate-400 dark:text-slate-400">
          {count} ({Math.round(percentage)}%)
        </span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3">
        <div
          className={`h-3 rounded-full ${colors[color]} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
