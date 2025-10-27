'use client'

/**
 * Admin: Feature Flags Management
 * Control brand specialist and smart matching features with toggle switches
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { AlertCircle, CheckCircle, RefreshCw, Shield, Zap, Info, Eye, DollarSign, Target } from 'lucide-react'

interface FeatureFlag {
  id: string
  flag_name: string
  description: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export default function FeatureFlagsAdminPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createClient()

  const fetchFlags = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('feature_flags')
        .select('*')
        .order('flag_name', { ascending: true })

      if (fetchError) throw fetchError

      setFlags(data || [])
    } catch (err: any) {
      console.error('Error fetching feature flags:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlags()
  }, [])

  const toggleFlag = async (flagId: string, currentState: boolean) => {
    try {
      setUpdating(flagId)
      setError(null)
      setSuccess(null)

      const { error: updateError } = await supabase
        .from('feature_flags')
        .update({
          enabled: !currentState,
          updated_at: new Date().toISOString()
        })
        .eq('id', flagId)

      if (updateError) throw updateError

      // Update local state
      setFlags(flags.map(f =>
        f.id === flagId
          ? { ...f, enabled: !currentState, updated_at: new Date().toISOString() }
          : f
      ))

      setSuccess(`Feature flag ${!currentState ? 'enabled' : 'disabled'} successfully`)
    } catch (err: any) {
      console.error('Error updating feature flag:', err)
      setError(err.message)
    } finally {
      setUpdating(null)
    }
  }

  const getFlagIcon = (flagName: string) => {
    if (flagName.includes('specialist')) return Target
    if (flagName.includes('matching')) return Zap
    if (flagName.includes('profile')) return Shield
    if (flagName.includes('keyword')) return Eye
    if (flagName.includes('pricing')) return DollarSign
    return Shield
  }

  const getFlagRecommendation = (flagName: string): {
    phase: number
    description: string
    dependencies?: string[]
  } => {
    switch (flagName) {
      case 'require_profile_completion':
        return {
          phase: 1,
          description: 'Week 1: Encourage profile updates',
          dependencies: []
        }
      case 'smart_matching_enabled':
        return {
          phase: 2,
          description: 'Week 2: Improve match quality',
          dependencies: ['require_profile_completion']
        }
      case 'keyword_extraction_enabled':
        return {
          phase: 3,
          description: 'Week 3: Auto-detect services',
          dependencies: ['smart_matching_enabled']
        }
      case 'enable_brand_specialist_matching':
        return {
          phase: 4,
          description: 'Week 4: Full specialist launch',
          dependencies: ['keyword_extraction_enabled']
        }
      case 'show_specialist_pricing':
        return {
          phase: 4,
          description: 'Week 4: Display premium pricing',
          dependencies: ['enable_brand_specialist_matching']
        }
      default:
        return {
          phase: 0,
          description: 'Custom feature flag',
          dependencies: []
        }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Feature Flags
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Control feature rollout for brand specialist matching system
          </p>
        </div>
        <button
          onClick={fetchFlags}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/25 transition"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/20 border border-green-500/30 p-4 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-100">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-100">Error</p>
            <p className="text-sm text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Rollout Guide */}
      <div className="bg-blue-500/20 border border-blue-500/30 p-6 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-100 mb-2">
              Recommended Rollout Strategy
            </h3>
            <div className="space-y-2 text-sm text-blue-200">
              <p>• <strong>Week 1:</strong> Enable profile completion requirement</p>
              <p>• <strong>Week 2:</strong> Enable smart matching algorithm</p>
              <p>• <strong>Week 3:</strong> Enable keyword extraction</p>
              <p>• <strong>Week 4:</strong> Enable brand specialist matching + pricing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Flags List */}
      <div className="space-y-4">
        {flags.map((flag) => {
          const Icon = getFlagIcon(flag.flag_name)
          const recommendation = getFlagRecommendation(flag.flag_name)
          const isUpdating = updating === flag.id

          return (
            <div
              key={flag.id}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-lg shadow-lg"
            >
              <div className="flex items-start justify-between">
                {/* Flag Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-lg border ${
                    flag.enabled
                      ? 'bg-green-500/20 border-green-500/30 text-green-400'
                      : 'bg-slate-700/50 border-slate-700 text-slate-400'
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">
                        {flag.flag_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h3>
                      {recommendation.phase > 0 && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded">
                          Phase {recommendation.phase}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-400 mt-1">
                      {flag.description}
                    </p>

                    {recommendation.phase > 0 && (
                      <p className="text-xs text-blue-400 mt-2">
                        {recommendation.description}
                      </p>
                    )}

                    {recommendation.dependencies && recommendation.dependencies.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-slate-400 mb-1">
                          Dependencies:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {recommendation.dependencies.map((dep) => {
                            const depFlag = flags.find(f => f.flag_name === dep)
                            return (
                              <span
                                key={dep}
                                className={`text-xs px-2 py-1 rounded border ${
                                  depFlag?.enabled
                                    ? 'bg-green-500/20 border-green-500/30 text-green-300'
                                    : 'bg-orange-500/20 border-orange-500/30 text-orange-300'
                                }`}
                              >
                                {dep.replace(/_/g, ' ')}
                                {depFlag?.enabled ? ' ✓' : ' (disabled)'}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      <span>Updated: {new Date(flag.updated_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => toggleFlag(flag.id, flag.enabled)}
                  disabled={isUpdating}
                  className={`
                    relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full
                    transition-colors duration-200 ease-in-out
                    ${flag.enabled ? 'bg-green-600' : 'bg-slate-600'}
                    ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <span className="sr-only">Toggle feature</span>
                  <span
                    className={`
                      inline-block h-6 w-6 transform rounded-full bg-white shadow-lg
                      transition duration-200 ease-in-out
                      ${flag.enabled ? 'translate-x-7' : 'translate-x-1'}
                    `}
                  >
                    {isUpdating && (
                      <RefreshCw className="h-4 w-4 animate-spin text-slate-600 mx-auto mt-1" />
                    )}
                  </span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {flags.length === 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-12 rounded-lg shadow-lg text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400">
            No feature flags found. Run the database migration to create feature flags.
          </p>
        </div>
      )}
    </div>
  )
}
