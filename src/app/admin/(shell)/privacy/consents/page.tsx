'use client'

import { useState, useEffect } from 'react'

interface ConsentStatistics {
  consent_type: string
  total_consent_records: number
  active_consents: number
  withdrawn_consents: number
  granted_at_signup: number
  granted_in_settings: number
  granted_at_quote: number
  opt_in_percentage: number
  withdrawal_percentage: number
  granted_30_days: number
  withdrawn_30_days: number
}

interface OutdatedConsent {
  customer_id: string
  email: string
  full_name: string
  consent_type: string
  consent_version: string
  granted_at: string
  current_version: string
  needs_update: boolean
}

export default function ConsentCompliancePage() {
  const [statistics, setStatistics] = useState<ConsentStatistics[]>([])
  const [outdatedConsents, setOutdatedConsents] = useState<OutdatedConsent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConsentData = async () => {
    try {
      setLoading(true)
      const [statsRes, outdatedRes] = await Promise.all([
        fetch('/api/admin/privacy/consents/stats'),
        fetch('/api/admin/privacy/consents/outdated'),
      ])

      if (!statsRes.ok || !outdatedRes.ok) {
        throw new Error('Failed to fetch consent data')
      }

      const [statsData, outdatedData] = await Promise.all([
        statsRes.json(),
        outdatedRes.json(),
      ])

      setStatistics(statsData.statistics || [])
      setOutdatedConsents(outdatedData.outdated || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching consent data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load consent data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConsentData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading consent compliance data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <h2 className="text-red-500 font-semibold">Error Loading Consent Data</h2>
          <p className="text-slate-300 mt-2">{error}</p>
          <button
            onClick={fetchConsentData}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const marketingStats = statistics.find((s) => s.consent_type === 'marketing_emails')
  const totalCustomers = statistics.reduce((sum, s) => Math.max(sum, s.total_consent_records), 0)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Consent Compliance</h1>
          <p className="text-slate-400 mt-1">CASL & PIPEDA Consent Management</p>
        </div>
        <button
          onClick={fetchConsentData}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* CASL Notice */}
      <div className="bg-blue-500/10 border border-blue-500 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📧</span>
          <div>
            <h3 className="font-semibold text-blue-400 mb-1">CASL Compliance</h3>
            <p className="text-sm text-slate-300">
              Canada's Anti-Spam Legislation (CASL) requires <strong>explicit consent</strong> before sending commercial electronic messages.
              Monitor opt-in rates and consent withdrawals to ensure ongoing compliance.
            </p>
          </div>
        </div>
      </div>

      {/* Marketing Consent Overview */}
      {marketingStats && (
        <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Marketing Email Consent (CASL)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-3xl font-bold text-green-400">{marketingStats.opt_in_percentage.toFixed(1)}%</div>
              <div className="text-sm text-slate-400 mt-1">Opt-in Rate</div>
              <div className="text-xs text-slate-500">
                {marketingStats.active_consents} of {marketingStats.total_consent_records} customers
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400">{marketingStats.granted_30_days}</div>
              <div className="text-sm text-slate-400 mt-1">New Opt-ins (30d)</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-400">{marketingStats.withdrawn_30_days}</div>
              <div className="text-sm text-slate-400 mt-1">Opt-outs (30d)</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-400">{marketingStats.withdrawal_percentage.toFixed(1)}%</div>
              <div className="text-sm text-slate-400 mt-1">Withdrawal Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Consent Type Statistics */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Consent Statistics by Type</h2>
        <div className="space-y-4">
          {statistics.map((stat) => (
            <ConsentTypeCard key={stat.consent_type} stat={stat} />
          ))}
        </div>
      </div>

      {/* Outdated Consent Versions */}
      {outdatedConsents.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Outdated Consent Versions</h2>
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium">
              {outdatedConsents.length} customers
            </span>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            These customers are using an older version of consent forms and should be prompted to review and re-consent.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Consent Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Current Version</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Latest Version</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Granted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {outdatedConsents.slice(0, 10).map((consent) => (
                  <tr key={`${consent.customer_id}-${consent.consent_type}`} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-white">{consent.full_name}</div>
                        <div className="text-xs text-slate-400">{consent.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-300">{formatConsentType(consent.consent_type)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                        {consent.consent_version}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                        {consent.current_version}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-400">
                        {new Date(consent.granted_at).toLocaleDateString('en-CA')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {outdatedConsents.length > 10 && (
            <div className="mt-4 text-center text-sm text-slate-400">
              Showing 10 of {outdatedConsents.length} outdated consents
            </div>
          )}
        </div>
      )}

      {/* Consent Method Breakdown */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Consent Collection Methods</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statistics[0] && (
            <>
              <MethodCard
                title="At Signup"
                count={statistics[0].granted_at_signup}
                icon="📝"
                color="blue"
              />
              <MethodCard
                title="In Settings"
                count={statistics[0].granted_in_settings}
                icon="⚙️"
                color="green"
              />
              <MethodCard
                title="At Quote Acceptance"
                count={statistics[0].granted_at_quote}
                icon="💼"
                color="purple"
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Consent Type Card Component
function ConsentTypeCard({ stat }: { stat: ConsentStatistics }) {
  const optInColor = stat.opt_in_percentage >= 80 ? 'text-green-400' : stat.opt_in_percentage >= 50 ? 'text-yellow-400' : 'text-red-400'
  const netChange = stat.granted_30_days - stat.withdrawn_30_days

  return (
    <div className="bg-slate-900/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white">{formatConsentType(stat.consent_type)}</h3>
        <span className={`text-2xl font-bold ${optInColor}`}>{stat.opt_in_percentage.toFixed(1)}%</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <div>
          <div className="text-slate-500 text-xs mb-1">Active</div>
          <div className="text-white font-medium">{stat.active_consents.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs mb-1">Withdrawn</div>
          <div className="text-slate-400">{stat.withdrawn_consents.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs mb-1">New (30d)</div>
          <div className="text-green-400">+{stat.granted_30_days}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs mb-1">Opted Out (30d)</div>
          <div className="text-orange-400">-{stat.withdrawn_30_days}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs mb-1">Net Change</div>
          <div className={netChange >= 0 ? 'text-green-400' : 'text-red-400'}>
            {netChange >= 0 ? '+' : ''}{netChange}
          </div>
        </div>
      </div>
      {/* Progress Bar */}
      <div className="mt-3 bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
          style={{ width: `${stat.opt_in_percentage}%` }}
        />
      </div>
    </div>
  )
}

// Method Card Component
function MethodCard({
  title,
  count,
  icon,
  color,
}: {
  title: string
  count: number
  icon: string
  color: string
}) {
  const colorClasses = {
    blue: 'border-blue-500/30 bg-blue-500/10',
    green: 'border-green-500/30 bg-green-500/10',
    purple: 'border-purple-500/30 bg-purple-500/10',
  }

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white mb-1">{count.toLocaleString()}</div>
      <div className="text-sm text-slate-400">{title}</div>
    </div>
  )
}

// Helper function to format consent type
function formatConsentType(type: string): string {
  const typeMap: Record<string, string> = {
    privacy_policy: 'Privacy Policy',
    terms_of_service: 'Terms of Service',
    marketing_emails: 'Marketing Emails',
    sms_notifications: 'SMS Notifications',
    data_sharing: 'Data Sharing',
    marketplace_understanding: 'Marketplace Understanding',
  }
  return typeMap[type] || type
}
