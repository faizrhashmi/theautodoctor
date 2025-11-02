/**
 * RFQ Detail + Bid Submission Page (Workshop View)
 *
 * Shows full RFQ details and allows workshop to submit a bid
 *
 * @route /workshop/rfq/marketplace/[rfqId]
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { RfqGate } from '@/components/guards/FeatureGate'
import type { SubmitBidInput } from '@/lib/rfq/bidValidation'

interface RfqDetail {
  id: string
  title: string
  description: string
  issue_category: string
  urgency: string
  vehicle_make: string
  vehicle_model: string
  vehicle_year: number
  vehicle_mileage: number
  vehicle_vin?: string
  budget_min?: number
  budget_max?: number
  bid_deadline: string
  max_bids: number
  bid_count: number
  customer_city?: string
  customer_province?: string
  diagnosis_summary?: string
  recommended_services?: string
  hours_remaining: number
  is_expiring_soon: boolean
  bids_remaining: number
  can_bid: boolean
  has_existing_bid: boolean
  existing_bid?: {
    id: string
    quote_amount: number
    status: string
  }
  metadata?: {
    photos?: string[]
    videos?: string[]
  }
}

export default function RfqDetailPage() {
  const router = useRouter()
  const params = useParams()
  const rfqId = params.rfqId as string

  const [rfq, setRfq] = useState<RfqDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBidForm, setShowBidForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [bidData, setBidData] = useState<Partial<SubmitBidInput>>({
    quote_amount: undefined,
    parts_cost: undefined,
    labor_cost: undefined,
    description: '',
    estimated_completion_days: undefined,
    parts_warranty_months: 12,
    labor_warranty_months: 12,
    can_provide_loaner_vehicle: false,
    can_provide_pickup_dropoff: false,
  })

  useEffect(() => {
    fetchRfqDetails()
  }, [rfqId])

  async function fetchRfqDetails() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/rfq/marketplace/${rfqId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch RFQ details')
      }

      const data = await response.json()
      setRfq(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RFQ')
    } finally {
      setLoading(false)
    }
  }

  const updateBidField = <K extends keyof SubmitBidInput>(key: K, value: SubmitBidInput[K]) => {
    setBidData(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmitBid() {
    if (!rfq) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      // Validate required fields
      if (!bidData.quote_amount || bidData.quote_amount <= 0) {
        throw new Error('Quote amount is required')
      }
      if (!bidData.description || bidData.description.length < 50) {
        throw new Error('Bid description must be at least 50 characters')
      }
      if (!bidData.parts_cost && !bidData.labor_cost) {
        throw new Error('OCPA compliance: You must provide at least parts cost or labor cost breakdown')
      }

      const response = await fetch('/api/rfq/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bidData,
          rfq_marketplace_id: rfqId,
          workshop_id: 'AUTO', // Will be filled by server from workshop_role
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit bid')
      }

      const result = await response.json()
      router.push(`/workshop/rfq/my-bids?success=true&bid_id=${result.bid_id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit bid')
    } finally {
      setSubmitting(false)
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'normal': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'low': return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  return (
    <RfqGate fallback={<div className="p-8 text-center">RFQ marketplace is not available</div>}>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Back Button */}
          <Link
            href="/workshop/rfq/marketplace"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Marketplace
          </Link>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* RFQ Details */}
          {!loading && !error && rfq && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">{rfq.title}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                      <span>{rfq.vehicle_year} {rfq.vehicle_make} {rfq.vehicle_model}</span>
                      <span>•</span>
                      <span>{rfq.vehicle_mileage.toLocaleString()} km</span>
                      <span>•</span>
                      <span>{rfq.customer_city}, {rfq.customer_province}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getUrgencyColor(rfq.urgency)}`}>
                    {rfq.urgency}
                  </span>
                </div>

                {/* Time & Bids Status */}
                <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <svg className={`w-5 h-5 ${rfq.is_expiring_soon ? 'text-orange-500' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={rfq.is_expiring_soon ? 'text-orange-500 font-semibold' : 'text-white'}>
                      {rfq.hours_remaining}h remaining
                    </span>
                  </div>
                  <div className="text-white">
                    Bids: {rfq.bid_count} / {rfq.max_bids}
                  </div>
                  {rfq.budget_min || rfq.budget_max ? (
                    <div className="text-white">
                      Budget: ${rfq.budget_min || 0} - ${rfq.budget_max || 'Any'}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Description */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-3">Issue Description</h2>
                <p className="text-slate-300 whitespace-pre-wrap">{rfq.description}</p>
              </div>

              {/* Diagnosis */}
              {rfq.diagnosis_summary && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-3">Mechanic's Diagnosis</h2>
                  <p className="text-slate-300 whitespace-pre-wrap">{rfq.diagnosis_summary}</p>
                  {rfq.recommended_services && (
                    <div className="mt-4">
                      <h3 className="font-semibold text-slate-400 mb-2">Recommended Services:</h3>
                      <p className="text-slate-300">{rfq.recommended_services}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Existing Bid Notice */}
              {rfq.has_existing_bid && rfq.existing_bid && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-400 mb-2">You've Already Submitted a Bid</h3>
                  <p className="text-blue-200 mb-3">
                    Your bid of ${rfq.existing_bid.quote_amount.toLocaleString()} is {rfq.existing_bid.status}.
                  </p>
                  <Link
                    href="/workshop/rfq/my-bids"
                    className="text-orange-500 hover:text-orange-400 underline"
                  >
                    View My Bids →
                  </Link>
                </div>
              )}

              {/* Submit Bid Section */}
              {rfq.can_bid && !rfq.has_existing_bid && (
                <>
                  {!showBidForm ? (
                    <button
                      onClick={() => setShowBidForm(true)}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-lg transition-all shadow-lg hover:shadow-xl"
                    >
                      Submit Bid on This RFQ
                    </button>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                      <h2 className="text-xl font-bold mb-6">Submit Your Bid</h2>

                      <div className="space-y-6">
                        {/* Quote Amount */}
                        <div>
                          <label htmlFor="quote_amount" className="block text-sm font-medium text-slate-300 mb-2">
                            Total Quote Amount *
                          </label>
                          <input
                            id="quote_amount"
                            type="number"
                            value={bidData.quote_amount || ''}
                            onChange={(e) => updateBidField('quote_amount', parseFloat(e.target.value))}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                            placeholder="0.00"
                            required
                          />
                        </div>

                        {/* OCPA Breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="parts_cost" className="block text-sm font-medium text-slate-300 mb-2">
                              Parts Cost * (OCPA)
                            </label>
                            <input
                              id="parts_cost"
                              type="number"
                              value={bidData.parts_cost || ''}
                              onChange={(e) => updateBidField('parts_cost', parseFloat(e.target.value))}
                              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label htmlFor="labor_cost" className="block text-sm font-medium text-slate-300 mb-2">
                              Labor Cost * (OCPA)
                            </label>
                            <input
                              id="labor_cost"
                              type="number"
                              value={bidData.labor_cost || ''}
                              onChange={(e) => updateBidField('labor_cost', parseFloat(e.target.value))}
                              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                            Bid Description * (min 50 chars)
                          </label>
                          <textarea
                            id="description"
                            value={bidData.description}
                            onChange={(e) => updateBidField('description', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 min-h-[120px]"
                            placeholder="Describe your proposed repair plan, parts needed, and why your workshop is the best choice..."
                            required
                          />
                          <p className="text-sm text-slate-500 mt-1">{bidData.description?.length || 0} / 50 minimum</p>
                        </div>

                        {/* Completion Time */}
                        <div>
                          <label htmlFor="estimated_completion_days" className="block text-sm font-medium text-slate-300 mb-2">
                            Estimated Completion (days)
                          </label>
                          <input
                            id="estimated_completion_days"
                            type="number"
                            value={bidData.estimated_completion_days || ''}
                            onChange={(e) => updateBidField('estimated_completion_days', parseInt(e.target.value))}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                            placeholder="3"
                          />
                        </div>

                        {/* Warranty */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="parts_warranty_months" className="block text-sm font-medium text-slate-300 mb-2">
                              Parts Warranty (months)
                            </label>
                            <input
                              id="parts_warranty_months"
                              type="number"
                              value={bidData.parts_warranty_months || ''}
                              onChange={(e) => updateBidField('parts_warranty_months', parseInt(e.target.value))}
                              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label htmlFor="labor_warranty_months" className="block text-sm font-medium text-slate-300 mb-2">
                              Labor Warranty (months)
                            </label>
                            <input
                              id="labor_warranty_months"
                              type="number"
                              value={bidData.labor_warranty_months || ''}
                              onChange={(e) => updateBidField('labor_warranty_months', parseInt(e.target.value))}
                              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>

                        {/* Additional Services */}
                        <div className="space-y-3">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={bidData.can_provide_loaner_vehicle}
                              onChange={(e) => updateBidField('can_provide_loaner_vehicle', e.target.checked)}
                              className="w-5 h-5 bg-slate-800 border-2 border-slate-700 rounded checked:bg-orange-500"
                            />
                            <span className="ml-3 text-slate-300">Can provide loaner vehicle</span>
                          </label>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={bidData.can_provide_pickup_dropoff}
                              onChange={(e) => updateBidField('can_provide_pickup_dropoff', e.target.checked)}
                              className="w-5 h-5 bg-slate-800 border-2 border-slate-700 rounded checked:bg-orange-500"
                            />
                            <span className="ml-3 text-slate-300">Can provide pickup/dropoff</span>
                          </label>
                        </div>

                        {/* Error */}
                        {submitError && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <p className="text-red-400">{submitError}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => setShowBidForm(false)}
                            disabled={submitting}
                            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSubmitBid}
                            disabled={submitting}
                            className="flex-1 px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                          >
                            {submitting ? 'Submitting...' : 'Submit Bid'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Cannot Bid */}
              {!rfq.can_bid && !rfq.has_existing_bid && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
                  <p className="text-slate-400">
                    {rfq.hours_remaining === 0
                      ? 'This RFQ has expired'
                      : 'This RFQ is no longer accepting bids (max bids reached)'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </RfqGate>
  )
}
