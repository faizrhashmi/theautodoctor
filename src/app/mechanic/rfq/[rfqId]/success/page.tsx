/**
 * RFQ Creation Success Page
 *
 * Confirmation page shown after successful RFQ creation
 * Shows next steps and provides navigation options
 *
 * @route /mechanic/rfq/[rfqId]/success
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { RfqGate } from '@/components/guards/FeatureGate'

interface RfqDetails {
  id: string
  title: string
  max_bids: number
  bid_deadline: string
  max_distance_km?: number
  status: string
}

export default function RfqSuccessPage() {
  const router = useRouter()
  const params = useParams()
  const rfqId = params.rfqId as string

  const [rfqDetails, setRfqDetails] = useState<RfqDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRfqDetails() {
      try {
        const response = await fetch(`/api/rfq/${rfqId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch RFQ details')
        }

        const data = await response.json()
        setRfqDetails(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (rfqId) {
      fetchRfqDetails()
    }
  }, [rfqId])

  // Calculate hours until deadline
  const hoursUntilDeadline = rfqDetails?.bid_deadline
    ? Math.round((new Date(rfqDetails.bid_deadline).getTime() - Date.now()) / (1000 * 60 * 60))
    : null

  return (
    <RfqGate>
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
                aria-hidden="true"
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
              RFQ Posted Successfully!
            </h1>
            <p className="text-xl text-slate-400">
              Your request is now live in the marketplace
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="text-slate-400 mt-4">Loading RFQ details...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 mb-6">
              <div className="flex items-start">
                <svg
                  className="w-6 h-6 text-red-500 mt-0.5 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-red-500 mb-1">
                    Error Loading Details
                  </h3>
                  <p className="text-red-400">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* RFQ Details */}
          {rfqDetails && (
            <>
              {/* Summary Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">RFQ Summary</h2>

                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400">Request:</span>
                    <span className="font-medium text-right max-w-md">
                      {rfqDetails.title}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Max Workshops:</span>
                    <span className="font-medium">{rfqDetails.max_bids} workshops</span>
                  </div>

                  {hoursUntilDeadline !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Bidding Window:</span>
                      <span className="font-medium">{hoursUntilDeadline} hours</span>
                    </div>
                  )}

                  {rfqDetails.max_distance_km && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Search Radius:</span>
                      <span className="font-medium">{rfqDetails.max_distance_km} km</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Status:</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                      {rfqDetails.status === 'open' ? 'Active' : rfqDetails.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* What Happens Next */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">What Happens Next?</h2>

                <ol className="space-y-4">
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-8 h-8 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center font-bold mr-3 mt-0.5">
                      1
                    </span>
                    <div>
                      <h3 className="font-semibold mb-1">
                        Workshops Review Your Request
                      </h3>
                      <p className="text-slate-400 text-sm">
                        Qualified workshops in your area will see your RFQ and can submit competitive bids with detailed quotes.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-8 h-8 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center font-bold mr-3 mt-0.5">
                      2
                    </span>
                    <div>
                      <h3 className="font-semibold mb-1">
                        You'll Receive Notifications
                      </h3>
                      <p className="text-slate-400 text-sm">
                        We'll notify you via email and SMS when workshops submit bids. You can track all bids in real-time.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-8 h-8 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center font-bold mr-3 mt-0.5">
                      3
                    </span>
                    <div>
                      <h3 className="font-semibold mb-1">
                        Compare and Choose
                      </h3>
                      <p className="text-slate-400 text-sm">
                        Review all bids side-by-side, compare prices and services, and select the workshop that best meets your needs.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-8 h-8 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center font-bold mr-3 mt-0.5">
                      4
                    </span>
                    <div>
                      <h3 className="font-semibold mb-1">
                        Earn Your Referral Fee
                      </h3>
                      <p className="text-slate-400 text-sm">
                        When your customer accepts a bid, you'll automatically earn a 5% referral fee. No extra steps required!
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
                    aria-hidden="true"
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
                          Your RFQ will automatically close after {hoursUntilDeadline} hours or when {rfqDetails.max_bids} bids are received, whichever comes first.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>
                          Your customer's personal information is protected. Workshops only see city and province until a bid is accepted.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>
                          All bids comply with Ontario Consumer Protection Act (OCPA) requirements with detailed service breakdowns.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={`/mechanic/rfq/${rfqId}`}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-center focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              View My RFQ
            </Link>

            <Link
              href="/mechanic/dashboard"
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 px-6 rounded-lg border border-slate-700 transition-colors text-center focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Footer Help Text */}
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
