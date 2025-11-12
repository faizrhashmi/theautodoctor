/**
 * Edit Draft RFQ Page
 *
 * Allows customers to review and edit RFQ drafts created by mechanics
 *
 * @route /customer/rfq/drafts/[draftId]/edit
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Check, Loader2 } from 'lucide-react'

interface DraftRFQ {
  id: string
  title: string
  description: string
  issue_category: string
  urgency: string
  budget_min: number | null
  budget_max: number | null
  bid_deadline: string
  max_bids: number
  max_distance_km: number
  min_workshop_rating: number | null
  required_certifications: string[]
  customer_consent_to_share_info: boolean
  created_at: string
  mechanics: {
    id: string
    full_name: string
    rating: number | null
  } | null
  vehicles: {
    id: string
    year: number
    make: string
    model: string
    trim: string | null
    mileage: number | null
  } | null
}

const SERVICE_CATEGORIES = [
  'engine',
  'transmission',
  'brakes',
  'suspension',
  'electrical',
  'hvac',
  'exhaust',
  'body_glass',
  'routine_maintenance',
  'diagnostic',
  'other',
]

const URGENCY_LEVELS = ['routine', 'normal', 'urgent', 'emergency']

export default function EditDraftRFQPage() {
  const router = useRouter()
  const params = useParams()
  const draftId = params.draftId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftRFQ | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    issue_category: '',
    urgency: 'normal',
    budget_min: null as number | null,
    budget_max: null as number | null,
    customer_consent_to_share_info: false,
  })

  useEffect(() => {
    fetchDraft()
  }, [draftId])

  async function fetchDraft() {
    try {
      const response = await fetch(`/api/customer/rfq/drafts/${draftId}`)
      if (!response.ok) throw new Error('Failed to fetch draft')

      const data = await response.json()
      setDraft(data.draft)

      // Initialize form with draft data
      setFormData({
        title: data.draft.title,
        description: data.draft.description,
        issue_category: data.draft.issue_category,
        urgency: data.draft.urgency,
        budget_min: data.draft.budget_min,
        budget_max: data.draft.budget_max,
        customer_consent_to_share_info: data.draft.customer_consent_to_share_info || false,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load draft')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/customer/rfq/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save changes')
      }

      alert('Changes saved successfully!')
      router.push('/customer/rfq/drafts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  async function handleApprove() {
    if (!formData.customer_consent_to_share_info) {
      alert('You must consent to sharing information with workshops')
      return
    }

    if (!confirm('Approve this RFQ and publish it to the marketplace?')) {
      return
    }

    setApproving(true)
    setError(null)

    try {
      const response = await fetch(`/api/customer/rfq/drafts/${draftId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_consent: true,
          ...formData
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve RFQ')
      }

      const result = await response.json()
      alert('RFQ approved and published to marketplace!')
      router.push(`/customer/rfq/${result.rfq_id}/bids`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve RFQ')
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !draft) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <p className="text-red-400">{error}</p>
          </div>
          <Link href="/customer/rfq/drafts" className="inline-block mt-4 text-blue-400 hover:text-blue-300">
            ← Back to Drafts
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link href="/customer/rfq/drafts" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Drafts
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Edit Repair Request</h1>
          <p className="text-slate-400">Review and modify the details before publishing</p>
        </div>

        {/* Vehicle Info */}
        {draft?.vehicles && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-400 mb-1">Vehicle</p>
            <p className="text-white font-semibold">
              {draft.vehicles.year} {draft.vehicles.make} {draft.vehicles.model}
              {draft.vehicles.trim && ` ${draft.vehicles.trim}`}
            </p>
            {draft.vehicles.mileage && (
              <p className="text-sm text-slate-400">{draft.vehicles.mileage.toLocaleString()} km</p>
            )}
          </div>
        )}

        {/* Mechanic Info */}
        {draft?.mechanics && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {draft.mechanics.full_name.charAt(0)}
              </div>
              <div>
                <p className="text-sm text-blue-300">Prepared by your mechanic</p>
                <p className="text-white font-medium">{draft.mechanics.full_name}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Edit Form */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
                Issue Title <span className="text-red-400">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={200}
              />
              <p className="mt-1 text-xs text-slate-400">{formData.title.length} / 200 characters</p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                Detailed Description <span className="text-red-400">*</span>
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={2000}
              />
              <p className="mt-1 text-xs text-slate-400">{formData.description.length} / 2000 characters</p>
            </div>

            {/* Service Category */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Service Type <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setFormData({ ...formData, issue_category: category })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.issue_category === category
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {category.replace('_', '/')}
                  </button>
                ))}
              </div>
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
                    onClick={() => setFormData({ ...formData, urgency: level })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.urgency === level
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-sm font-semibold capitalize text-white">{level}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Budget Range (Optional)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="budget_min" className="block text-sm text-slate-400 mb-2">Minimum</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      id="budget_min"
                      type="number"
                      value={formData.budget_min ?? ''}
                      onChange={(e) => setFormData({ ...formData, budget_min: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="budget_max" className="block text-sm text-slate-400 mb-2">Maximum</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      id="budget_max"
                      type="number"
                      value={formData.budget_max ?? ''}
                      onChange={(e) => setFormData({ ...formData, budget_max: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full pl-8 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Consent */}
            <div className="border-t border-slate-700 pt-6">
              <label className="flex items-start cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.customer_consent_to_share_info}
                  onChange={(e) => setFormData({ ...formData, customer_consent_to_share_info: e.target.checked })}
                  className="w-5 h-5 mt-0.5 mr-4 bg-slate-800 border-2 border-slate-700 rounded checked:bg-blue-500 checked:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="flex-1">
                  <p className="text-white font-medium mb-1">
                    I consent to sharing my vehicle and issue information with workshops
                    <span className="text-red-400 ml-1">*</span>
                  </p>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Your vehicle details, issue description, city, and province will be shared with workshops who view your RFQ. Required for PIPEDA compliance.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Referral Fee Disclosure */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-white font-semibold mb-2">Referral Fee Disclosure</h4>
              <p className="text-sm text-blue-200 leading-relaxed">
                Your mechanic will earn a <strong>2% referral fee</strong> from the workshop you choose.
                This fee is already included in the quotes you receive and does not increase the price you pay.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handleSave}
            disabled={saving || approving}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>

          <button
            onClick={handleApprove}
            disabled={saving || approving || !formData.customer_consent_to_share_info}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {approving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                Approve & Publish
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
