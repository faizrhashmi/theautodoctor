'use client'

import { useState, useEffect } from 'react'
import { Flag, AlertCircle, CheckCircle, XCircle, Calendar, Shield, RefreshCw } from 'lucide-react'

interface FeatureFlag {
  key: string
  name: string
  description: string
  enabled: boolean
  expiresAt?: string | null
  allowedRoles?: string[]
}

export default function ExperimentalFeaturesPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFlags()
  }, [])

  async function fetchFlags() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/feature-flags')
      if (!response.ok) {
        throw new Error('Failed to fetch feature flags')
      }

      const data = await response.json()
      setFlags(data.flags || [])
    } catch (err) {
      console.error('Error fetching flags:', err)
      setError('Failed to load feature flags')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Flag className="h-8 w-8 text-orange-400" />
            <h1 className="text-3xl font-bold text-white">Experimental Features</h1>
          </div>
          <p className="text-slate-400">
            Manage feature flags for testing and experimental functionality
          </p>
        </div>

        {/* Warning Banner */}
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-200 font-medium">Configuration Notice</p>
              <p className="text-amber-300/80 text-sm mt-1">
                Feature flags are currently code-based. To enable/disable flags, update{' '}
                <code className="bg-amber-900/30 px-1.5 py-0.5 rounded">
                  src/config/featureFlags.ts
                </code>
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Feature Flags List */}
        <div className="space-y-4">
          {flags.map((flag) => {
            const isExpired = flag.expiresAt ? new Date(flag.expiresAt) < new Date() : false

            return (
              <div
                key={flag.key}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{flag.name}</h3>
                      {flag.enabled ? (
                        isExpired ? (
                          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs font-medium rounded-full border border-amber-500/30">
                            Expired
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-green-500/20 text-green-300 text-xs font-medium rounded-full border border-green-500/30">
                            Enabled
                          </span>
                        )
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-700 text-slate-400 text-xs font-medium rounded-full">
                          Disabled
                        </span>
                      )}
                    </div>

                    <p className="text-slate-400 text-sm mb-3">{flag.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <code className="bg-slate-900/50 px-2 py-1 rounded text-slate-400">
                          {flag.key}
                        </code>
                      </div>

                      {flag.expiresAt && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            Expires: {new Date(flag.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {flag.allowedRoles && flag.allowedRoles.length > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Shield className="h-3.5 w-3.5" />
                          <span>Roles: {flag.allowedRoles.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-slate-900/50">
                    {flag.enabled && !isExpired ? (
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-slate-600" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {flags.length === 0 && !loading && (
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-12 text-center">
            <Flag className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No feature flags configured</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-slate-800/30 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-3">How to Enable a Feature Flag</h3>
          <ol className="space-y-2 text-sm text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-orange-400 font-mono">1.</span>
              <span>Open <code className="bg-slate-900/50 px-1.5 py-0.5 rounded">src/config/featureFlags.ts</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 font-mono">2.</span>
              <span>Find the feature flag you want to enable</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 font-mono">3.</span>
              <span>Set <code className="bg-slate-900/50 px-1.5 py-0.5 rounded">enabled: true</code></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 font-mono">4.</span>
              <span>Optionally set <code className="bg-slate-900/50 px-1.5 py-0.5 rounded">expiresAt</code> to auto-disable after a date</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 font-mono">5.</span>
              <span>Restart the development server</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
