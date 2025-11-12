/**
 * RFQ Creation Wizard
 *
 * 3-step wizard for mechanics to create RFQ marketplace listings
 *
 * @route /mechanic/rfq/create/[sessionId]
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { RfqGate } from '@/components/guards/FeatureGate'
import { CreateRfqSchema, type CreateRfqInput, SERVICE_CATEGORIES, URGENCY_LEVELS } from '@/lib/rfq/validation'
import type { ZodError } from 'zod'

export default function CreateRfqPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<Partial<CreateRfqInput>>({
    diagnostic_session_id: sessionId,
    vehicle_year: new Date().getFullYear(),
    vehicle_make: '',
    vehicle_model: '',
    vehicle_trim: '',
    vehicle_mileage: 0,
    vehicle_vin: '',
    title: '',
    description: '',
    issue_category: undefined,
    urgency: 'normal',
    photos: [],
    videos: [],
    budget_min: undefined,
    budget_max: undefined,
    min_workshop_rating: undefined,
    required_certifications: [],
    max_distance_km: 25,
    bid_deadline_hours: 72,
    max_bids: 10,
    customer_consent_to_share_info: false,
  })

  const updateField = <K extends keyof CreateRfqInput>(field: K, value: CreateRfqInput[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateStep = (stepNumber: number): boolean => {
    const stepErrors: Record<string, string> = {}

    if (stepNumber === 1) {
      if (!formData.vehicle_make) stepErrors.vehicle_make = 'Make is required'
      if (!formData.vehicle_model) stepErrors.vehicle_model = 'Model is required'
      if (!formData.vehicle_mileage || formData.vehicle_mileage <= 0) {
        stepErrors.vehicle_mileage = 'Valid mileage is required'
      }
      if (!formData.title || formData.title.length < 10) {
        stepErrors.title = 'Title must be at least 10 characters'
      }
      if (!formData.description || formData.description.length < 50) {
        stepErrors.description = 'Description must be at least 50 characters'
      }
      if (!formData.issue_category) stepErrors.issue_category = 'Service type is required'
    }

    if (stepNumber === 2) {
      if (formData.budget_min && formData.budget_max && formData.budget_max < formData.budget_min) {
        stepErrors.budget_max = 'Maximum budget must be greater than minimum'
      }
    }

    if (stepNumber === 3) {
      if (!formData.customer_consent_to_share_info) {
        stepErrors.customer_consent_to_share_info = 'You must consent to share information'
      }
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
      window.scrollTo(0, 0)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
    window.scrollTo(0, 0)
  }

  const handleSubmit = async () => {
    if (!validateStep(3)) return

    setLoading(true)
    try {
      const response = await fetch('/api/mechanic/rfq/create-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create RFQ')
      }

      const result = await response.json()
      router.push(`/mechanic/rfq/${result.rfq_id}/success`)
    } catch (error) {
      console.error('Submission error:', error)
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create RFQ' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <RfqGate fallback={<div className="p-8 text-center">RFQ marketplace is not available</div>}>
      <div className="min-h-screen bg-slate-950 text-white py-8">
        <div className="max-w-3xl mx-auto px-4">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      step >= i
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                    aria-label={`Step ${i}`}
                  >
                    {i}
                  </div>
                  {i < 3 && (
                    <div
                      className={`w-16 h-1 transition-colors ${
                        step > i ? 'bg-orange-500' : 'bg-slate-800'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-slate-400">
              <span className={step === 1 ? 'text-white font-semibold' : ''}>Vehicle & Issue</span>
              <span className={step === 2 ? 'text-white font-semibold' : ''}>Details</span>
              <span className={step === 3 ? 'text-white font-semibold' : ''}>Review</span>
            </div>
          </div>

          {/* Step 1: Vehicle & Issue */}
          {step === 1 && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Vehicle & Issue Information</h2>

              <div className="space-y-6">
                {/* Vehicle Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Vehicle Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="vehicle_year" className="block text-sm font-medium text-slate-300 mb-2">
                        Year <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="vehicle_year"
                        type="number"
                        value={formData.vehicle_year}
                        onChange={(e) => updateField('vehicle_year', parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        aria-required="true"
                      />
                    </div>

                    <div>
                      <label htmlFor="vehicle_make" className="block text-sm font-medium text-slate-300 mb-2">
                        Make <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="vehicle_make"
                        type="text"
                        value={formData.vehicle_make}
                        onChange={(e) => updateField('vehicle_make', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        aria-required="true"
                        aria-invalid={!!errors.vehicle_make}
                        aria-describedby={errors.vehicle_make ? 'vehicle_make-error' : undefined}
                      />
                      {errors.vehicle_make && (
                        <p id="vehicle_make-error" className="mt-1 text-sm text-red-400" role="alert">
                          {errors.vehicle_make}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="vehicle_model" className="block text-sm font-medium text-slate-300 mb-2">
                        Model <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="vehicle_model"
                        type="text"
                        value={formData.vehicle_model}
                        onChange={(e) => updateField('vehicle_model', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        aria-required="true"
                        aria-invalid={!!errors.vehicle_model}
                        aria-describedby={errors.vehicle_model ? 'vehicle_model-error' : undefined}
                      />
                      {errors.vehicle_model && (
                        <p id="vehicle_model-error" className="mt-1 text-sm text-red-400" role="alert">
                          {errors.vehicle_model}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="vehicle_mileage" className="block text-sm font-medium text-slate-300 mb-2">
                        Mileage (km) <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="vehicle_mileage"
                        type="number"
                        value={formData.vehicle_mileage}
                        onChange={(e) => updateField('vehicle_mileage', parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        aria-required="true"
                        aria-invalid={!!errors.vehicle_mileage}
                        aria-describedby={errors.vehicle_mileage ? 'vehicle_mileage-error' : undefined}
                      />
                      {errors.vehicle_mileage && (
                        <p id="vehicle_mileage-error" className="mt-1 text-sm text-red-400" role="alert">
                          {errors.vehicle_mileage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Issue Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Service Type <span className="text-red-400">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_CATEGORIES.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => updateField('issue_category', category)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          formData.issue_category === category
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                        }`}
                        aria-pressed={formData.issue_category === category}
                      >
                        {category.replace('_', '/')}
                      </button>
                    ))}
                  </div>
                  {errors.issue_category && (
                    <p className="mt-2 text-sm text-red-400" role="alert">{errors.issue_category}</p>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
                    Issue Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="e.g., Grinding noise when braking"
                    maxLength={200}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    aria-required="true"
                    aria-invalid={!!errors.title}
                    aria-describedby="title-hint title-error"
                  />
                  <p id="title-hint" className="mt-1 text-xs text-slate-400">
                    {formData.title?.length || 0} / 200 characters (minimum 10)
                  </p>
                  {errors.title && (
                    <p id="title-error" className="mt-1 text-sm text-red-400" role="alert">{errors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                    Detailed Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={6}
                    maxLength={2000}
                    placeholder="Describe the issue in detail..."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    aria-required="true"
                    aria-invalid={!!errors.description}
                    aria-describedby="description-hint description-error"
                  />
                  <p id="description-hint" className="mt-1 text-xs text-slate-400">
                    {formData.description?.length || 0} / 2000 characters (minimum 50)
                  </p>
                  {errors.description && (
                    <p id="description-error" className="mt-1 text-sm text-red-400" role="alert">{errors.description}</p>
                  )}
                </div>

                {/* Urgency */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Urgency <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {URGENCY_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => updateField('urgency', level)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          formData.urgency === level
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                        }`}
                        aria-pressed={formData.urgency === level}
                      >
                        <div className="text-sm font-semibold capitalize">{level}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                  Continue to Details →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Details & Budget */}
          {step === 2 && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Budget & Preferences</h2>

              <div className="space-y-6">
                {/* Budget Range */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Budget Range (Optional)</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Help workshops provide quotes within your budget
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="budget_min" className="block text-sm font-medium text-slate-300 mb-2">
                        Minimum Budget
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                        <input
                          id="budget_min"
                          type="number"
                          value={formData.budget_min || ''}
                          onChange={(e) => updateField('budget_min', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="budget_max" className="block text-sm font-medium text-slate-300 mb-2">
                        Maximum Budget
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                        <input
                          id="budget_max"
                          type="number"
                          value={formData.budget_max || ''}
                          onChange={(e) => updateField('budget_max', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="0.00"
                          aria-invalid={!!errors.budget_max}
                          aria-describedby={errors.budget_max ? 'budget_max-error' : undefined}
                        />
                      </div>
                      {errors.budget_max && (
                        <p id="budget_max-error" className="mt-1 text-sm text-red-400" role="alert">{errors.budget_max}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bidding Settings */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Bidding Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="bid_deadline_hours" className="block text-sm font-medium text-slate-300 mb-2">
                        Bid Deadline
                      </label>
                      <select
                        id="bid_deadline_hours"
                        value={formData.bid_deadline_hours}
                        onChange={(e) => updateField('bid_deadline_hours', parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value={24}>24 hours</option>
                        <option value={48}>48 hours</option>
                        <option value={72}>72 hours (3 days)</option>
                        <option value={120}>5 days</option>
                        <option value={168}>7 days (1 week)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="max_bids" className="block text-sm font-medium text-slate-300 mb-2">
                        Maximum Bids
                      </label>
                      <select
                        id="max_bids"
                        value={formData.max_bids}
                        onChange={(e) => updateField('max_bids', parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value={3}>3 bids</option>
                        <option value={5}>5 bids</option>
                        <option value={10}>10 bids</option>
                        <option value={15}>15 bids</option>
                        <option value={20}>20 bids</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                  Review RFQ →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-6">Review Your RFQ</h2>

                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-sm text-slate-500 uppercase mb-1">Vehicle</h3>
                    <p className="text-white font-medium">
                      {formData.vehicle_year} {formData.vehicle_make} {formData.vehicle_model}
                    </p>
                    <p className="text-sm text-slate-400">{formData.vehicle_mileage?.toLocaleString()} km</p>
                  </div>

                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-sm text-slate-500 uppercase mb-1">Issue</h3>
                    <p className="text-white font-semibold">{formData.title}</p>
                    <p className="text-sm text-slate-300 mt-2">{formData.description}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded">
                        {formData.issue_category}
                      </span>
                      <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded">
                        {formData.urgency}
                      </span>
                    </div>
                  </div>

                  {(formData.budget_min || formData.budget_max) && (
                    <div className="border-b border-slate-800 pb-4">
                      <h3 className="text-sm text-slate-500 uppercase mb-1">Budget</h3>
                      <p className="text-white font-semibold">
                        ${formData.budget_min || 0} - ${formData.budget_max || 'Any'}
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm text-slate-500 uppercase mb-1">Bidding</h3>
                    <p className="text-white">
                      Up to {formData.max_bids} bids • Closes in {formData.bid_deadline_hours} hours
                    </p>
                  </div>
                </div>
              </div>

              {/* Legal Consent */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <label className="flex items-start cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.customer_consent_to_share_info}
                    onChange={(e) => updateField('customer_consent_to_share_info', e.target.checked as any)}
                    className="w-5 h-5 mt-0.5 mr-4 bg-slate-800 border-2 border-slate-700 rounded checked:bg-orange-500 checked:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    aria-required="true"
                    aria-invalid={!!errors.customer_consent_to_share_info}
                    aria-describedby={errors.customer_consent_to_share_info ? 'consent-error' : undefined}
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium mb-2">
                      I consent to sharing my vehicle and issue information with workshops
                      <span className="text-red-400 ml-1">*</span>
                    </p>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Your vehicle details, issue description, city, and province will be shared with workshops who view your RFQ. This is required for PIPEDA compliance.
                    </p>
                  </div>
                </label>
                {errors.customer_consent_to_share_info && (
                  <p id="consent-error" className="mt-2 text-sm text-red-400" role="alert">
                    {errors.customer_consent_to_share_info}
                  </p>
                )}
              </div>

              {/* Referral Fee Disclosure */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-blue-400 mt-0.5 mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold mb-2">Referral Fee Disclosure</h4>
                    <p className="text-sm text-blue-200 leading-relaxed">
                      Your mechanic will earn a <strong>2% referral fee</strong> from the workshop you choose. This fee is already included in the quotes you receive and does not increase the price you pay.
                    </p>
                  </div>
                </div>
              </div>

              {errors.submit && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400" role="alert">{errors.submit}</p>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Posting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Post RFQ to Marketplace
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </RfqGate>
  )
}
