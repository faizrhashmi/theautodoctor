'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthGuard } from '@/lib/auth/guards'
import {
  DollarSign,
  Clock,
  Shield,
  Star,
  MapPin,
  Calendar,
  Car,
  CheckCircle2,
  TrendingUp,
  Award,
  ArrowLeft,
  AlertCircle
} from 'lucide-react'

interface RFQBid {
  id: string
  rfq_marketplace_id: string
  workshop_id: string
  workshop_name: string
  workshop_city: string | null
  workshop_rating: number | null
  workshop_review_count: number | null
  workshop_certifications: string[] | null
  workshop_years_in_business: number | null

  quote_amount: number
  parts_cost: number
  labor_cost: number
  shop_supplies_fee: number | null
  environmental_fee: number | null
  tax_amount: number | null

  estimated_completion_days: number | null
  estimated_labor_hours: number | null
  parts_warranty_months: number | null
  labor_warranty_months: number | null
  warranty_info: string | null

  description: string
  parts_needed: string | null
  repair_plan: string | null
  alternative_options: string | null

  earliest_availability_date: string | null
  can_provide_loaner_vehicle: boolean
  can_provide_pickup_dropoff: boolean
  after_hours_service_available: boolean

  status: string
  created_at: string
  viewed_by_customer: boolean
}

interface RFQDetails {
  id: string
  title: string
  description: string
  diagnosis_summary: string
  recommended_services: string[] | null
  urgency: string
  bid_count: number
  status: string
  bid_deadline: string
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
}

export default function RFQBidsPage({ params }: { params: { rfqId: string } }) {
  const router = useRouter()
  const { isLoading: authLoading, user } = useAuthGuard({ requiredRole: 'customer' })

  const [rfq, setRfq] = useState<RFQDetails | null>(null)
  const [bids, setBids] = useState<RFQBid[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'warranty'>('price')

  useEffect(() => {
    if (user) {
      fetchRFQAndBids()
    }
  }, [user, params.rfqId])

  async function fetchRFQAndBids() {
    try {
      setLoading(true)

      // Fetch RFQ details
      const rfqResponse = await fetch(`/api/rfq/${params.rfqId}`)
      if (!rfqResponse.ok) throw new Error('Failed to load RFQ')

      const rfqData = await rfqResponse.json()
      setRfq(rfqData.rfq)

      // Fetch bids
      const bidsResponse = await fetch(`/api/rfq/${params.rfqId}/bids`)
      if (!bidsResponse.ok) throw new Error('Failed to load bids')

      const bidsData = await bidsResponse.json()
      setBids(bidsData.bids || [])

    } catch (err) {
      console.error('Error fetching RFQ/bids:', err)
      setError(err instanceof Error ? err.message : 'Failed to load bids')
    } finally {
      setLoading(false)
    }
  }

  async function acceptBid(bidId: string) {
    if (!confirm('Are you sure you want to accept this bid? This will reject all other bids.')) {
      return
    }

    try {
      setAcceptingBid(bidId)

      const response = await fetch(`/api/rfq/${params.rfqId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid_id: bidId })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to accept bid')
      }

      // Redirect to payment
      router.push(`/customer/rfq/${params.rfqId}/payment`)

    } catch (err) {
      console.error('Error accepting bid:', err)
      alert(err instanceof Error ? err.message : 'Failed to accept bid')
    } finally {
      setAcceptingBid(null)
    }
  }

  const sortedBids = [...bids].sort((a, b) => {
    if (sortBy === 'price') return a.quote_amount - b.quote_amount
    if (sortBy === 'rating') return (b.workshop_rating || 0) - (a.workshop_rating || 0)
    if (sortBy === 'warranty') {
      const aWarranty = (a.parts_warranty_months || 0) + (a.labor_warranty_months || 0)
      const bWarranty = (b.parts_warranty_months || 0) + (b.labor_warranty_months || 0)
      return bWarranty - aWarranty
    }
    return 0
  })

  const lowestBid = bids.length > 0 ? Math.min(...bids.map(b => b.quote_amount)) : 0
  const highestBid = bids.length > 0 ? Math.max(...bids.map(b => b.quote_amount)) : 0
  const avgBid = bids.length > 0 ? bids.reduce((sum, b) => sum + b.quote_amount, 0) / bids.length : 0

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bids...</p>
        </div>
      </div>
    )
  }

  if (error || !rfq) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Error Loading Bids</h3>
              <p className="text-red-700">{error || 'RFQ not found'}</p>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="mt-4 text-red-600 hover:text-red-800 font-medium"
          >
            ê Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/customer/rfq/my-rfqs')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My RFQs
        </button>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{rfq.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                {rfq.vehicle_make && (
                  <div className="flex items-center gap-1">
                    <Car className="w-4 h-4" />
                    {rfq.vehicle_year} {rfq.vehicle_make} {rfq.vehicle_model}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {bids.length} bid{bids.length !== 1 ? 's' : ''} received
                </div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              rfq.status === 'open' ? 'bg-green-100 text-green-700' :
              rfq.status === 'bid_accepted' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {rfq.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>

          <p className="text-gray-700 mb-4">{rfq.description}</p>

          {rfq.diagnosis_summary && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">Mechanic's Diagnosis</h3>
              <p className="text-blue-800">{rfq.diagnosis_summary}</p>
            </div>
          )}

          {bids.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-600">Lowest Bid</p>
                <p className="text-xl font-bold text-green-600">${lowestBid.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Bid</p>
                <p className="text-xl font-bold text-gray-900">${avgBid.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Highest Bid</p>
                <p className="text-xl font-bold text-gray-600">${highestBid.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sort Controls */}
      {bids.length > 0 && (
        <div className="mb-6 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
          <div className="flex gap-2">
            {(['price', 'rating', 'warranty'] as const).map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === sort
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border hover:bg-gray-50'
                }`}
              >
                {sort.charAt(0).toUpperCase() + sort.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bids List */}
      {bids.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bids Yet</h3>
          <p className="text-gray-600">
            Workshops are reviewing your request. Bids will appear here once submitted.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedBids.map((bid, index) => (
            <div
              key={bid.id}
              className={`bg-white rounded-lg shadow-sm border-2 transition-all ${
                bid.quote_amount === lowestBid
                  ? 'border-green-500 ring-2 ring-green-100'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="p-6">
                {/* Workshop Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{bid.workshop_name}</h3>
                      {bid.quote_amount === lowestBid && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          BEST PRICE
                        </span>
                      )}
                      {index === 0 && sortBy === 'rating' && bid.workshop_rating && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          TOP RATED
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      {bid.workshop_city && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {bid.workshop_city}
                        </div>
                      )}
                      {bid.workshop_rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {bid.workshop_rating.toFixed(1)} ({bid.workshop_review_count} reviews)
                        </div>
                      )}
                      {bid.workshop_years_in_business && (
                        <div className="flex items-center gap-1">
                          <Award className="w-4 h-4" />
                          {bid.workshop_years_in_business} years in business
                        </div>
                      )}
                    </div>

                    {bid.workshop_certifications && bid.workshop_certifications.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {bid.workshop_certifications.map((cert, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                            {cert}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">${bid.quote_amount.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">Total Price</div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-600">Parts</p>
                    <p className="font-semibold">${bid.parts_cost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Labor</p>
                    <p className="font-semibold">${bid.labor_cost.toFixed(2)}</p>
                  </div>
                  {bid.shop_supplies_fee && (
                    <div>
                      <p className="text-xs text-gray-600">Shop Supplies</p>
                      <p className="font-semibold">${bid.shop_supplies_fee.toFixed(2)}</p>
                    </div>
                  )}
                  {bid.tax_amount && (
                    <div>
                      <p className="text-xs text-gray-600">Tax</p>
                      <p className="font-semibold">${bid.tax_amount.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Repair Plan</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{bid.description}</p>

                  {bid.repair_plan && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600"><span className="font-medium">Details:</span> {bid.repair_plan}</p>
                    </div>
                  )}

                  {bid.alternative_options && (
                    <div className="mt-2 p-3 bg-amber-50 rounded border border-amber-200">
                      <p className="text-sm text-amber-900">
                        <span className="font-medium">Alternative Options:</span> {bid.alternative_options}
                      </p>
                    </div>
                  )}
                </div>

                {/* Service Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {bid.estimated_completion_days && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-600">Completion Time</p>
                        <p className="font-medium">{bid.estimated_completion_days} days</p>
                      </div>
                    </div>
                  )}

                  {(bid.parts_warranty_months || bid.labor_warranty_months) && (
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-600">Warranty</p>
                        <p className="font-medium">
                          {bid.parts_warranty_months && `${bid.parts_warranty_months}mo parts`}
                          {bid.parts_warranty_months && bid.labor_warranty_months && ' / '}
                          {bid.labor_warranty_months && `${bid.labor_warranty_months}mo labor`}
                        </p>
                      </div>
                    </div>
                  )}

                  {bid.earliest_availability_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-600">Available</p>
                        <p className="font-medium">{new Date(bid.earliest_availability_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Value-Adds */}
                {(bid.can_provide_loaner_vehicle || bid.can_provide_pickup_dropoff || bid.after_hours_service_available) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {bid.can_provide_loaner_vehicle && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Loaner Vehicle
                      </span>
                    )}
                    {bid.can_provide_pickup_dropoff && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Pickup & Dropoff
                      </span>
                    )}
                    {bid.after_hours_service_available && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        After Hours Service
                      </span>
                    )}
                  </div>
                )}

                {/* Action Button */}
                {rfq.status === 'open' && bid.status === 'pending' && (
                  <button
                    onClick={() => acceptBid(bid.id)}
                    disabled={acceptingBid === bid.id}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {acceptingBid === bid.id ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Accept This Bid
                      </>
                    )}
                  </button>
                )}

                {bid.status === 'accepted' && (
                  <div className="w-full bg-green-100 text-green-700 font-semibold py-3 px-4 rounded-lg text-center">
                     Bid Accepted
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
