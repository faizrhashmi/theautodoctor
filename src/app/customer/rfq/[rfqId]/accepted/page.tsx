/**
 * Bid Acceptance Confirmation Page (Customer View)
 *
 * Confirms bid acceptance and shows next steps
 *
 * @route /customer/rfq/[rfqId]/accepted
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RfqGate } from '@/components/guards/FeatureGate'

interface AcceptedBidDetails {
  bid_id: string
  workshop_name: string
  workshop_city?: string
  quote_amount: number
  parts_cost?: number
  labor_cost?: number
  estimated_completion_days?: number
  workshop_rating?: number
}

export default function BidAcceptedPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const rfqId = params.rfqId as string
  const bidId = searchParams.get('bid_id')

  const [bidDetails, setBidDetails] = useState<AcceptedBidDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (bidId) {
      fetchBidDetails()
    }
  }, [bidId])

  async function fetchBidDetails() {
    try {
      const response = await fetch(`/api/rfq/${rfqId}/bids`)
      if (response.ok) {
        const data = await response.json()
        const acceptedBid = data.bids.find((b: any) => b.id === bidId && b.status === 'accepted')
        if (acceptedBid) {
          setBidDetails(acceptedBid)
        }
      }
    } catch (err) {
      console.error('Failed to fetch bid details:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <RfqGate fallback={<div className="p-8 text-center">RFQ marketplace is not available</div>}>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
              <svg
                className="w-12 h-12 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Bid Accepted Successfully!
            </h1>
            <p className="text-xl text-slate-400">
              The workshop has been notified and will contact you soon
            </p>
          </div>

          {/* Bid Summary */}
          {bidDetails && !loading && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Accepted Bid Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-slate-400">Workshop:</span>
                  <span className="font-semibold text-white text-right">
                    {bidDetails.workshop_name}
                    {bidDetails.workshop_city && (
                      <span className="block text-sm text-slate-400">{bidDetails.workshop_city}</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Quote:</span>
                  <span className="text-2xl font-bold text-green-400">
                    ${bidDetails.quote_amount.toLocaleString()}
                  </span>
                </div>
                {(bidDetails.parts_cost || bidDetails.labor_cost) && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Breakdown:</span>
                    <span className="text-slate-300">
                      {bidDetails.parts_cost && `Parts: $${bidDetails.parts_cost}`}
                      {bidDetails.parts_cost && bidDetails.labor_cost && ' | '}
                      {bidDetails.labor_cost && `Labor: $${bidDetails.labor_cost}`}
                    </span>
                  </div>
                )}
                {bidDetails.estimated_completion_days && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Estimated Completion:</span>
                    <span className="text-white">{bidDetails.estimated_completion_days} days</span>
                  </div>
                )}
                {bidDetails.workshop_rating && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Workshop Rating:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="text-white">{bidDetails.workshop_rating.toFixed(1)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* What Happens Next */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">What Happens Next?</h2>
            <ol className="space-y-4">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center font-bold mr-3 mt-0.5">
                  1
                </span>
                <div>
                  <h3 className="font-semibold mb-1">Workshop Contact</h3>
                  <p className="text-slate-400 text-sm">
                    The workshop will contact you within 24 hours to schedule your repair and confirm the details.
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center font-bold mr-3 mt-0.5">
                  2
                </span>
                <div>
                  <h3 className="font-semibold mb-1">Formal Quote</h3>
                  <p className="text-slate-400 text-sm">
                    The workshop will create a formal, detailed quote in their system with the OCPA-compliant breakdown.
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center font-bold mr-3 mt-0.5">
                  3
                </span>
                <div>
                  <h3 className="font-semibold mb-1">Schedule Repair</h3>
                  <p className="text-slate-400 text-sm">
                    Once you approve the formal quote, you'll schedule a convenient time to bring your vehicle in.
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center font-bold mr-3 mt-0.5">
                  4
                </span>
                <div>
                  <h3 className="font-semibold mb-1">Referral Fee</h3>
                  <p className="text-slate-400 text-sm">
                    Your mechanic will automatically earn a 5% referral fee when the repair is completed. No extra steps required!
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Important Notes */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <svg
                className="w-6 h-6 text-blue-400 mt-0.5 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  Important Notes
                </h3>
                <ul className="space-y-2 text-sm text-blue-300">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      All other bids on your RFQ have been automatically declined and those workshops have been notified.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      Your personal information (full address, phone) will now be shared with the selected workshop.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      If you don't hear from the workshop within 48 hours, please contact our support team.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={`/customer/rfq/${rfqId}`}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-center"
            >
              View RFQ Details
            </Link>
            <Link
              href="/customer/dashboard"
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 px-6 rounded-lg border border-slate-700 transition-colors text-center"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Support */}
          <div className="text-center mt-8 text-slate-400 text-sm">
            <p>
              Questions? Contact our support team at{' '}
              <a
                href="mailto:support@theautodoctor.ca"
                className="text-orange-500 hover:text-orange-400 underline"
              >
                support@theautodoctor.ca
              </a>
            </p>
          </div>
        </div>
      </div>
    </RfqGate>
  )
}
