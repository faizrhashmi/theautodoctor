// @ts-nocheck
// src/components/admin/ActivityFeed.tsx
'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Clock, Video, MessageSquare, FileText, AlertCircle } from 'lucide-react'

function formatTimeAgo(timestamp: string) {
  const date = new Date(timestamp)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}
interface Activity {
  id: string
  type: 'session' | 'request' | 'error'
  title: string
  description: string
  timestamp: string
  status?: string
}

interface ActivityFeedProps {
  initialActivities: Activity[]
}

export function ActivityFeed({ initialActivities }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Subscribe to sessions changes
    const sessionsChannel = supabase
      .channel('sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
        },
        (payload) => {
          const session = payload.new as any
          if (session) {
            const newActivity: Activity = {
              id: session.id,
              type: 'session',
              title: `${session.type} session ${payload.eventType === 'INSERT' ? 'created' : 'updated'}`,
              description: `Status: ${session.status}`,
              timestamp: session.created_at || new Date().toISOString(),
              status: session.status,
            }
            setActivities((prev) => [newActivity, ...prev].slice(0, 10))
          }
        }
      )
      .subscribe()

    // Subscribe to session requests changes
    const requestsChannel = supabase
      .channel('requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_requests',
        },
        (payload) => {
          const request = payload.new as any
          if (request) {
            const newActivity: Activity = {
              id: request.id,
              type: 'request',
              title: `Session request ${payload.eventType === 'INSERT' ? 'received' : 'updated'}`,
              description: `Status: ${request.status}`,
              timestamp: request.created_at || new Date().toISOString(),
              status: request.status,
            }
            setActivities((prev) => [newActivity, ...prev].slice(0, 10))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionsChannel)
      supabase.removeChannel(requestsChannel)
    }
  }, [supabase])

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'session':
        return Video
      case 'request':
        return MessageSquare
      case 'error':
        return AlertCircle
      default:
        return FileText
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
      case 'accepted':
      case 'completed':
        return 'text-emerald-600 bg-emerald-100'
      case 'pending':
      case 'waiting':
        return 'text-amber-600 bg-amber-100'
      case 'cancelled':
      case 'expired':
      case 'unattended':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-slate-600 bg-slate-100'
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
          <p className="mt-1 text-sm text-slate-600">Real-time updates from your system</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-600"></div>
          <span className="text-xs font-medium text-emerald-700">Live</span>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm text-slate-600">No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => {
            const Icon = getIcon(activity.type)
            return (
              <div
                key={`${activity.id}-${activity.timestamp}`}
                className="flex items-start gap-4 rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50"
              >
                <div className="rounded-lg bg-blue-100 p-2">
                  <Icon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{activity.description}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatTimeAgo(activity.timestamp)}
                  </p>
                </div>
                {activity.status && (
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(activity.status)}`}
                  >
                    {activity.status}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
