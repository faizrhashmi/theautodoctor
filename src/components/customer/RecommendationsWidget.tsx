'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Lightbulb, X, Calendar, AlertTriangle, Check, Star, ChevronRight, Sparkles } from 'lucide-react'

interface VehicleRecommendation {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  recommendation_type: string
  status: string
  vehicle: {
    year: number
    make: string
    model: string
  }
}

interface MechanicRecommendation {
  id: string
  score: number
  reasons: string[]
  mechanic: {
    id: string
    full_name: string
    specialties: string[]
  }
  past_sessions_count: number
  avg_rating: number
}

interface RecommendationsSummary {
  total_active_recommendations: number
  high_priority_count: number
}

const priorityConfig = {
  critical: { color: 'red', icon: AlertTriangle, label: 'Critical' },
  high: { color: 'orange', icon: AlertTriangle, label: 'High Priority' },
  medium: { color: 'yellow', icon: Lightbulb, label: 'Recommended' },
  low: { color: 'blue', icon: Lightbulb, label: 'Optional' },
}

export function RecommendationsWidget() {
  const [loading, setLoading] = useState(true)
  const [vehicleRecs, setVehicleRecs] = useState<VehicleRecommendation[]>([])
  const [mechanicRecs, setMechanicRecs] = useState<MechanicRecommendation[]>([])
  const [summary, setSummary] = useState<RecommendationsSummary | null>(null)
  const [dismissing, setDismissing] = useState<string | null>(null)

  useEffect(() => {
    loadRecommendations()
  }, [])

  async function loadRecommendations() {
    try {
      const response = await fetch('/api/customer/recommendations?type=all&status=active')
      if (response.ok) {
        const data = await response.json()
        setVehicleRecs(data.vehicle_recommendations || [])
        setMechanicRecs(data.mechanic_recommendations || [])
        setSummary(data.summary || null)
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  async function dismissRecommendation(id: string) {
    setDismissing(id)
    try {
      const response = await fetch(`/api/customer/recommendations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', dismiss_reason: 'User dismissed from dashboard' }),
      })

      if (response.ok) {
        setVehicleRecs(vehicleRecs.filter(r => r.id !== id))
      }
    } catch (error) {
      console.error('Failed to dismiss recommendation:', error)
    } finally {
      setDismissing(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-purple-600/20 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-6">
        <div className="animate-pulse flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-purple-400" />
          <div className="h-6 w-32 bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  const topVehicleRecs = vehicleRecs.slice(0, 3)
  const topMechanicRecs = mechanicRecs.slice(0, 2)
  const hasRecommendations = topVehicleRecs.length > 0 || topMechanicRecs.length > 0

  if (!hasRecommendations) {
    return null // Don't show widget if no recommendations
  }

  return (
    <div className="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-purple-600/20 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Sparkles className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Personalized Recommendations</h3>
            <p className="text-sm text-purple-200">
              {summary && summary.high_priority_count > 0 && (
                <span className="text-orange-300 font-medium">
                  {summary.high_priority_count} high priority item{summary.high_priority_count > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        </div>
        <Link
          href="/customer/dashboard" // TODO: Create recommendations page
          className="text-sm text-purple-300 hover:text-purple-200 flex items-center gap-1 transition"
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {/* Vehicle Maintenance Recommendations */}
        {topVehicleRecs.map((rec) => {
          const config = priorityConfig[rec.priority]
          const Icon = config.icon

          return (
            <div
              key={rec.id}
              className={`p-4 rounded-xl border bg-slate-800/50 transition ${
                rec.priority === 'critical'
                  ? 'border-red-500/50 bg-red-900/20'
                  : rec.priority === 'high'
                  ? 'border-orange-500/50 bg-orange-900/20'
                  : 'border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 flex-shrink-0 text-${config.color}-400`} />
                    <span className={`text-xs font-semibold text-${config.color}-300 uppercase tracking-wider`}>
                      {config.label}
                    </span>
                  </div>
                  <h4 className="text-white font-semibold mb-1">{rec.title}</h4>
                  <p className="text-sm text-slate-300 mb-2">{rec.description}</p>
                  {rec.vehicle && (
                    <p className="text-xs text-slate-400">
                      {rec.vehicle.year} {rec.vehicle.make} {rec.vehicle.model}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <Link
                      href={`/intake?plan=diagnostic`}
                      className="text-sm px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition"
                    >
                      Schedule Service
                    </Link>
                    <button
                      onClick={() => dismissRecommendation(rec.id)}
                      disabled={dismissing === rec.id}
                      className="text-sm px-3 py-1 text-slate-400 hover:text-white transition"
                    >
                      {dismissing === rec.id ? 'Dismissing...' : 'Dismiss'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => dismissRecommendation(rec.id)}
                  disabled={dismissing === rec.id}
                  className="p-1 text-slate-400 hover:text-white rounded transition flex-shrink-0"
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}

        {/* Mechanic Recommendations */}
        {topMechanicRecs.map((rec) => (
          <div
            key={rec.id}
            className="p-4 rounded-xl border border-blue-500/50 bg-blue-900/20"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                <Star className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-semibold mb-1">Recommended Mechanic</h4>
                <p className="text-lg font-bold text-blue-300 mb-1">{rec.mechanic.full_name}</p>
                <div className="flex items-center gap-3 text-sm text-slate-300 mb-2">
                  {rec.avg_rating && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                      {rec.avg_rating.toFixed(1)}
                    </span>
                  )}
                  <span>{rec.past_sessions_count} past sessions</span>
                  <span className="text-blue-400 font-medium">{rec.score}% match</span>
                </div>
                {rec.mechanic.specialties && rec.mechanic.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {rec.mechanic.specialties.slice(0, 3).map((spec, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                        {spec}
                      </span>
                    ))}
                  </div>
                )}
                {rec.reasons && rec.reasons.length > 0 && (
                  <ul className="space-y-1 mb-3">
                    {rec.reasons.slice(0, 2).map((reason, idx) => (
                      <li key={idx} className="text-xs text-slate-400 flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-400 flex-shrink-0" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href={`/intake?specialist=true`}
                  className="inline-block text-sm px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
                >
                  Request {rec.mechanic.full_name}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Generate More Button */}
      {vehicleRecs.length === 0 && mechanicRecs.length === 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={async () => {
              setLoading(true)
              await fetch('/api/customer/recommendations', { method: 'POST' })
              loadRecommendations()
            }}
            className="text-sm px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg font-medium transition border border-purple-500/30"
          >
            Generate Recommendations
          </button>
        </div>
      )}
    </div>
  )
}
