'use client'

import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface Referral {
  id: string
  bid_amount: number
  commission_amount: number
  referral_rate: number
  status: string
  earned_at: string
  paid_at: string | null
  rfq: {
    title: string
    vehicle_make: string
    vehicle_model: string
    vehicle_year: number
  } | null
  workshop: {
    name: string
    city: string
    state_province: string
  } | null
}

interface Summary {
  total_referrals: number
  pending_referrals: number
  paid_referrals: number
  total_earned: number
  pending_earnings: number
  paid_earnings: number
  avg_commission: number
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReferrals()
  }, [])

  async function fetchReferrals() {
    try {
      const response = await fetch('/api/mechanic/referrals')
      if (response.ok) {
        const data = await response.json()
        setReferrals(data.referrals || [])
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Failed to fetch referrals:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading referral earnings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Referral Commissions</h1>
          <p className="text-slate-400">
            Track your 2% referral earnings from RFQs you helped customers create
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <p className="text-sm text-slate-400">Total Earned</p>
              </div>
              <p className="text-2xl font-bold text-white">${summary.total_earned.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">{summary.total_referrals} referrals</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-5 w-5 text-blue-400" />
                <p className="text-sm text-slate-400">Paid Out</p>
              </div>
              <p className="text-2xl font-bold text-white">${summary.paid_earnings.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">{summary.paid_referrals} payments</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-orange-400" />
                <p className="text-sm text-slate-400">Pending</p>
              </div>
              <p className="text-2xl font-bold text-white">${summary.pending_earnings.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">{summary.pending_referrals} pending</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="h-5 w-5 text-purple-400" />
                <p className="text-sm text-slate-400">Avg Commission</p>
              </div>
              <p className="text-2xl font-bold text-white">${summary.avg_commission.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">per referral</p>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">How Referrals Work</p>
              <p className="text-blue-300 text-sm">
                When you help a customer create an RFQ and they accept a workshop bid, you earn 2% of the bid amount.
                This commission is deducted from the platform fee, not from the customer's price.
              </p>
            </div>
          </div>
        </div>

        {/* Referrals List */}
        {referrals.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
            <DollarSign className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No referrals yet</p>
            <p className="text-sm text-slate-500">
              Help customers create RFQs after diagnostic sessions to start earning referral commissions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {referrals.map((referral) => (
              <div
                key={referral.id}
                className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {referral.rfq?.title || 'Repair Request'}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      {referral.rfq && (
                        <span>
                          {referral.rfq.vehicle_year} {referral.rfq.vehicle_make} {referral.rfq.vehicle_model}
                        </span>
                      )}
                      {referral.workshop && (
                        <span>→ {referral.workshop.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">
                      ${referral.commission_amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(referral.referral_rate * 100).toFixed(1)}% of ${referral.bid_amount.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-400">
                      Earned {new Date(referral.earned_at).toLocaleDateString()}
                    </span>
                    {referral.workshop && (
                      <span className="text-slate-500">
                        {referral.workshop.city}, {referral.workshop.state_province}
                      </span>
                    )}
                  </div>
                  <div>
                    {referral.status === 'paid' ? (
                      <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium">
                        ✓ Paid {referral.paid_at ? new Date(referral.paid_at).toLocaleDateString() : ''}
                      </span>
                    ) : referral.status === 'pending' ? (
                      <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-sm font-medium">
                        ⏳ Pending
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-500/20 text-slate-300 rounded-full text-sm font-medium">
                        {referral.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
