'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthGuard } from '@/lib/auth/guards'
import {
  DollarSign,
  Clock,
  Shield,
  Car,
  MapPin,
  Calendar,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Send,
  ArrowLeft,
  AlertCircle,
  Info
} from 'lucide-react'

interface RFQDetails {
  id: string
  title: string
  description: string
  diagnosis_summary: string
  recommended_services: string[] | null
  mechanic_notes: string | null
  urgency: string
  issue_category: string | null

  customer_city: string | null
  customer_province: string | null
  customer_postal_code: string | null

  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_year: number | null
  vehicle_mileage: number | null
  vehicle_vin: string | null

  budget_min: number | null
  budget_max: number | null

  bid_deadline: string
  max_bids: number
  bid_count: number
  status: string

  diagnostic_photos: any[]
  additional_photos: string[] | null

  created_at: string
}

export default function WorkshopRFQDetailPage({ params }: { params: { rfqId: string } }) {
  const router = useRouter()
  const { isLoading: authLoading, user } = useAuthGuard({ requiredRole: 'workshop_member' })

  const [rfq, setRfq] = useState<RFQDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Bid form state
  const [bidData, setBidData] = useState({
    // Pricing
    parts_cost: '',
    labor_cost: '',
    shop_supplies_fee: '',
    environmental_fee: '',
    tax_amount: '',

    // Service details
    description: '',
    parts_needed: '',
    repair_plan: '',
    alternative_options: '',

    // Timeline
    estimated_completion_days: '',
    estimated_labor_hours: '',
    earliest_availability_date: '',

    // Warranty
    parts_warranty_months: '12',
    labor_warranty_months: '12',
    warranty_info: '',

    // Value-adds
    can_provide_loaner_vehicle: false,
    can_provide_pickup_dropoff: false,
    after_hours_service_available: false
  })

  useEffect(() => {
    if (user) {
      fetchRFQDetails()
    }
  }, [user, params.rfqId])

  async function fetchRFQDetails() {
    try {
      setLoading(true)

      // Track view
      await fetch(`/api/rfq/marketplace/${params.rfqId}/view`, { method: 'POST' })

      // Fetch RFQ details
      const response = await fetch(`/api/rfq/marketplace/${params.rfqId}`)
      if (!response.ok) throw new Error('Failed to load RFQ')

      const data = await response.json()
      setRfq(data.rfq)

    } catch (err) {
      console.error('Error fetching RFQ:', err)
      setError(err instanceof Error ? err.message : 'Failed to load RFQ')
    } finally {
      setLoading(false)
    }
  }

  async function submitBid(e: React.FormEvent) {
    e.preventDefault()

    if (!confirm('Are you sure you want to submit this bid? You cannot modify it after submission.')) {
      return
    }

    try {
      setSubmitting(true)

      const partsTotal = parseFloat(bidData.parts_cost) || 0
      const laborTotal = parseFloat(bidData.labor_cost) || 0
      const supplies = parseFloat(bidData.shop_supplies_fee) || 0
      const envFee = parseFloat(bidData.environmental_fee) || 0
      const tax = parseFloat(bidData.tax_amount) || 0

      const quoteAmount = partsTotal + laborTotal + supplies + envFee + tax

      if (quoteAmount <= 0) {
        alert('Please enter valid pricing information')
        return
      }

      if (!bidData.description.trim()) {
        alert('Please provide a description of the repair work')
        return
      }

      const response = await fetch('/api/rfq/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfq_marketplace_id: params.rfqId,
          quote_amount: quoteAmount,
          parts_cost: partsTotal,
          labor_cost: laborTotal,
          shop_supplies_fee: supplies || null,
          environmental_fee: envFee || null,
          tax_amount: tax || null,

          description: bidData.description,
          parts_needed: bidData.parts_needed || null,
          repair_plan: bidData.repair_plan || null,
          alternative_options: bidData.alternative_options || null,

          estimated_completion_days: parseInt(bidData.estimated_completion_days) || null,
          estimated_labor_hours: parseFloat(bidData.estimated_labor_hours) || null,
          earliest_availability_date: bidData.earliest_availability_date || null,

          parts_warranty_months: parseInt(bidData.parts_warranty_months) || null,
          labor_warranty_months: parseInt(bidData.labor_warranty_months) || null,
          warranty_info: bidData.warranty_info || null,

          can_provide_loaner_vehicle: bidData.can_provide_loaner_vehicle,
          can_provide_pickup_dropoff: bidData.can_provide_pickup_dropoff,
          after_hours_service_available: bidData.after_hours_service_available
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit bid')
      }

      alert('Bid submitted successfully! The customer will review it shortly.')
      router.push('/workshop/rfq/my-bids')

    } catch (err) {
      console.error('Error submitting bid:', err)
      alert(err instanceof Error ? err.message : 'Failed to submit bid')
    } finally {
      setSubmitting(false)
    }
  }

  const quoteTotal = (parseFloat(bidData.parts_cost) || 0) +
                     (parseFloat(bidData.labor_cost) || 0) +
                     (parseFloat(bidData.shop_supplies_fee) || 0) +
                     (parseFloat(bidData.environmental_fee) || 0) +
                     (parseFloat(bidData.tax_amount) || 0)

  const isWithinBudget = rfq?.budget_max ? quoteTotal <= rfq.budget_max : true

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading RFQ...</p>
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
              <h3 className="font-semibold text-red-900">Error Loading RFQ</h3>
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

  if (rfq.status !== 'open') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-900">RFQ No Longer Accepting Bids</h3>
              <p className="text-yellow-700">This RFQ is {rfq.status}. Bids can only be submitted on open RFQs.</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/workshop/rfq/marketplace')}
            className="mt-4 text-yellow-600 hover:text-yellow-800 font-medium"
          >
            ê Back to Marketplace
          </button>
        </div>
      </div>
    )
  }

  const deadlineDate = new Date(rfq.bid_deadline)
  const isDeadlineSoon = deadlineDate.getTime() - Date.now() < 24 * 60 * 60 * 1000 // Less than 24 hours

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/workshop/rfq/marketplace')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </button>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{rfq.title}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                {rfq.vehicle_make && (
                  <div className="flex items-center gap-1">
                    <Car className="w-4 h-4" />
                    {rfq.vehicle_year} {rfq.vehicle_make} {rfq.vehicle_model}
                  </div>
                )}
                {rfq.vehicle_mileage && (
                  <div>{rfq.vehicle_mileage.toLocaleString()} km</div>
                )}
                {rfq.customer_city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {rfq.customer_city}, {rfq.customer_province}
                  </div>
                )}
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              rfq.urgency === 'urgent' ? 'bg-red-100 text-red-700' :
              rfq.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
              'bg-green-100 text-green-700'
            }`}>
              {rfq.urgency?.toUpperCase() || 'NORMAL'} PRIORITY
            </div>
          </div>

          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
            isDeadlineSoon ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
          }`}>
            <Clock className="w-5 h-5" />
            <div>
              <span className="font-semibold">Bid Deadline:</span> {deadlineDate.toLocaleString()}
              {isDeadlineSoon && <span className="ml-2 text-red-900 font-semibold">† URGENT</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Bids Received</p>
              <p className="text-2xl font-bold">{rfq.bid_count} / {rfq.max_bids}</p>
            </div>
            {rfq.budget_min && rfq.budget_max && (
              <div>
                <p className="text-sm text-gray-600">Customer Budget</p>
                <p className="text-lg font-semibold">${rfq.budget_min} - ${rfq.budget_max}</p>
              </div>
            )}
          </div>

          <p className="text-gray-700 mb-4">{rfq.description}</p>

          {rfq.diagnosis_summary && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Mechanic's Diagnosis
              </h3>
              <p className="text-blue-800">{rfq.diagnosis_summary}</p>
              {rfq.recommended_services && rfq.recommended_services.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-blue-900">Recommended Services:</p>
                  <ul className="list-disc list-inside text-blue-800">
                    {rfq.recommended_services.map((service, i) => (
                      <li key={i}>{service}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {rfq.mechanic_notes && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Additional Notes</h3>
              <p className="text-gray-700">{rfq.mechanic_notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bid Submission Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Your Bid</h2>

        <form onSubmit={submitBid} className="space-y-6">
          {/* Pricing Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Breakdown</h3>
            <p className="text-sm text-gray-600 mb-4">
              ñ Ontario Consumer Protection Act requires detailed pricing breakdown
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parts Cost <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={bidData.parts_cost}
                    onChange={(e) => setBidData({...bidData, parts_cost: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Labor Cost <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={bidData.labor_cost}
                    onChange={(e) => setBidData({...bidData, labor_cost: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Supplies Fee</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={bidData.shop_supplies_fee}
                    onChange={(e) => setBidData({...bidData, shop_supplies_fee: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Environmental Fee</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={bidData.environmental_fee}
                    onChange={(e) => setBidData({...bidData, environmental_fee: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={bidData.tax_amount}
                    onChange={(e) => setBidData({...bidData, tax_amount: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className={`mt-4 p-4 rounded-lg ${
              isWithinBudget ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">Total Quote Amount:</span>
                <span className="text-2xl font-bold">${quoteTotal.toFixed(2)}</span>
              </div>
              {!isWithinBudget && rfq.budget_max && (
                <p className="text-red-700 text-sm mt-2">
                  † Your bid exceeds the customer's budget (${rfq.budget_max.toFixed(2)})
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repair Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the repair work you'll perform..."
              value={bidData.description}
              onChange={(e) => setBidData({...bidData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parts Needed</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="List the parts required..."
                value={bidData.parts_needed}
                onChange={(e) => setBidData({...bidData, parts_needed: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repair Plan</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Detailed repair plan..."
                value={bidData.repair_plan}
                onChange={(e) => setBidData({...bidData, repair_plan: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alternative Options</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., repair vs replace options..."
              value={bidData.alternative_options}
              onChange={(e) => setBidData({...bidData, alternative_options: e.target.value})}
            />
          </div>

          {/* Timeline & Warranty */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Completion Time (days)</label>
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={bidData.estimated_completion_days}
                onChange={(e) => setBidData({...bidData, estimated_completion_days: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Labor Hours</label>
              <input
                type="number"
                step="0.5"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={bidData.estimated_labor_hours}
                onChange={(e) => setBidData({...bidData, estimated_labor_hours: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Earliest Availability</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={bidData.earliest_availability_date}
                onChange={(e) => setBidData({...bidData, earliest_availability_date: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parts Warranty (months)</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={bidData.parts_warranty_months}
                onChange={(e) => setBidData({...bidData, parts_warranty_months: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Labor Warranty (months)</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={bidData.labor_warranty_months}
                onChange={(e) => setBidData({...bidData, labor_warranty_months: e.target.value})}
              />
            </div>
          </div>

          {/* Value-Adds */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Services</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  checked={bidData.can_provide_loaner_vehicle}
                  onChange={(e) => setBidData({...bidData, can_provide_loaner_vehicle: e.target.checked})}
                />
                <span>Can provide loaner vehicle</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  checked={bidData.can_provide_pickup_dropoff}
                  onChange={(e) => setBidData({...bidData, can_provide_pickup_dropoff: e.target.checked})}
                />
                <span>Can provide pickup & dropoff service</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  checked={bidData.after_hours_service_available}
                  onChange={(e) => setBidData({...bidData, after_hours_service_available: e.target.checked})}
                />
                <span>After-hours service available</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t">
            <button
              type="submit"
              disabled={submitting || quoteTotal <= 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Submitting Bid...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Bid
                </>
              )}
            </button>

            <p className="text-sm text-gray-600 text-center mt-3">
              By submitting, you agree to provide the quoted service at the stated price
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
