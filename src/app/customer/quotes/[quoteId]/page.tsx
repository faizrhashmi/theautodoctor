'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthGuard } from '@/hooks/useAuthGuard'

interface Quote {
  id: string
  customer: {
    id: string
    name: string
    email: string
    phone: string
  }
  workshop: {
    id: string
    name: string
    email: string
  } | null
  diagnosis: {
    summary: string
    recommended_services: string[]
    urgency: string
    service_type: string
    vehicle: any
  } | null
  line_items: any[]
  pricing: {
    labor_cost: number
    parts_cost: number
    subtotal: number
    platform_fee_percent: number
    platform_fee_amount: number
    customer_total: number
    provider_receives: number
    fee_rule_applied: string
  }
  status: string
  notes: string
  warranty_days: number
  warranty_expires_at: string
  estimated_completion_hours: number
  created_at: string
  sent_at: string
  viewed_at: string
  customer_responded_at: string
  customer_response: string
  customer_notes: string
  decline_reason: string
}

export default function CustomerQuoteViewPage() {
  // ✅ Auth guard - ensures user is authenticated as customer
  const { isLoading: authLoading, user } = useAuthGuard({ requiredRole: 'customer' })

  const router = useRouter()
  const params = useParams()
  const quoteId = params.quoteId as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [showDeclineForm, setShowDeclineForm] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')

  // Load quote
  useEffect(() => {
    if (!user) return

    async function loadQuote() {
      try {
        const response = await fetch(`/api/quotes/${quoteId}`)
        if (response.ok) {
          const data = await response.json()
          setQuote(data)
        } else {
          alert('Failed to load quote')
        }
      } catch (error) {
        console.error('Error loading quote:', error)
        alert('Failed to load quote')
      } finally {
        setLoading(false)
      }
    }

    loadQuote()
  }, [quoteId, user])

  // Approve quote
  async function approveQuote() {
    if (!confirm('Are you sure you want to approve this quote? This will authorize the workshop to begin work.')) {
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/quotes/${quoteId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: 'approved',
          notes: customerNotes
        })
      })

      if (response.ok) {
        alert('Quote approved! The workshop will be notified and will begin work.')
        // Reload quote to show updated status
        window.location.reload()
      } else {
        const error = await response.json()
        alert(`Failed to approve quote: ${error.error}`)
      }
    } catch (error) {
      console.error('Error approving quote:', error)
      alert('Failed to approve quote')
    } finally {
      setSubmitting(false)
    }
  }

  // Decline quote
  async function declineQuote() {
    if (!declineReason.trim()) {
      alert('Please provide a reason for declining')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/quotes/${quoteId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: 'declined',
          decline_reason: declineReason,
          notes: customerNotes
        })
      })

      if (response.ok) {
        alert('Quote declined. The workshop has been notified.')
        // Reload quote to show updated status
        window.location.reload()
      } else {
        const error = await response.json()
        alert(`Failed to decline quote: ${error.error}`)
      }
    } catch (error) {
      console.error('Error declining quote:', error)
      alert('Failed to decline quote')
    } finally {
      setSubmitting(false)
    }
  }

  // Show loading state while checking authentication
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">
            {authLoading ? 'Verifying authentication...' : 'Loading quote...'}
          </p>
        </div>
      </div>
    )
  }

  // Auth guard will redirect if not authenticated, but add safety check
  if (!user) {
    return null
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <p className="text-red-400">Quote not found</p>
        </div>
      </div>
    )
  }

  const canRespond = ['pending', 'viewed'].includes(quote.status)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Repair Quote</h1>
          <p className="text-slate-400 mt-1">
            From {quote.workshop?.name || 'Independent Mechanic'}
          </p>
          <div className="mt-2">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${
              quote.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
              quote.status === 'declined' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
              quote.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
              'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
            }`}>
              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Vehicle & Diagnosis Info */}
        {quote.diagnosis && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Vehicle & Diagnosis</h2>

            <div className="mb-4">
              <label className="text-sm font-medium text-slate-400">Vehicle</label>
              <p className="text-white">
                {quote.diagnosis.vehicle?.year} {quote.diagnosis.vehicle?.make} {quote.diagnosis.vehicle?.model}
              </p>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-slate-400">Diagnosis Summary</label>
              <p className="text-white">{quote.diagnosis.summary}</p>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-slate-400">Recommended Services</label>
              <ul className="list-disc list-inside text-white">
                {quote.diagnosis.recommended_services.map((service, index) => (
                  <li key={index}>{service}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-400">Urgency</label>
                <p className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  quote.diagnosis.urgency === 'urgent' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                  quote.diagnosis.urgency === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
                  quote.diagnosis.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                  'bg-green-500/20 text-green-400 border border-green-500/50'
                }`}>
                  {quote.diagnosis.urgency}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Service Type</label>
                <p className="text-white">{quote.diagnosis.service_type}</p>
              </div>
            </div>
          </div>
        )}

        {/* Line Items */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quote Details</h2>

          <div className="space-y-3">
            {quote.line_items.map((item: any, index: number) => (
              <div key={index} className="border-b pb-3 last:border-b-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-white">{item.description}</p>
                    {item.type === 'labor' && (
                      <p className="text-sm text-slate-400">
                        {item.hours} hours @ ${item.rate}/hr
                      </p>
                    )}
                    {item.type === 'parts' && (
                      <p className="text-sm text-slate-400">
                        Qty: {item.quantity} @ ${item.unit_cost} each
                      </p>
                    )}
                  </div>
                  <p className="font-semibold text-white">${item.subtotal.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Pricing</h2>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Labor</span>
              <span className="font-medium">${quote.pricing.labor_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Parts</span>
              <span className="font-medium">${quote.pricing.parts_cost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-semibold">Subtotal</span>
              <span className="font-semibold">${quote.pricing.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">
                Platform Fee ({quote.pricing.platform_fee_percent}%)
              </span>
              <span className="text-slate-400">${quote.pricing.platform_fee_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-2xl font-bold">Total</span>
              <span className="text-2xl font-bold text-blue-400">
                ${quote.pricing.customer_total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Additional Information</h2>

          {quote.notes && (
            <div className="mb-4">
              <label className="text-sm font-medium text-slate-400">Notes</label>
              <p className="text-white">{quote.notes}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-400">Estimated Completion</label>
              <p className="text-white">{quote.estimated_completion_hours} hours</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400">Warranty</label>
              <p className="text-white">{quote.warranty_days} days</p>
            </div>
          </div>
        </div>

        {/* OCPA Disclosure - Required before quote acceptance */}
        {canRespond && (
          <div className="bg-blue-500/10 border-2 border-blue-400/30 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-100 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Important Information About This Quote
            </h3>

            <ul className="text-sm text-blue-100/90 space-y-2.5">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold mt-0.5">✓</span>
                <span>
                  This quote is provided by <strong>{quote.workshop?.name || 'an independent mechanic'}</strong>,
                  an independent automotive repair business
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold mt-0.5">✓</span>
                <span>
                  The Auto Doctor facilitates the connection but does not perform repair work
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold mt-0.5">✓</span>
                <span>
                  {quote.workshop?.name || 'The mechanic'} is responsible for the quality and accuracy of this quote
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold mt-0.5">⚖</span>
                <span>
                  <strong>Ontario law protects you:</strong> Final cost cannot exceed this quote by more than 10%
                  without your written approval (O. Reg. 17/05, s. 56(3))
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold mt-0.5">✓</span>
                <span>
                  Warranty: {quote.warranty_days} days from completion date
                </span>
              </li>
            </ul>

            <div className="mt-4 pt-4 border-t border-blue-400/20">
              <p className="text-xs text-blue-200/70">
                By accepting this quote, you authorize {quote.workshop?.name || 'the mechanic'} to perform
                the described services at the quoted price.{' '}
                <a href="/customer/rights" className="text-blue-300 underline hover:text-blue-200">
                  Learn about your rights
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        {canRespond && !showDeclineForm && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Respond to Quote</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={3}
                className="w-full border rounded px-3 py-2"
                placeholder="Any questions or comments..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={approveQuote}
                disabled={submitting}
                className="flex-1 py-3 bg-green-600 text-white font-semibold rounded hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : 'Approve & Proceed to Payment'}
              </button>
              <button
                onClick={() => setShowDeclineForm(true)}
                disabled={submitting}
                className="flex-1 py-3 border-2 border-red-600 text-red-600 font-semibold rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Decline Quote
              </button>
            </div>
          </div>
        )}

        {/* Decline Form */}
        {canRespond && showDeclineForm && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Decline Quote</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Reason for Declining *
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                className="w-full border rounded px-3 py-2"
                placeholder="Please let us know why you're declining this quote..."
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Additional Comments (Optional)
              </label>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={2}
                className="w-full border rounded px-3 py-2"
                placeholder="Any other comments..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={declineQuote}
                disabled={submitting}
                className="flex-1 py-3 bg-red-600 text-white font-semibold rounded hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Confirm Decline'}
              </button>
              <button
                onClick={() => setShowDeclineForm(false)}
                disabled={submitting}
                className="flex-1 py-3 border border-slate-700 text-slate-300 font-semibold rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Already Responded */}
        {!canRespond && quote.customer_response && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Your Response</h2>
            <div className="mb-2">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                quote.customer_response === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                'bg-red-500/20 text-red-400 border border-red-500/50'
              }`}>
                {quote.customer_response.charAt(0).toUpperCase() + quote.customer_response.slice(1)}
              </span>
            </div>
            {quote.customer_notes && (
              <div className="mt-3">
                <label className="text-sm font-medium text-slate-400">Your Notes</label>
                <p className="text-white">{quote.customer_notes}</p>
              </div>
            )}
            {quote.decline_reason && (
              <div className="mt-3">
                <label className="text-sm font-medium text-slate-400">Decline Reason</label>
                <p className="text-white">{quote.decline_reason}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
