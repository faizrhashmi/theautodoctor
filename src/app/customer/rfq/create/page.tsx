/**
 * Customer RFQ Creation Page
 *
 * Allows customers to create repair Request for Quotes (RFQs) directly
 * Workshops can then bid competitively
 *
 * @route /customer/rfq/create
 * @feature ENABLE_CUSTOMER_RFQ
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CustomerRfqGate } from '@/components/guards/FeatureGate'
import { z } from 'zod'
import type { SessionSummary } from '@/types/sessionSummary'
import { apiRouteFor } from '@/lib/routes'

// ============================================================================
// Validation Schema
// ============================================================================

const CreateRfqSchema = z.object({
  vehicle_id: z.string().uuid('Please select a vehicle'),
  title: z.string().min(10, 'Title must be at least 10 characters').max(100, 'Title too long'),
  description: z.string().min(50, 'Please provide at least 50 characters').max(1000, 'Description too long'),
  issue_category: z.enum(['engine', 'brakes', 'electrical', 'suspension', 'transmission', 'other']).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  budget_min: z.number().positive().optional(),
  budget_max: z.number().positive().optional(),
  customer_consent: z.literal(true, { errorMap: () => ({ message: 'You must consent to share your information' }) }),
}).refine(data => {
  if (data.budget_min && data.budget_max) {
    return data.budget_min <= data.budget_max
  }
  return true
}, { message: 'Minimum budget must be less than or equal to maximum budget', path: ['budget_max'] })

type CreateRfqFormData = z.infer<typeof CreateRfqSchema>

// ============================================================================
// Types
// ============================================================================

interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  mileage: number
  vin?: string
  plate?: string
}

// ============================================================================
// Component
// ============================================================================

export default function CreateRfqPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPreview, setShowPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [prefilling, setPrefilling] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Partial<CreateRfqFormData>>({
    urgency: 'normal',
    issue_category: undefined,
    customer_consent: false,
  })

  // Load customer's vehicles and prefill from session if requested
  useEffect(() => {
    fetchVehicles()

    // Check for prefill parameters
    const sessionId = searchParams.get('session_id')
    const shouldPrefill = searchParams.get('prefill') === 'true'

    if (sessionId && shouldPrefill) {
      prefillFromSession(sessionId)
    }
  }, [searchParams])

  async function fetchVehicles() {
    try {
      const response = await fetch(apiRouteFor.customerVehicles())
      if (response.ok) {
        const data = await response.json()
        setVehicles(data.vehicles || [])
      }
    } catch (err) {
      console.error('Failed to load vehicles:', err)
    } finally {
      setLoadingVehicles(false)
    }
  }

  async function prefillFromSession(sessionId: string) {
    setPrefilling(true)
    try {
      const response = await fetch(apiRouteFor.sessionSummary(sessionId))
      if (response.ok) {
        const data = await response.json()
        const summary: SessionSummary | null = data.auto_summary

        if (summary && summary.identified_issues && summary.identified_issues.length > 0) {
          // Generate title from first issue
          const firstIssue = summary.identified_issues[0]
          const title = `${firstIssue.issue} - Repair Request`

          // Generate description from all issues
          let description = 'Issues identified during diagnostic session:\n\n'
          summary.identified_issues.forEach((issue, idx) => {
            description += `${idx + 1}. ${issue.issue} (${issue.severity.toUpperCase()})\n`
            if (issue.description) {
              description += `   ${issue.description}\n`
            }
            if (issue.est_cost_range) {
              description += `   Estimated Cost: ${issue.est_cost_range}\n`
            }
            description += '\n'
          })

          if (summary.customer_report) {
            description += `\nAdditional Details:\n${summary.customer_report}`
          }

          // Determine urgency from highest severity
          let urgency: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
          const hasUrgent = summary.identified_issues.some(i => i.severity === 'urgent')
          const hasHigh = summary.identified_issues.some(i => i.severity === 'high')
          if (hasUrgent) urgency = 'urgent'
          else if (hasHigh) urgency = 'high'

          setFormData(prev => ({
            ...prev,
            title: title.slice(0, 100), // Respect max length
            description: description.slice(0, 1000), // Respect max length
            urgency
          }))

          console.log('[RFQ Create] Prefilled from session summary')
        }
      }
    } catch (err) {
      console.error('[RFQ Create] Failed to prefill from session:', err)
    } finally {
      setPrefilling(false)
    }
  }

  function handleChange(field: keyof CreateRfqFormData, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  function handlePreview() {
    // Validate before showing preview
    try {
      CreateRfqSchema.parse(formData)
      setShowPreview(true)
      setErrors({})
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        if (err.errors && Array.isArray(err.errors)) {
          err.errors.forEach(error => {
            if (error.path && error.path[0]) {
              newErrors[error.path[0].toString()] = error.message
            }
          })
        }
        setErrors(newErrors)
      } else {
        console.error('[RFQ Create] Validation error:', err)
        setErrors({ submit: 'Validation failed. Please check your inputs.' })
      }
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setErrors({})

    try {
      const response = await fetch(apiRouteFor.rfqCreate(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create RFQ')
      }

      // Success - redirect to RFQ detail or my-rfqs
      router.push(`/customer/rfq/${result.rfq_id}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create RFQ'
      setErrors({ submit: errorMessage })
      setShowPreview(false) // Go back to form to show error
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CustomerRfqGate fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Feature Not Available</h1>
          <p className="text-slate-400 mb-6">Customer RFQ creation is not currently enabled</p>
          <Link href="/customer/rfq/my-rfqs" className="text-orange-500 hover:text-orange-400">
            Back to My RFQs
          </Link>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/customer/rfq/my-rfqs" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to My RFQs
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold">Create Repair Request (RFQ)</h1>
            <p className="text-slate-400 mt-2">
              Get competitive bids from local workshops
            </p>
          </div>

          {showPreview ? (
            /* Preview Mode */
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Preview - Form Data</h2>
              <pre className="bg-slate-950 p-4 rounded text-sm overflow-auto text-green-400">
                {JSON.stringify(formData, null, 2)}
              </pre>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setShowPreview(false)}
                  disabled={submitting}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Edit
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    'Submit RFQ'
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Form */
            <div className="space-y-6">
              {/* Vehicle Selection */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">1. Select Vehicle</h2>

                {loadingVehicles ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-4">You haven't added any vehicles yet</p>
                    <Link href="/customer/vehicles?returnTo=/customer/rfq/create" className="text-orange-500 hover:text-orange-400">
                      Add a vehicle first
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vehicles.map(vehicle => (
                      <label
                        key={vehicle.id}
                        className={`block p-4 border rounded-lg cursor-pointer transition-all ${
                          formData.vehicle_id === vehicle.id
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="vehicle"
                          value={vehicle.id}
                          checked={formData.vehicle_id === vehicle.id}
                          onChange={(e) => handleChange('vehicle_id', e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="font-semibold">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </div>
                            <div className="text-sm text-slate-400">
                              {vehicle.mileage?.toLocaleString()} km
                              {vehicle.vin && ` • VIN: ${vehicle.vin}`}
                              {vehicle.plate && ` • ${vehicle.plate}`}
                            </div>
                          </div>
                          {formData.vehicle_id === vehicle.id && (
                            <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {errors.vehicle_id && <p className="text-red-400 text-sm mt-2">{errors.vehicle_id}</p>}
              </div>

              {/* Issue Description */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">2. Describe Your Issue</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="e.g., Engine making knocking noise when accelerating"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      maxLength={100}
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>{errors.title || 'Brief summary of the issue'}</span>
                      <span>{formData.title?.length || 0}/100</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Detailed Description <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Describe the problem in detail: when it happens, what you notice, any recent changes..."
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                      rows={5}
                      maxLength={1000}
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>{errors.description || 'At least 50 characters'}</span>
                      <span>{formData.description?.length || 0}/1000</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Issue Category
                      </label>
                      <select
                        value={formData.issue_category || ''}
                        onChange={(e) => handleChange('issue_category', e.target.value || undefined)}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select category (optional)</option>
                        <option value="engine">Engine</option>
                        <option value="brakes">Brakes</option>
                        <option value="electrical">Electrical</option>
                        <option value="suspension">Suspension</option>
                        <option value="transmission">Transmission</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Urgency <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={formData.urgency || 'normal'}
                        onChange={(e) => handleChange('urgency', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="low">Low - Can wait</option>
                        <option value="normal">Normal - Within a week</option>
                        <option value="high">High - Within a few days</option>
                        <option value="urgent">Urgent - ASAP</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">3. Budget (Optional)</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Minimum Budget
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        value={formData.budget_min || ''}
                        onChange={(e) => handleChange('budget_min', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="0"
                        className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        min="0"
                        step="50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Maximum Budget
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        value={formData.budget_max || ''}
                        onChange={(e) => handleChange('budget_max', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Any"
                        className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        min="0"
                        step="50"
                      />
                    </div>
                    {errors.budget_max && <p className="text-red-400 text-sm mt-2">{errors.budget_max}</p>}
                  </div>
                </div>
              </div>

              {/* Consent */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">4. Privacy Consent</h2>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.customer_consent === true}
                    onChange={(e) => handleChange('customer_consent', e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-slate-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-900"
                  />
                  <div className="flex-1">
                    <span className="text-white">
                      I consent to share my vehicle and repair information with workshops <span className="text-red-400">*</span>
                    </span>
                    <p className="text-sm text-slate-400 mt-1">
                      Your information will be shared with qualified workshops so they can provide accurate quotes.
                      This complies with PIPEDA privacy regulations.
                    </p>
                  </div>
                </label>
                {errors.customer_consent && <p className="text-red-400 text-sm mt-2">{errors.customer_consent}</p>}
              </div>

              {/* Submission Error */}
              {errors.submit && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                  <p className="text-red-400">{errors.submit}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4">
                <Link
                  href="/customer/rfq/my-rfqs"
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </Link>
                <button
                  onClick={handlePreview}
                  className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-orange-500/20"
                >
                  Preview & Continue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </CustomerRfqGate>
  )
}
