'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import {
  Trophy,
  Target,
  CheckCircle,
  Circle,
  TrendingUp,
  Users,
  Calendar,
  AlertTriangle,
  Star,
  ArrowRight,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface BetaMilestone {
  id: string
  title: string
  description: string
  target: number
  current: number
  completed: boolean
  completedAt?: string
  icon?: React.ReactNode
  critical?: boolean
}

interface BetaProgramData {
  status: 'not_started' | 'in_progress' | 'ready' | 'launched'
  startDate: string
  targetDate: string
  workshops: {
    active: number
    withMechanics: number
    target: number
    ready: number // workshops that meet all criteria
  }
  milestones: BetaMilestone[]
  readinessScore: number // 0-100
  blockers: string[]
  nextSteps: string[]
  topWorkshops: Array<{
    id: string
    name: string
    mechanics: number
    healthScore: number
  }>
}

interface BetaProgramTrackerProps {
  data: BetaProgramData
  className?: string
}

export function BetaProgramTracker({ data, className }: BetaProgramTrackerProps) {
  const progressPercentage = Math.min(100, (data.workshops.active / data.workshops.target) * 100)
  const daysUntilTarget = Math.ceil(
    (new Date(data.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  const getStatusColor = () => {
    switch (data.status) {
      case 'launched':
        return 'bg-green-50 border-green-200 text-green-700'
      case 'ready':
        return 'bg-blue-50 border-blue-200 text-blue-700'
      case 'in_progress':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  const getStatusLabel = () => {
    switch (data.status) {
      case 'launched':
        return 'Beta Launched'
      case 'ready':
        return 'Ready to Launch'
      case 'in_progress':
        return 'Building Beta Group'
      default:
        return 'Not Started'
    }
  }

  const getReadinessColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className={cn('bg-white rounded-lg shadow-sm border border-gray-200', className)}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Beta Program Tracker</h2>
              <p className="text-sm text-gray-500">
                Progress toward launching with 3-5 workshops
              </p>
            </div>
          </div>
          <div className={cn('px-3 py-1 rounded-full border font-medium', getStatusColor())}>
            {getStatusLabel()}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-3xl font-bold text-gray-900">
              {data.workshops.active}/{data.workshops.target}
            </p>
            <p className="text-sm text-gray-500">Active Workshops</p>
          </div>
          <div className="text-right">
            <p className={cn('text-2xl font-bold', getReadinessColor(data.readinessScore))}>
              {data.readinessScore}%
            </p>
            <p className="text-sm text-gray-500">Ready</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Started {formatDistanceToNow(new Date(data.startDate), { addSuffix: true })}</span>
            <span>
              {daysUntilTarget > 0
                ? `${daysUntilTarget} days until target`
                : 'Target date passed'}
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-gray-200">
        <div>
          <p className="text-sm text-gray-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-gray-900">{data.workshops.active}</p>
          <p className="text-xs text-green-600">
            {data.workshops.active >= 3 ? '✓ Min met' : `Need ${3 - data.workshops.active} more`}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">With Mechanics</p>
          <p className="text-2xl font-bold text-gray-900">{data.workshops.withMechanics}</p>
          <p className="text-xs text-gray-500">
            {Math.round((data.workshops.withMechanics / Math.max(1, data.workshops.active)) * 100)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Beta Ready</p>
          <p className="text-2xl font-bold text-green-600">{data.workshops.ready}</p>
          <p className="text-xs text-gray-500">Meet all criteria</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Days Active</p>
          <p className="text-2xl font-bold text-gray-900">
            {Math.floor(
              (Date.now() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24)
            )}
          </p>
          <p className="text-xs text-gray-500">Since start</p>
        </div>
      </div>

      {/* Milestones */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Beta Milestones</h3>
        <div className="space-y-3">
          {data.milestones.map((milestone) => (
            <div
              key={milestone.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg',
                milestone.completed
                  ? 'bg-green-50 border border-green-200'
                  : milestone.critical
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-gray-50 border border-gray-200'
              )}
            >
              <div className="flex-shrink-0">
                {milestone.completed ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : milestone.critical ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{milestone.title}</p>
                    <p className="text-xs text-gray-500">{milestone.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {milestone.current}/{milestone.target}
                    </p>
                    {milestone.completed && milestone.completedAt && (
                      <p className="text-xs text-green-600">
                        {formatDistanceToNow(new Date(milestone.completedAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
                {!milestone.completed && (
                  <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                    <div
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        milestone.critical ? 'bg-yellow-500' : 'bg-blue-500'
                      )}
                      style={{
                        width: `${Math.min(100, (milestone.current / milestone.target) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two column layout for blockers and next steps */}
      <div className="p-6 grid md:grid-cols-2 gap-6 border-b border-gray-200">
        {/* Blockers */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Blockers
          </h3>
          {data.blockers.length > 0 ? (
            <ul className="space-y-2">
              {data.blockers.map((blocker, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">•</span>
                  {blocker}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-green-600">No blockers identified</p>
          )}
        </div>

        {/* Next Steps */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-blue-500" />
            Next Steps
          </h3>
          {data.nextSteps.length > 0 ? (
            <ul className="space-y-2">
              {data.nextSteps.map((step, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-blue-500 mt-1">→</span>
                  {step}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No actions needed</p>
          )}
        </div>
      </div>

      {/* Top Performing Workshops */}
      {data.topWorkshops.length > 0 && (
        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            Top Performing Workshops
          </h3>
          <div className="space-y-2">
            {data.topWorkshops.map((workshop, index) => (
              <div
                key={workshop.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold',
                      index === 0
                        ? 'bg-yellow-500'
                        : index === 1
                        ? 'bg-gray-400'
                        : 'bg-orange-600'
                    )}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{workshop.name}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-gray-500">
                        {workshop.mechanics} mechanics
                      </span>
                      <span className="text-xs text-gray-500">
                        Health: {workshop.healthScore}/100
                      </span>
                    </div>
                  </div>
                </div>
                {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ready to Launch Banner */}
      {data.status === 'ready' && (
        <div className="p-4 bg-green-50 border-t border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <p className="font-semibold text-green-900">Ready to Launch!</p>
                <p className="text-sm text-green-700">
                  All beta criteria met. You can now launch the beta program.
                </p>
              </div>
            </div>
            <button className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700">
              Launch Beta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}