'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import {
  Building2,
  Users,
  Calendar,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Mail,
  UserPlus,
  Clock,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

export interface WorkshopHealthData {
  workshop: {
    id: string
    name: string
    email: string
    status: 'active' | 'pending' | 'suspended'
    createdAt: string
    approvedAt?: string
    lastActivity?: string
  }
  metrics: {
    mechanics: number
    invitesSent: number
    invitesAccepted: number
    inviteAcceptanceRate: number
    lastLogin?: string
    profileUpdates: number
    dashboardAccesses: number
  }
  health: {
    score: number // 0-100
    status: 'excellent' | 'good' | 'warning' | 'critical'
    issues: string[]
    recommendations: string[]
  }
  timeline: Array<{
    date: string
    event: string
    type: 'positive' | 'negative' | 'neutral'
  }>
}

interface WorkshopHealthScorecardProps {
  data: WorkshopHealthData
  className?: string
}

export function WorkshopHealthScorecard({ data, className }: WorkshopHealthScorecardProps) {
  const getHealthColor = (status: WorkshopHealthData['health']['status']) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'good':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const getStatusBadge = (status: WorkshopHealthData['workshop']['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            Active
          </span>
        )
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
            Pending
          </span>
        )
      case 'suspended':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
            Suspended
          </span>
        )
    }
  }

  const getHealthIcon = (status: WorkshopHealthData['health']['status']) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircle className="h-6 w-6" />
      case 'warning':
        return <AlertCircle className="h-6 w-6" />
      case 'critical':
        return <XCircle className="h-6 w-6" />
    }
  }

  const getTimelineIcon = (type: 'positive' | 'negative' | 'neutral') => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'negative':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const daysSinceApproval = data.workshop.approvedAt
    ? Math.floor(
        (Date.now() - new Date(data.workshop.approvedAt).getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0

  const daysSinceLastLogin = data.metrics.lastLogin
    ? Math.floor(
        (Date.now() - new Date(data.metrics.lastLogin).getTime()) / (1000 * 60 * 60 * 24)
      )
    : 999

  return (
    <div className={cn('bg-white rounded-lg shadow-sm border border-gray-200', className)}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-gray-400" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{data.workshop.name}</h2>
              <p className="text-sm text-gray-500">{data.workshop.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(data.workshop.status)}
          </div>
        </div>

        {/* Health Score */}
        <div
          className={cn(
            'mt-6 p-4 rounded-lg border',
            getHealthColor(data.health.status)
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getHealthIcon(data.health.status)}
              <div>
                <p className="text-sm font-medium opacity-80">Health Score</p>
                <p className="text-3xl font-bold">{data.health.score}/100</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold uppercase">{data.health.status}</p>
              <p className="text-xs opacity-75 mt-1">
                {daysSinceApproval} days since approval
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Users className="h-4 w-4" />
            <p className="text-xs font-medium">Mechanics</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.metrics.mechanics}</p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <UserPlus className="h-4 w-4" />
            <p className="text-xs font-medium">Invite Rate</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {data.metrics.inviteAcceptanceRate}%
          </p>
          <p className="text-xs text-gray-500">
            {data.metrics.invitesAccepted}/{data.metrics.invitesSent}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Activity className="h-4 w-4" />
            <p className="text-xs font-medium">Dashboard Visits</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {data.metrics.dashboardAccesses}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Clock className="h-4 w-4" />
            <p className="text-xs font-medium">Last Active</p>
          </div>
          <p
            className={cn(
              'text-2xl font-bold',
              daysSinceLastLogin > 7 ? 'text-red-600' : 'text-gray-900'
            )}
          >
            {daysSinceLastLogin < 999 ? `${daysSinceLastLogin}d ago` : 'Never'}
          </p>
        </div>
      </div>

      {/* Issues and Recommendations */}
      <div className="p-6 grid md:grid-cols-2 gap-6 border-b border-gray-200">
        {/* Issues */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Issues</h3>
          {data.health.issues.length > 0 ? (
            <div className="space-y-2">
              {data.health.issues.map((issue, index) => (
                <div key={index} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">{issue}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <p className="text-sm">No issues detected</p>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Recommendations</h3>
          {data.health.recommendations.length > 0 ? (
            <div className="space-y-2">
              {data.health.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">{rec}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recommendations at this time</p>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {data.timeline.slice(0, 5).map((event, index) => (
            <div key={index} className="flex items-start gap-3">
              {getTimelineIcon(event.type)}
              <div className="flex-1">
                <p className="text-sm text-gray-900">{event.event}</p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(event.date), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          {data.timeline.length === 0 && (
            <p className="text-sm text-gray-500">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  )
}