/**
 * Earnings Breakdown Component
 * Shows mechanics their earnings potential by tier
 */

'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { SpecialistTierBadge, getTierPrice } from '@/components/SpecialistTierBadge'
import type { SpecialistTier } from '@/components/SpecialistTierBadge'

interface EarningsBreakdownProps {
  currentTier: SpecialistTier
  completedSessions: number
  totalEarnings: number
  className?: string
}

export function EarningsBreakdown({
  currentTier,
  completedSessions = 0,
  totalEarnings = 0,
  className = ''
}: EarningsBreakdownProps) {
  const [expanded, setExpanded] = useState(false)

  const sessionPrice = getTierPrice(currentTier) || 29.99
  const potentialMonthlyEarnings = sessionPrice * 20 // 20 sessions/month estimate
  const averagePerSession = completedSessions > 0 ? totalEarnings / completedSessions : 0

  // Calculate what they could earn at higher tiers
  const brandTierPrice = getTierPrice('brand')!
  const potentialIncrease = brandTierPrice - sessionPrice
  const monthlyIncrease = potentialIncrease * 20

  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-slate-900">Earnings Overview</h3>
          </div>
          <SpecialistTierBadge tier={currentTier} size="sm" />
        </div>
      </div>

      {/* Main Stats */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Total Earnings */}
          <div>
            <p className="text-xs text-slate-600 mb-1">Total Earnings</p>
            <p className="text-2xl font-bold text-slate-900">
              ${totalEarnings.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {completedSessions} sessions completed
            </p>
          </div>

          {/* Current Rate */}
          <div>
            <p className="text-xs text-slate-600 mb-1">Your Rate</p>
            <p className="text-2xl font-bold text-orange-600">
              ${sessionPrice.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">per session</p>
          </div>
        </div>

        {/* Average per session (if has completed sessions) */}
        {completedSessions > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Your average: ${averagePerSession.toFixed(2)} per session
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tier upgrade suggestion (if not brand specialist) */}
        {currentTier === 'general' && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 mb-1">
                  Increase Your Earnings
                </h4>
                <p className="text-sm text-orange-800 mb-2">
                  Become a Brand Specialist and earn <span className="font-bold">${potentialIncrease.toFixed(2)} more per session</span>
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-orange-600">
                    +${monthlyIncrease.toFixed(0)}
                  </span>
                  <span className="text-sm text-orange-700">/month potential</span>
                </div>
                <p className="text-xs text-orange-600 mt-2">
                  Based on 20 sessions per month
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expandable Details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <span className="text-sm font-medium text-slate-700">
            Earnings Breakdown & Projections
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4 pt-4 border-t border-slate-200">
            {/* Monthly Projections */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">
                Monthly Earnings Potential
              </h4>
              <div className="space-y-2">
                <ProjectionRow
                  sessions={10}
                  rate={sessionPrice}
                  label="Part-time (10 sessions)"
                />
                <ProjectionRow
                  sessions={20}
                  rate={sessionPrice}
                  label="Standard (20 sessions)"
                  highlighted
                />
                <ProjectionRow
                  sessions={40}
                  rate={sessionPrice}
                  label="Full-time (40 sessions)"
                />
              </div>
            </div>

            {/* Tier Comparison */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">
                Compare Tiers (20 sessions/month)
              </h4>
              <div className="space-y-2">
                <TierComparisonRow
                  tier="general"
                  sessions={20}
                  current={currentTier === 'general'}
                />
                <TierComparisonRow
                  tier="brand"
                  sessions={20}
                  current={currentTier === 'brand'}
                />
                <TierComparisonRow
                  tier="master"
                  sessions={20}
                  current={currentTier === 'master'}
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">How earnings work:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>You set your hourly rate + base session fee</li>
                    <li>Higher tiers command premium session fees</li>
                    <li>Payments processed weekly via Stripe</li>
                    <li>Platform fee: 15% per session</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper component for projection rows
function ProjectionRow({
  sessions,
  rate,
  label,
  highlighted = false
}: {
  sessions: number
  rate: number
  label: string
  highlighted?: boolean
}) {
  const total = sessions * rate
  const afterFees = total * 0.85 // 15% platform fee

  return (
    <div
      className={`flex items-center justify-between p-2 rounded ${
        highlighted ? 'bg-orange-50 border border-orange-200' : 'bg-slate-50'
      }`}
    >
      <div>
        <p className={`text-sm ${highlighted ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
          {label}
        </p>
        <p className="text-xs text-slate-500">{sessions} sessions × ${rate.toFixed(2)}</p>
      </div>
      <div className="text-right">
        <p className={`font-bold ${highlighted ? 'text-orange-600' : 'text-slate-900'}`}>
          ${afterFees.toFixed(2)}
        </p>
        <p className="text-xs text-slate-500">after fees</p>
      </div>
    </div>
  )
}

// Helper component for tier comparison
function TierComparisonRow({
  tier,
  sessions,
  current
}: {
  tier: SpecialistTier
  sessions: number
  current: boolean
}) {
  const rate = getTierPrice(tier) || 0
  const total = sessions * rate
  const afterFees = total * 0.85

  return (
    <div
      className={`flex items-center justify-between p-2 rounded ${
        current ? 'bg-orange-50 border border-orange-200' : 'bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-2">
        <SpecialistTierBadge tier={tier} size="sm" showIcon={true} showLabel={false} />
        <div>
          <p className={`text-sm ${current ? 'font-semibold' : ''}`}>
            {tier === 'general' && 'General Mechanic'}
            {tier === 'brand' && 'Brand Specialist'}
            {tier === 'master' && 'Master Technician'}
          </p>
          {current && <p className="text-xs text-orange-600">Your current tier</p>}
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-slate-900">
          ${tier === 'master' ? 'TBD' : afterFees.toFixed(2)}
        </p>
        <p className="text-xs text-slate-500">
          ${rate.toFixed(2)}/session
        </p>
      </div>
    </div>
  )
}

/**
 * Compact version for dashboard cards
 */
export function EarningsBreakdownCompact({
  currentTier,
  totalEarnings,
  className = ''
}: {
  currentTier: SpecialistTier
  totalEarnings: number
  className?: string
}) {
  const sessionPrice = getTierPrice(currentTier) || 29.99

  return (
    <div className={`bg-white rounded-lg border border-slate-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-orange-600" />
          <h4 className="font-semibold text-slate-900 text-sm">Earnings</h4>
        </div>
        <SpecialistTierBadge tier={currentTier} size="sm" />
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-xs text-slate-600">Total Earned</p>
          <p className="text-xl font-bold text-slate-900">${totalEarnings.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-600">Your Rate</p>
          <p className="text-lg font-semibold text-orange-600">${sessionPrice.toFixed(2)}/session</p>
        </div>
      </div>
    </div>
  )
}
