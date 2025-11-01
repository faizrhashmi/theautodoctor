'use client'

/**
 * Workshop Revenue Settings Page
 * Configure revenue split between workshop and mechanics
 */

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  DollarSign,
  AlertCircle,
  CheckCircle,
  Info,
  TrendingUp,
  Users,
  Percent
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WORKSHOP_PRICING, isValidCommissionRate } from '@/config/workshopPricing'

interface Workshop {
  id: string
  name: string
  business_name: string | null
  revenue_share_percentage: number
  status: string
}

export default function RevenueSettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [revenueShare, setRevenueShare] = useState(WORKSHOP_PRICING.DEFAULT_COMMISSION_RATE)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchWorkshop = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      // Get workshop from organization_members
      const { data: membership, error: memberError } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          organizations (
            id,
            name,
            commission_rate,
            platform_fee_percentage,
            status,
            organization_type
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (memberError || !membership) {
        setError('Workshop profile not found')
        return
      }

      const org = membership.organizations as any
      if (!org || org.organization_type !== 'workshop') {
        setError('Not a workshop account')
        return
      }

      // Map organization to workshop format
      const workshopData = {
        id: org.id,
        name: org.name,
        business_name: org.name,
        revenue_share_percentage: org.platform_fee_percentage || 15,
        status: org.status
      }

      setWorkshop(workshopData)
      setRevenueShare(workshopData.revenue_share_percentage || WORKSHOP_PRICING.DEFAULT_COMMISSION_RATE)
    } catch (err: any) {
      console.error('Error fetching workshop:', err)
      setError(err.message || 'Failed to load workshop data')
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    fetchWorkshop()
  }, [fetchWorkshop])

  const handleSave = async () => {
    if (!workshop) return

    // Validate using centralized validation
    if (!isValidCommissionRate(revenueShare)) {
      setError(
        `Revenue share must be between ${WORKSHOP_PRICING.MIN_COMMISSION_RATE}% and ${WORKSHOP_PRICING.MAX_COMMISSION_RATE}%`
      )
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          platform_fee_percentage: revenueShare,
          updated_at: new Date().toISOString()
        })
        .eq('id', workshop.id)

      if (updateError) {
        throw updateError
      }

      setSuccess('Revenue share updated successfully!')
      setTimeout(() => setSuccess(null), 3000)

      // Refresh workshop data
      await fetchWorkshop()
    } catch (err: any) {
      console.error('Error updating revenue share:', err)
      setError(err.message || 'Failed to update revenue share')
    } finally {
      setSaving(false)
    }
  }

  // Calculate example earnings
  const exampleSessionPrice = 100
  const workshopEarnings = (exampleSessionPrice * revenueShare) / 100
  const mechanicEarnings = exampleSessionPrice - workshopEarnings

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (error && !workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 max-w-md">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="font-semibold text-red-900">Error Loading Settings</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/workshop/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Revenue Settings</h1>
              <p className="text-sm text-gray-600 mt-1">
                Configure your revenue split with mechanics
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">About Revenue Sharing</h3>
              <p className="text-sm text-blue-800 mt-1">
                Your workshop receives a percentage of each session completed by your
                mechanics. The remaining amount goes to the mechanic who performed the
                service. Standard range is 10-30%.
              </p>
            </div>
          </div>
        </div>

        {/* Revenue Split Configuration */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Workshop Revenue Share
          </h2>

          <div className="space-y-6">
            {/* Current Setting */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Your Share Percentage
                </label>
                <span className="text-2xl font-bold text-green-600">
                  {revenueShare}%
                </span>
              </div>

              {/* Slider */}
              <div className="relative">
                <input
                  type="range"
                  min={WORKSHOP_PRICING.MIN_COMMISSION_RATE}
                  max={WORKSHOP_PRICING.MAX_COMMISSION_RATE}
                  step="1"
                  value={revenueShare}
                  onChange={(e) => setRevenueShare(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{WORKSHOP_PRICING.MIN_COMMISSION_RATE}%</span>
                  <span>{Math.floor(WORKSHOP_PRICING.MAX_COMMISSION_RATE / 2)}%</span>
                  <span>{WORKSHOP_PRICING.MAX_COMMISSION_RATE}%</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Recommended: {WORKSHOP_PRICING.DEFAULT_COMMISSION_RATE}-25% • Maximum: {WORKSHOP_PRICING.MAX_COMMISSION_RATE}%
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving || revenueShare === workshop?.revenue_share_percentage}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Example Calculations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Per Session Example */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-4">
              <Percent className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Per Session Example</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              For a ${exampleSessionPrice} session:
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Workshop Share ({revenueShare}%)</span>
                <span className="font-semibold text-green-600">
                  ${workshopEarnings.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Mechanic Share ({100 - revenueShare}%)</span>
                <span className="font-semibold text-gray-600">
                  ${mechanicEarnings.toFixed(2)}
                </span>
              </div>
              <div className="pt-3 border-t">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${revenueShare}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Your share: {revenueShare}%
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Projections */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Monthly Projections</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Based on 50 sessions/month @ $100 avg:
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Revenue</span>
                <span className="font-semibold text-gray-900">$5,000</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Your Monthly Share</span>
                <span className="font-semibold text-green-600">
                  ${((5000 * revenueShare) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Mechanics Share</span>
                <span className="font-semibold text-gray-600">
                  ${(5000 - (5000 * revenueShare) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900">Best Practices</h3>
          </div>
          <ul className="space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Industry Standard:</strong> Most workshops charge 15-25% revenue
                share
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Competitive Rate:</strong> Lower percentages attract more mechanics
                to your workshop
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Fair Split:</strong> Ensure mechanics earn enough to stay motivated
                and deliver quality service
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> Changes take effect immediately for new sessions
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
