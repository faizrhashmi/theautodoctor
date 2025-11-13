'use client'

/**
 * Diagnostic Credit Banner Component
 * Displays customer's available diagnostic credit when viewing a mechanic profile
 *
 * Features:
 * - Shows credit amount and expiration countdown
 * - Only visible for same mechanic who issued credit
 * - Prominent call-to-action to book in-person follow-up
 * - Auto-hides when credit expires or is used
 * - Mobile-first, dark theme design
 */

import { useState, useEffect } from 'react'
import {
  Gift,
  Clock,
  AlertCircle,
  Wrench,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import type { DiagnosticCreditInfo } from '@/types/diagnostic-credit'
import { formatHoursRemaining, isCreditValid } from '@/types/diagnostic-credit'

interface DiagnosticCreditBannerProps {
  customerId: string
  mechanicId: string
  onBookNow?: () => void
}

export function DiagnosticCreditBanner({
  customerId,
  mechanicId,
  onBookNow,
}: DiagnosticCreditBannerProps) {
  const [loading, setLoading] = useState(true)
  const [credit, setCredit] = useState<DiagnosticCreditInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch credit info
  useEffect(() => {
    fetchCredit()

    // Refresh every minute to update countdown
    const interval = setInterval(() => {
      fetchCredit()
    }, 60000)

    return () => clearInterval(interval)
  }, [customerId, mechanicId])

  const fetchCredit = async () => {
    try {
      setError(null)

      const response = await fetch(
        `/api/customers/${customerId}/diagnostic-credit/${mechanicId}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch credit info')
      }

      const data = await response.json()

      if (data.has_credit && data.credit_info) {
        setCredit(data.credit_info)
      } else {
        setCredit(null)
      }
    } catch (err: any) {
      console.error('Error fetching credit:', err)
      setError(err.message)
      setCredit(null)
    } finally {
      setLoading(false)
    }
  }

  // Don't show anything while loading
  if (loading) {
    return null
  }

  // Don't show if no credit or credit is invalid
  if (!credit || !isCreditValid(credit)) {
    return null
  }

  // Don't show if expired
  if (credit.hours_remaining !== undefined && credit.hours_remaining <= 0) {
    return null
  }

  const isUrgent = credit.hours_remaining !== undefined && credit.hours_remaining < 6

  return (
    <div className="mb-6">
      <div
        className={`rounded-xl border ${
          isUrgent
            ? 'bg-gradient-to-br from-orange-950/40 to-red-950/40 border-orange-800/50'
            : 'bg-gradient-to-br from-green-950/40 to-emerald-950/40 border-green-800/50'
        } p-6 shadow-xl`}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`p-3 rounded-xl ${
              isUrgent
                ? 'bg-orange-600/20'
                : 'bg-green-600/20'
            }`}
          >
            <Gift
              className={`w-6 h-6 ${
                isUrgent ? 'text-orange-400' : 'text-green-400'
              }`}
            />
          </div>
          <div className="flex-1">
            <h3
              className={`font-bold text-lg ${
                isUrgent ? 'text-orange-300' : 'text-green-300'
              }`}
            >
              You Have ${credit.credit_amount?.toFixed(0)} Credit!
            </h3>
            <p className="text-sm text-gray-300 mt-1">
              From your previous {credit.session_type} diagnostic session with this mechanic
            </p>
          </div>
        </div>

        {/* Credit Details */}
        <div className="bg-black/20 rounded-lg p-4 mb-4 space-y-3">
          {/* Credit Amount */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Credit Available:</span>
            <span className="text-xl font-bold text-white">
              ${credit.credit_amount?.toFixed(2)}
            </span>
          </div>

          {/* Expiration */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {isUrgent ? 'Expires Soon:' : 'Valid For:'}
            </span>
            <span
              className={`text-sm font-semibold ${
                isUrgent ? 'text-orange-400' : 'text-green-400'
              }`}
            >
              {credit.hours_remaining !== undefined
                ? formatHoursRemaining(credit.hours_remaining)
                : 'Unknown'}
            </span>
          </div>
        </div>

        {/* Urgency Warning */}
        {isUrgent && (
          <div className="bg-orange-950/30 border border-orange-800/50 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-orange-300">Hurry! Credit expires soon</p>
                <p className="text-orange-200/80 mt-1">
                  Book your in-person diagnostic now to use your credit before it expires.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-white/5 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-gray-300 mb-2">How it works:</p>
          <ul className="text-sm text-gray-400 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">•</span>
              <span>Your credit applies to any in-person diagnostic with this mechanic</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">•</span>
              <span>
                If in-person costs more, you only pay the difference
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">•</span>
              <span>
                If in-person costs the same or less, it's FREE!
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">•</span>
              <span>Credit is valid for 48 hours from your last session</span>
            </li>
          </ul>
        </div>

        {/* CTA Button */}
        <button
          onClick={onBookNow}
          className={`w-full font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all ${
            isUrgent
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <Wrench className="w-5 h-5" />
          Book In-Person Diagnostic Now
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Fine Print */}
        <p className="text-xs text-gray-500 text-center mt-3">
          Credit can only be used once and cannot be transferred to another mechanic
        </p>
      </div>
    </div>
  )
}

/**
 * Compact Version - Shows minimal info in a smaller space
 */
interface DiagnosticCreditBadgeProps {
  creditAmount: number
  hoursRemaining: number
}

export function DiagnosticCreditBadge({
  creditAmount,
  hoursRemaining,
}: DiagnosticCreditBadgeProps) {
  const isUrgent = hoursRemaining < 6

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${
        isUrgent
          ? 'bg-orange-600/20 text-orange-400 border border-orange-800/50'
          : 'bg-green-600/20 text-green-400 border border-green-800/50'
      }`}
    >
      <Gift className="w-4 h-4" />
      <span>${creditAmount.toFixed(0)} Credit</span>
      <span className="text-xs opacity-75">
        • {formatHoursRemaining(hoursRemaining)} left
      </span>
    </div>
  )
}
