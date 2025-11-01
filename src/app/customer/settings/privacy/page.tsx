'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Download, Trash2, Check, X, Clock, AlertTriangle } from 'lucide-react'

interface Consent {
  id: string
  consentType: string
  consentGranted: boolean
  consentVersion: string
  grantedAt: string | null
  withdrawnAt: string | null
  consentMethod: string
}

interface ConsentSummary {
  hasTermsConsent: boolean
  hasPrivacyConsent: boolean
  hasMarketplaceConsent: boolean
  hasMarketingConsent: boolean
  hasAnalyticsConsent: boolean
  hasAllRequiredConsents: boolean
}

export default function CustomerPrivacySettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [consents, setConsents] = useState<Consent[]>([])
  const [summary, setSummary] = useState<ConsentSummary | null>(null)
  const [withdrawingConsent, setWithdrawingConsent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchConsents()
  }, [])

  async function fetchConsents() {
    try {
      setLoading(true)
      const response = await fetch('/api/customer/privacy/consents')

      if (!response.ok) {
        throw new Error('Failed to fetch consents')
      }

      const data = await response.json()
      setConsents(data.consents || [])
      setSummary(data.summary || null)
    } catch (err: any) {
      setError(err.message || 'Failed to load privacy settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleWithdrawConsent(consentType: string) {
    // Prevent withdrawing required consents
    const requiredConsents = ['terms_of_service', 'privacy_policy', 'marketplace_understanding']
    if (requiredConsents.includes(consentType)) {
      setError('You cannot withdraw required consents. Please delete your account if you wish to revoke all consents.')
      setTimeout(() => setError(null), 5000)
      return
    }

    if (!confirm(`Are you sure you want to withdraw consent for ${formatConsentType(consentType)}? This will take effect immediately.`)) {
      return
    }

    try {
      setWithdrawingConsent(consentType)
      setError(null)

      const response = await fetch('/api/customer/privacy/withdraw-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentType }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to withdraw consent')
      }

      setSuccessMessage(`Successfully withdrew consent for ${formatConsentType(consentType)}`)
      setTimeout(() => setSuccessMessage(null), 5000)

      // Refresh consents
      await fetchConsents()
    } catch (err: any) {
      setError(err.message || 'Failed to withdraw consent')
      setTimeout(() => setError(null), 5000)
    } finally {
      setWithdrawingConsent(null)
    }
  }

  async function handleGrantConsent(consentType: string) {
    try {
      setError(null)

      const response = await fetch('/api/customer/privacy/grant-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentType }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to grant consent')
      }

      setSuccessMessage(`Successfully granted consent for ${formatConsentType(consentType)}`)
      setTimeout(() => setSuccessMessage(null), 5000)

      // Refresh consents
      await fetchConsents()
    } catch (err: any) {
      setError(err.message || 'Failed to grant consent')
      setTimeout(() => setError(null), 5000)
    }
  }

  function formatConsentType(type: string): string {
    const labels: Record<string, string> = {
      terms_of_service: 'Terms of Service',
      privacy_policy: 'Privacy Policy',
      marketplace_understanding: 'Marketplace Understanding',
      marketing_emails: 'Marketing Emails',
      analytics_cookies: 'Analytics Cookies',
      product_improvement: 'Product Improvement',
      data_sharing_workshops: 'Data Sharing with Workshops',
    }
    return labels[type] || type
  }

  function getConsentDescription(type: string): string {
    const descriptions: Record<string, string> = {
      terms_of_service: 'Required to use The Auto Doctor platform',
      privacy_policy: 'Required to understand how we handle your personal information',
      marketplace_understanding: 'Required to acknowledge we connect you with independent workshops',
      marketing_emails: 'Optional - Receive promotional emails and special offers (CASL)',
      analytics_cookies: 'Optional - Help us improve by analyzing platform usage',
      product_improvement: 'Optional - Share anonymized data to build better features',
      data_sharing_workshops: 'Share your information with workshops for repair quotes and services',
    }
    return descriptions[type] || 'No description available'
  }

  function isConsentActive(consentType: string): boolean {
    const consent = consents.find(c => c.consentType === consentType)
    return consent ? (consent.consentGranted && !consent.withdrawnAt) : false
  }

  function getConsentDate(consentType: string): string | null {
    const consent = consents.find(c => c.consentType === consentType)
    if (!consent) return null
    if (consent.withdrawnAt) return consent.withdrawnAt
    return consent.grantedAt
  }

  const requiredConsents = ['terms_of_service', 'privacy_policy', 'marketplace_understanding']
  const optionalConsents = ['marketing_emails', 'analytics_cookies', 'product_improvement', 'data_sharing_workshops']

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading privacy settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-orange-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Privacy & Consent Management</h1>
              <p className="text-sm text-slate-400 mt-1">Manage your privacy preferences and data consents (PIPEDA)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-400" />
              <p className="text-sm text-green-200">{successMessage}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Compliance Status */}
            <div className={`rounded-lg border p-6 ${summary?.hasAllRequiredConsents ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
              <div className="flex items-center gap-3 mb-2">
                {summary?.hasAllRequiredConsents ? (
                  <Check className="h-6 w-6 text-green-400" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                )}
                <h2 className="text-lg font-semibold text-white">
                  {summary?.hasAllRequiredConsents ? 'All Required Consents Active' : 'Missing Required Consents'}
                </h2>
              </div>
              <p className="text-sm text-slate-300">
                {summary?.hasAllRequiredConsents
                  ? 'Your account is compliant with all required consents. You can use all platform features.'
                  : 'You are missing required consents. Some platform features may be restricted.'}
              </p>
            </div>

            {/* Required Consents */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-orange-400" />
                <h2 className="text-xl font-bold text-white">Required Consents</h2>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                These consents are required to use The Auto Doctor platform. You cannot withdraw these without deleting your account.
              </p>

              <div className="space-y-4">
                {requiredConsents.map((consentType) => {
                  const active = isConsentActive(consentType)
                  const date = getConsentDate(consentType)

                  return (
                    <div
                      key={consentType}
                      className={`rounded-lg border p-4 ${active ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {active ? (
                              <Check className="h-5 w-5 text-green-400" />
                            ) : (
                              <X className="h-5 w-5 text-red-400" />
                            )}
                            <h3 className="font-semibold text-white">{formatConsentType(consentType)}</h3>
                          </div>
                          <p className="text-sm text-slate-400 ml-7">{getConsentDescription(consentType)}</p>
                          {date && (
                            <div className="flex items-center gap-2 mt-2 ml-7">
                              <Clock className="h-4 w-4 text-slate-500" />
                              <p className="text-xs text-slate-500">
                                {active ? 'Granted' : 'Withdrawn'} on {new Date(date).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Optional Consents */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-blue-400" />
                <h2 className="text-xl font-bold text-white">Optional Consents</h2>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                You can enable or disable these at any time. Withdrawing these consents will not affect your ability to use the platform.
              </p>

              <div className="space-y-4">
                {optionalConsents.map((consentType) => {
                  const active = isConsentActive(consentType)
                  const date = getConsentDate(consentType)
                  const isWithdrawing = withdrawingConsent === consentType

                  return (
                    <div
                      key={consentType}
                      className="rounded-lg border border-slate-700 bg-slate-900/50 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {active ? (
                              <Check className="h-5 w-5 text-blue-400" />
                            ) : (
                              <X className="h-5 w-5 text-slate-500" />
                            )}
                            <h3 className="font-semibold text-white">{formatConsentType(consentType)}</h3>
                          </div>
                          <p className="text-sm text-slate-400 ml-7">{getConsentDescription(consentType)}</p>
                          {date && (
                            <div className="flex items-center gap-2 mt-2 ml-7">
                              <Clock className="h-4 w-4 text-slate-500" />
                              <p className="text-xs text-slate-500">
                                {active ? 'Granted' : 'Withdrawn'} on {new Date(date).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          {active ? (
                            <button
                              onClick={() => handleWithdrawConsent(consentType)}
                              disabled={isWithdrawing}
                              className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition disabled:opacity-50 text-sm font-medium"
                            >
                              {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleGrantConsent(consentType)}
                              className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition text-sm font-medium"
                            >
                              Grant Consent
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6">
              <h2 className="text-lg font-bold text-white mb-4">Privacy Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/customer/settings/privacy/download-data"
                  className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition group"
                >
                  <Download className="h-5 w-5 text-blue-400 group-hover:text-blue-300" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-200">Download My Data</p>
                    <p className="text-xs text-blue-400/70">PIPEDA: Right to Access</p>
                  </div>
                </Link>

                <Link
                  href="/customer/settings/privacy/delete-account"
                  className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition group"
                >
                  <Trash2 className="h-5 w-5 text-red-400 group-hover:text-red-300" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-200">Delete My Account</p>
                    <p className="text-xs text-red-400/70">PIPEDA: Right to Erasure</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Legal Information */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6">
              <h2 className="text-lg font-bold text-white mb-4">Legal Information</h2>
              <div className="space-y-3 text-sm">
                <Link href="/privacy-policy" className="block text-blue-400 hover:text-blue-300 transition">
                  → Privacy Policy
                </Link>
                <Link href="/terms" className="block text-blue-400 hover:text-blue-300 transition">
                  → Terms of Service
                </Link>
                <div className="pt-3 border-t border-slate-700">
                  <p className="text-xs text-slate-400">
                    Your privacy rights are protected under Canada's PIPEDA (Personal Information Protection and Electronic Documents Act).
                  </p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6">
              <h2 className="text-lg font-bold text-white mb-2">Questions?</h2>
              <p className="text-sm text-slate-400 mb-4">
                Contact our privacy team if you have questions about your data or consents.
              </p>
              <a
                href="mailto:privacy@theautodoctor.ca"
                className="text-sm text-orange-400 hover:text-orange-300 transition"
              >
                privacy@theautodoctor.ca
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
