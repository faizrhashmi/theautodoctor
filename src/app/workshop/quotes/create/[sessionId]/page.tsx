'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface LineItem {
  id: string
  type: 'labor' | 'parts'
  description: string
  hours?: number
  rate?: number
  quantity?: number
  unit_cost?: number
  subtotal: number
}

interface DiagnosticSession {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  vehicle: any
  issue_description: string
  diagnosis_summary: string
  recommended_services: string[]
  urgency: string
  service_type: string
  photos: string[]
}

interface FeeCalculation {
  platform_fee_percent: number
  platform_fee_amount: number
  customer_total: number
  provider_receives: number
  rule_applied: string
}

export default function CreateQuotePage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [session, setSession] = useState<DiagnosticSession | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [feeCalculation, setFeeCalculation] = useState<FeeCalculation | null>(null)
  const [notes, setNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [estimatedHours, setEstimatedHours] = useState<number>(0)
  const [warrantyDays, setWarrantyDays] = useState<number>(90)

  // Load diagnostic session
  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch(`/api/workshop/diagnostics/${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          setSession(data)
        } else {
          alert('Failed to load diagnostic session')
        }
      } catch (error) {
        console.error('Error loading session:', error)
        alert('Failed to load diagnostic session')
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [sessionId])

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0)
  const laborCost = lineItems
    .filter(item => item.type === 'labor')
    .reduce((sum, item) => sum + item.subtotal, 0)
  const partsCost = lineItems
    .filter(item => item.type === 'parts')
    .reduce((sum, item) => sum + item.subtotal, 0)

  // Calculate fees when subtotal changes
  useEffect(() => {
    async function calculateFees() {
      if (subtotal === 0) {
        setFeeCalculation(null)
        return
      }

      try {
        const response = await fetch('/api/fees/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subtotal: subtotal,
            service_type: session?.service_type || 'general',
            provider_type: 'workshop'
          })
        })

        if (response.ok) {
          const data = await response.json()
          setFeeCalculation(data)
        }
      } catch (error) {
        console.error('Error calculating fees:', error)
      }
    }

    calculateFees()
  }, [subtotal, session?.service_type])

  // Add labor line item
  function addLaborItem() {
    const newItem: LineItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'labor',
      description: '',
      hours: 1,
      rate: 95,
      subtotal: 95
    }
    setLineItems([...lineItems, newItem])
  }

  // Add parts line item
  function addPartsItem() {
    const newItem: LineItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'parts',
      description: '',
      quantity: 1,
      unit_cost: 0,
      subtotal: 0
    }
    setLineItems([...lineItems, newItem])
  }

  // Update line item
  function updateLineItem(id: string, updates: Partial<LineItem>) {
    setLineItems(lineItems.map(item => {
      if (item.id !== id) return item

      const updated = { ...item, ...updates }

      // Recalculate subtotal based on type
      if (updated.type === 'labor') {
        updated.subtotal = (updated.hours || 0) * (updated.rate || 0)
      } else if (updated.type === 'parts') {
        updated.subtotal = (updated.quantity || 0) * (updated.unit_cost || 0)
      }

      return updated
    }))
  }

  // Remove line item
  function removeLineItem(id: string) {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  // Submit quote
  async function submitQuote() {
    if (lineItems.length === 0) {
      alert('Please add at least one line item')
      return
    }

    if (!feeCalculation) {
      alert('Fee calculation failed. Please try again.')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/workshop/quotes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnostic_session_id: sessionId,
          customer_id: session?.customer_name, // TODO: Use actual customer ID
          line_items: lineItems,
          labor_cost: laborCost,
          parts_cost: partsCost,
          subtotal: subtotal,
          platform_fee_percent: feeCalculation.platform_fee_percent,
          platform_fee_amount: feeCalculation.platform_fee_amount,
          customer_total: feeCalculation.customer_total,
          provider_receives: feeCalculation.provider_receives,
          fee_rule_applied: feeCalculation.rule_applied,
          notes: notes,
          internal_notes: internalNotes,
          estimated_completion_hours: estimatedHours,
          warranty_days: warrantyDays
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert('Quote sent successfully!')
        router.push(`/workshop/dashboard?notification=quote_sent`)
      } else {
        const error = await response.json()
        alert(`Failed to send quote: ${error.error}`)
      }
    } catch (error) {
      console.error('Error submitting quote:', error)
      alert('Failed to send quote')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading diagnostic session...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Diagnostic session not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Repair Quote</h1>
          <p className="text-gray-600 mt-1">Based on mechanic diagnosis</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Diagnosis Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Vehicle Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Customer & Vehicle</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Customer Name</label>
                  <p className="text-gray-900">{session.customer_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-gray-900">{session.customer_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Phone</label>
                  <p className="text-gray-900">{session.customer_phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Vehicle</label>
                  <p className="text-gray-900">
                    {session.vehicle?.year} {session.vehicle?.make} {session.vehicle?.model}
                  </p>
                </div>
              </div>
            </div>

            {/* Mechanic's Diagnosis */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Mechanic's Diagnosis</h2>

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-600">Issue Description</label>
                <p className="text-gray-900">{session.issue_description}</p>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-600">Diagnosis Summary</label>
                <p className="text-gray-900">{session.diagnosis_summary}</p>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-600">Recommended Services</label>
                <ul className="list-disc list-inside text-gray-900">
                  {session.recommended_services.map((service, index) => (
                    <li key={index}>{service}</li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Urgency</label>
                  <p className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    session.urgency === 'urgent' ? 'bg-red-100 text-red-800' :
                    session.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
                    session.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {session.urgency}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Service Type</label>
                  <p className="text-gray-900">{session.service_type}</p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Quote Line Items</h2>
                <div className="space-x-2">
                  <button
                    onClick={addLaborItem}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    + Add Labor
                  </button>
                  <button
                    onClick={addPartsItem}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    + Add Parts
                  </button>
                </div>
              </div>

              {lineItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No line items yet. Click "Add Labor" or "Add Parts" to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {lineItems.map((item) => (
                    <div key={item.id} className="border rounded p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5">
                          <label className="text-sm font-medium text-gray-600">Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            placeholder={item.type === 'labor' ? 'e.g., Brake pad replacement' : 'e.g., Front brake pads'}
                          />
                        </div>

                        {item.type === 'labor' ? (
                          <>
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium text-gray-600">Hours</label>
                              <input
                                type="number"
                                step="0.5"
                                value={item.hours}
                                onChange={(e) => updateLineItem(item.id, { hours: parseFloat(e.target.value) })}
                                className="w-full border rounded px-3 py-2"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium text-gray-600">Rate ($)</label>
                              <input
                                type="number"
                                value={item.rate}
                                onChange={(e) => updateLineItem(item.id, { rate: parseFloat(e.target.value) })}
                                className="w-full border rounded px-3 py-2"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium text-gray-600">Qty</label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(item.id, { quantity: parseInt(e.target.value) })}
                                className="w-full border rounded px-3 py-2"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium text-gray-600">Unit Cost ($)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unit_cost}
                                onChange={(e) => updateLineItem(item.id, { unit_cost: parseFloat(e.target.value) })}
                                className="w-full border rounded px-3 py-2"
                              />
                            </div>
                          </>
                        )}

                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-600">Subtotal</label>
                          <p className="text-lg font-semibold">${item.subtotal.toFixed(2)}</p>
                        </div>

                        <div className="md:col-span-1 flex items-end">
                          <button
                            onClick={() => removeLineItem(item.id)}
                            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Additional Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes for Customer
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Any additional information for the customer..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal Notes (Not visible to customer)
                  </label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={2}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Internal notes for your team..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Completion (hours)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(parseFloat(e.target.value))}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warranty (days)
                    </label>
                    <input
                      type="number"
                      value={warrantyDays}
                      onChange={(e) => setWarrantyDays(parseInt(e.target.value))}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Quote Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h2 className="text-xl font-semibold mb-4">Quote Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Labor</span>
                  <span className="font-medium">${laborCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Parts</span>
                  <span className="font-medium">${partsCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-semibold">Subtotal</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>

                {feeCalculation && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Platform Fee ({feeCalculation.platform_fee_percent}%)
                      </span>
                      <span className="text-gray-600">${feeCalculation.platform_fee_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="text-lg font-bold">Customer Total</span>
                      <span className="text-lg font-bold text-blue-600">
                        ${feeCalculation.customer_total.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm bg-green-50 p-3 rounded">
                      <span className="text-green-800 font-medium">You Receive</span>
                      <span className="text-green-800 font-bold">
                        ${feeCalculation.provider_receives.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Fee rule: {feeCalculation.rule_applied}
                    </p>
                  </>
                )}
              </div>

              <button
                onClick={submitQuote}
                disabled={submitting || lineItems.length === 0}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending Quote...' : 'Send Quote to Customer'}
              </button>

              <button
                onClick={() => router.back()}
                className="w-full mt-2 py-3 border border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
