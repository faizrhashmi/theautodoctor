'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Video, Wrench, Building2, CheckCircle, ArrowRight, Info } from 'lucide-react'

export default function ServiceTierSelectionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)  // ✅ Auth guard
  const [isAuthenticated, setIsAuthenticated] = useState(false)  // ✅ Auth guard
  const [currentTier, setCurrentTier] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ✅ Auth guard
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/mechanics/me')
        if (!response.ok) {
          router.replace('/mechanic/login')
          return
        }
        setIsAuthenticated(true)
        setAuthChecking(false)
      } catch (err) {
        console.error('Auth check failed:', err)
        router.replace('/mechanic/login')
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!isAuthenticated) return  // ✅ Wait for auth
    // Check current service tier
    fetch('/api/mechanics/onboarding/service-tier')
      .then(res => res.json())
      .then(data => {
        if (data.service_tier) {
          setCurrentTier(data.service_tier)
        }
      })
      .catch(err => {
        console.error('Failed to fetch service tier:', err)
      })
  }, [isAuthenticated])

  const handleSelectTier = async (tier: 'virtual_only' | 'workshop_partner') => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/mechanics/onboarding/service-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_tier: tier })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set service tier')
      }

      // Redirect to next step
      router.push(data.redirect_url)

    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Choose Your Service Level
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Select how you want to serve customers on The Auto Doctor platform
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-3xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Service Tier Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          {/* Virtual Only Card */}
          <div className={`relative bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl hover:scale-105 ${
            currentTier === 'virtual_only' ? 'border-green-500 ring-4 ring-green-100' : 'border-slate-700 hover:border-blue-300'
          }`}>
            {currentTier === 'virtual_only' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-4 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  Current Selection
                </span>
              </div>
            )}

            <div className="p-8">
              {/* Icon */}
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 mx-auto">
                <div className="flex gap-1">
                  <MessageCircle className="w-6 h-6 text-white" />
                  <Video className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white text-center mb-3">
                Virtual Consultations Only
              </h2>
              <p className="text-slate-400 text-center mb-6">
                Provide expert advice via chat and video. No physical work.
              </p>

              {/* Earnings Badge */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4 mb-6">
                <div className="text-sm font-semibold text-green-800 text-center mb-1">
                  Start Earning Today
                </div>
                <div className="text-3xl font-bold text-green-900 text-center">
                  $12.75 - $29.75
                </div>
                <div className="text-sm text-green-700 text-center">
                  per consultation
                </div>
              </div>

              {/* Benefits */}
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">No workshop required</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">Start immediately after verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">Work from anywhere</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">Flexible hours - your schedule</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">Perfect for retired mechanics</span>
                </li>
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSelectTier('virtual_only')}
                disabled={loading || currentTier === 'virtual_only'}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                  loading || currentTier === 'virtual_only'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? (
                  <span>Processing...</span>
                ) : currentTier === 'virtual_only' ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Selected</span>
                  </>
                ) : (
                  <>
                    <span>Choose Virtual Only</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Workshop Partner Card */}
          <div className={`relative bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl hover:scale-105 ${
            currentTier === 'workshop_partner' ? 'border-blue-500 ring-4 ring-blue-100' : 'border-slate-700 hover:border-blue-300'
          }`}>
            {/* Recommended Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="inline-flex items-center px-4 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-full shadow-lg">
                ⭐ RECOMMENDED
              </span>
            </div>

            {currentTier === 'workshop_partner' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-4 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  Current Selection
                </span>
              </div>
            )}

            <div className="p-8 pt-12">
              {/* Icon */}
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl mb-6 mx-auto">
                <div className="flex gap-1">
                  <Building2 className="w-6 h-6 text-white" />
                  <Wrench className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white text-center mb-3">
                Workshop-Affiliated
              </h2>
              <p className="text-slate-400 text-center mb-6">
                Offer consultations AND physical repairs at a licensed workshop.
              </p>

              {/* Earnings Badge */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="text-sm font-semibold text-blue-800 text-center mb-1">
                  Higher Earnings
                </div>
                <div className="text-3xl font-bold text-blue-900 text-center">
                  $500 - $2,000+
                </div>
                <div className="text-sm text-blue-700 text-center">
                  per week potential
                </div>
              </div>

              {/* Benefits */}
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">Virtual consultations + physical repairs</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">Full-service offering</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">Professional workshop facility</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">Fully insured and compliant</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">Build long-term client base</span>
                </li>
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleSelectTier('workshop_partner')}
                disabled={loading || currentTier === 'workshop_partner'}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                  loading || currentTier === 'workshop_partner'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? (
                  <span>Processing...</span>
                ) : currentTier === 'workshop_partner' ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Selected</span>
                  </>
                ) : (
                  <>
                    <span>Choose Workshop-Affiliated</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Help Text */}
              <div className="mt-4 text-center">
                <a
                  href="/mechanic/partnerships/browse"
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Need help finding a workshop partner?
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Compliance Notice */}
        <div className="max-w-3xl mx-auto bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-900 mb-2">
                Legal Compliance Requirement
              </p>
              <p className="text-sm text-yellow-800">
                Canadian municipal regulations require all physical automotive repairs to be
                performed at properly licensed and insured workshop facilities. Virtual consultations
                can be provided from anywhere.
              </p>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="max-w-4xl mx-auto mt-12">
          <h3 className="text-2xl font-bold text-white text-center mb-6">
            Quick Comparison
          </h3>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-b border-slate-700">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white">Virtual Only</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white">Workshop-Affiliated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-sm text-slate-300">Workshop required</td>
                  <td className="px-6 py-4 text-center">❌</td>
                  <td className="px-6 py-4 text-center">✅</td>
                </tr>
                <tr className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
                  <td className="px-6 py-4 text-sm text-slate-300">Virtual consultations</td>
                  <td className="px-6 py-4 text-center">✅</td>
                  <td className="px-6 py-4 text-center">✅</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-slate-300">Physical repairs</td>
                  <td className="px-6 py-4 text-center">❌</td>
                  <td className="px-6 py-4 text-center">✅</td>
                </tr>
                <tr className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
                  <td className="px-6 py-4 text-sm text-slate-300">Start time</td>
                  <td className="px-6 py-4 text-center text-sm text-slate-300">24 hours</td>
                  <td className="px-6 py-4 text-center text-sm text-slate-300">2-3 days</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-slate-300">Average weekly earnings</td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-green-600">$500-$1,200</td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-blue-600">$1,500-$3,000+</td>
                </tr>
                <tr className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
                  <td className="px-6 py-4 text-sm text-slate-300">Work location</td>
                  <td className="px-6 py-4 text-center text-sm text-slate-300">Anywhere</td>
                  <td className="px-6 py-4 text-center text-sm text-slate-300">Workshop facility</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-slate-300">Can upgrade later</td>
                  <td className="px-6 py-4 text-center">✅</td>
                  <td className="px-6 py-4 text-center">N/A</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
