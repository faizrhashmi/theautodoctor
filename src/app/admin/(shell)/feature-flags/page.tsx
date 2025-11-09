'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface FeatureFlag {
  id: string
  flag_key: string
  flag_name: string
  description: string | null
  is_enabled: boolean
  enabled_for_roles: string[]
  rollout_percentage: number
  metadata: any
  created_at: string
  updated_at: string
}

export default function AdminFeatureFlagsPage() {
  const [loading, setLoading] = useState(true)
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all')

  useEffect(() => {
    loadFlags()
  }, [])

  async function loadFlags() {
    try {
      const response = await fetch('/api/admin/feature-flags')
      if (response.ok) {
        const data = await response.json()
        setFlags(data.flags || [])
      }
    } catch (error) {
      console.error('Error loading feature flags:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleFlag(flagId: string, currentEnabled: boolean) {
    try {
      const response = await fetch(`/api/admin/feature-flags/${flagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !currentEnabled })
      })

      if (response.ok) {
        loadFlags()
      } else {
        alert('Failed to toggle feature flag')
      }
    } catch (error) {
      console.error('Error toggling flag:', error)
      alert('Failed to toggle feature flag')
    }
  }

  async function updateRollout(flagId: string, percentage: number) {
    try {
      const response = await fetch(`/api/admin/feature-flags/${flagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollout_percentage: percentage })
      })

      if (response.ok) {
        loadFlags()
      } else {
        alert('Failed to update rollout percentage')
      }
    } catch (error) {
      console.error('Error updating rollout:', error)
      alert('Failed to update rollout percentage')
    }
  }

  const filteredFlags = flags.filter(flag => {
    if (filter === 'enabled') return flag.is_enabled
    if (filter === 'disabled') return !flag.is_enabled
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading feature flags...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900/50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Feature Flags</h1>
              <p className="text-slate-400">Manage toggleable platform features and gradual rollouts</p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            All Features ({flags.length})
          </button>
          <button
            onClick={() => setFilter('enabled')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'enabled'
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Enabled ({flags.filter(f => f.is_enabled).length})
          </button>
          <button
            onClick={() => setFilter('disabled')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'disabled'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Disabled ({flags.filter(f => !f.is_enabled).length})
          </button>
        </div>

        {/* Feature Flags List */}
        <div className="space-y-4">
          {filteredFlags.length === 0 ? (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8 text-center">
              <p className="text-slate-400">No feature flags found</p>
            </div>
          ) : (
            filteredFlags.map((flag) => (
              <div
                key={flag.id}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{flag.flag_name}</h3>
                      <code className="px-2 py-1 bg-slate-900 text-blue-400 text-sm rounded border border-slate-700">
                        {flag.flag_key}
                      </code>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          flag.is_enabled
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-slate-700 text-slate-400 border border-slate-600'
                        }`}
                      >
                        {flag.is_enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                    {flag.description && (
                      <p className="text-slate-400 mb-3">{flag.description}</p>
                    )}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-slate-500">
                        Roles: <span className="text-slate-300">{flag.enabled_for_roles.join(', ')}</span>
                      </div>
                      <div className="text-slate-500">
                        Rollout: <span className="text-slate-300">{flag.rollout_percentage}%</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFlag(flag.id, flag.is_enabled)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      flag.is_enabled
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {flag.is_enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>

                {/* Rollout Percentage Control */}
                {flag.is_enabled && flag.rollout_percentage < 100 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <label className="block text-sm text-slate-400 mb-2">
                      Gradual Rollout: {flag.rollout_percentage}%
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={flag.rollout_percentage}
                        onChange={(e) => updateRollout(flag.id, parseInt(e.target.value))}
                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateRollout(flag.id, 50)}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded transition"
                        >
                          50%
                        </button>
                        <button
                          onClick={() => updateRollout(flag.id, 100)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                        >
                          100%
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Key Feature Highlights */}
                {flag.flag_key === 'rfq_system' && (
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-400 text-sm font-medium">
                      🎯 RFQ System: When enabled, customers can request quotes from multiple workshops
                    </p>
                  </div>
                )}
                {flag.flag_key === 'subscriptions' && (
                  <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <p className="text-purple-400 text-sm font-medium">
                      💳 Subscriptions: Enable credit-based monthly plans for customers
                    </p>
                  </div>
                )}
                {flag.flag_key === 'brand_specialists' && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 text-sm font-medium">
                      ⭐ Brand Specialists: Customers can filter mechanics by vehicle brand expertise
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-blue-400 font-semibold mb-2">ℹ️ Feature Flag Guidelines</h3>
          <ul className="text-blue-300/80 text-sm space-y-1 list-disc list-inside">
            <li>Test features with gradual rollout before enabling for 100% of users</li>
            <li>Features disabled here will be hidden from customers immediately</li>
            <li>RFQ System is currently toggleable as requested - enable when ready</li>
            <li>Subscription Plans require Stripe configuration before enabling</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
