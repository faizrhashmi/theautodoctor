'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Clock, Video, MessageSquare, Activity, CheckCircle, XCircle,
  AlertCircle, ArrowRight, User, Wrench, Calendar, ExternalLink
} from 'lucide-react'

interface Session {
  id: string
  type: 'chat' | 'video' | 'diagnostic'
  status: 'pending' | 'waiting' | 'live' | 'completed' | 'cancelled' | 'scheduled'
  mechanic_name: string | null
  customer_name?: string | null
  plan: string
  created_at: string
  completed_at: string | null
  price: number
  rating?: number
  vehicle?: string
  issue?: string
}

interface RecentSessionsProps {
  userRole: 'customer' | 'mechanic'
  limit?: number
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-400" />
    case 'cancelled':
      return <XCircle className="w-4 h-4 text-red-400" />
    case 'live':
      return <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
    case 'waiting':
      return <Clock className="w-4 h-4 text-amber-400" />
    default:
      return <AlertCircle className="w-4 h-4 text-slate-400" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-green-400 bg-green-500/10 border-green-500/30'
    case 'cancelled':
      return 'text-red-400 bg-red-500/10 border-red-500/30'
    case 'live':
      return 'text-green-400 bg-green-500/10 border-green-500/30'
    case 'waiting':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    default:
      return 'text-slate-400 bg-slate-500/10 border-slate-500/30'
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'video':
    case 'diagnostic':
      return <Video className="w-4 h-4" />
    case 'chat':
      return <MessageSquare className="w-4 h-4" />
    default:
      return <Activity className="w-4 h-4" />
  }
}

export default function RecentSessions({ userRole, limit = 3 }: RecentSessionsProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentSessions()
  }, [userRole])

  async function fetchRecentSessions() {
    try {
      const endpoint = userRole === 'customer'
        ? '/api/customer/sessions'
        : '/api/mechanic/sessions'

      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }

      const data = await response.json()
      const allSessions = data.sessions || []

      // Get most recent sessions (sorted by created_at desc)
      const recentSessions = allSessions
        .sort((a: Session, b: Session) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, limit)

      setSessions(recentSessions)
    } catch (error) {
      console.error('[RecentSessions] Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const sessionsPageLink = userRole === 'customer' ? '/customer/sessions' : '/mechanic/sessions'

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-400" />
          Recent Sessions
        </h3>
        <Link
          href={sessionsPageLink}
          className="flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300 transition-colors font-medium"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No recent sessions</p>
          <p className="text-sm text-slate-500 mt-1">Your sessions will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`${sessionsPageLink}?id=${session.id}`}
              className="block group"
            >
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 transition-all hover:border-orange-500/50 hover:bg-slate-900/70">
                <div className="flex items-start justify-between gap-3">
                  {/* Left Side - Session Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {/* Type Icon */}
                      <div className="flex items-center gap-1.5 text-slate-400">
                        {getTypeIcon(session.type)}
                        <span className="text-xs font-medium uppercase">{session.plan}</span>
                      </div>

                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(session.status)}`}>
                        {getStatusIcon(session.status)}
                        {session.status}
                      </span>
                    </div>

                    {/* Partner Info */}
                    <div className="flex items-center gap-2 text-white font-medium mb-1">
                      {userRole === 'customer' ? (
                        <>
                          <Wrench className="w-4 h-4 text-slate-400" />
                          <span className="truncate">
                            {session.mechanic_name || 'Unassigned'}
                          </span>
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="truncate">
                            {session.customer_name || 'Customer'}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Vehicle/Issue */}
                    {session.vehicle && (
                      <p className="text-sm text-slate-400 truncate">{session.vehicle}</p>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                      <Calendar className="w-3 h-3" />
                      {new Date(session.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>

                  {/* Right Side - Price & Action */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        ${session.price.toFixed(2)}
                      </div>
                      {session.rating && (
                        <div className="flex items-center gap-1 text-xs text-amber-400">
                          <span>★</span>
                          <span>{session.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-orange-400 transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
