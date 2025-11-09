'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, CheckCircle, AlertCircle, FileText, DollarSign } from 'lucide-react'

interface SessionData {
  id: string
  customer_id: string
  vehicle_id: string | null
  metadata?: any
}

interface EscalateToRfqModalProps {
  isOpen: boolean
  sessionData: SessionData
  onClose: () => void
  onSuccess?: (rfqId: string) => void
}

export function EscalateToRfqModal({
  isOpen,
  sessionData,
  onClose,
  onSuccess
}: EscalateToRfqModalProps) {
  const [loading, setLoading] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(true)
  const [existingRfq, setExistingRfq] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    recommended_services: '',
    issue_category: 'other' as 'engine' | 'brakes' | 'electrical' | 'suspension' | 'transmission' | 'other',
    urgency: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    budget_min: '',
    budget_max: '',
    bid_deadline_hours: '72' // Default: 72 hours
  })

  // Check if RFQ already exists for this session
  useEffect(() => {
    if (isOpen && sessionData.id) {
      checkExistingRfq()
    }
  }, [isOpen, sessionData.id])

  async function checkExistingRfq() {
    try {
      setCheckingExisting(true)
      const response = await fetch(`/api/sessions/${sessionData.id}/rfq-status`)

      if (response.ok) {
        const data = await response.json()
        if (data.has_rfq) {
          setExistingRfq(data.rfq)
        }
      }
    } catch (err) {
      console.error('Failed to check existing RFQ:', err)
    } finally {
      setCheckingExisting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = {
        diagnostic_session_id: sessionData.id,
        title: formData.title,
        description: formData.description,
        recommended_services: formData.recommended_services || undefined,
        issue_category: formData.issue_category,
        urgency: formData.urgency,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : undefined,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : undefined,
        bid_deadline_hours: formData.bid_deadline_hours ? parseInt(formData.bid_deadline_hours) : 72
      }

      const response = await fetch('/api/mechanic/rfq/create-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create RFQ')
      }

      setSuccess(true)

      if (onSuccess) {
        onSuccess(data.rfq_id)
      }

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 2000)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (!loading) {
      onClose()
      setError(null)
      setSuccess(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl">
          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={loading}
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20">
                <FileText className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Escalate to RFQ</h2>
                <p className="text-sm text-slate-400">Create a draft RFQ for customer approval</p>
              </div>
            </div>

            {/* Referral Commission Banner */}
            <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
              <div className="flex items-start gap-2">
                <DollarSign className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-300">Earn 2% Referral Commission</p>
                  <p className="text-xs text-green-400/80 mt-1">
                    When the customer accepts a workshop bid, you'll automatically earn 2% of the bid amount!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {checkingExisting && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          )}

          {/* Already Created Warning */}
          {!checkingExisting && existingRfq && (
            <div className="space-y-4">
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-300 mb-1">
                      RFQ Already Created
                    </p>
                    <p className="text-xs text-orange-400/80 mb-3">
                      You've already created an RFQ for this diagnostic session.
                    </p>
                    <div className="rounded-md bg-slate-800/50 p-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">RFQ Title:</span>
                        <span className="text-white font-medium">{existingRfq.title}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Status:</span>
                        <span className={`font-medium capitalize ${
                          existingRfq.rfq_status === 'draft' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {existingRfq.rfq_status === 'draft' ? 'Awaiting Customer Approval' : existingRfq.rfq_status}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Created:</span>
                        <span className="text-white">
                          {new Date(existingRfq.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => window.location.href = '/mechanic/referrals'}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Track in Referrals Dashboard
                </button>
                <button
                  onClick={handleClose}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Success State */}
          {!checkingExisting && !existingRfq && success && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                  <CheckCircle className="h-10 w-10 text-green-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Draft RFQ Created!</h3>
              <p className="text-sm text-slate-400">
                Customer has been notified to review and approve the RFQ.
                You'll earn 2% when they accept a bid!
              </p>
            </div>
          )}

          {/* Form */}
          {!checkingExisting && !existingRfq && !success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  RFQ Title *
                </label>
                <input
                  type="text"
                  required
                  minLength={10}
                  maxLength={100}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Brake Pad Replacement for 2020 Honda Civic"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">{formData.title.length}/100 characters</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Description *
                </label>
                <textarea
                  required
                  minLength={50}
                  maxLength={1000}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of the issue and what needs to be done..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  rows={5}
                />
                <p className="text-xs text-slate-500 mt-1">{formData.description.length}/1000 characters (min 50)</p>
              </div>

              {/* Recommended Services */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Recommended Services (Optional)
                </label>
                <textarea
                  value={formData.recommended_services}
                  onChange={(e) => setFormData({ ...formData, recommended_services: e.target.value })}
                  placeholder="List specific services you recommend..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  rows={3}
                />
              </div>

              {/* Category, Urgency, and Bid Deadline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Issue Category *
                  </label>
                  <select
                    required
                    value={formData.issue_category}
                    onChange={(e) => setFormData({ ...formData, issue_category: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="engine">Engine</option>
                    <option value="brakes">Brakes</option>
                    <option value="electrical">Electrical</option>
                    <option value="suspension">Suspension</option>
                    <option value="transmission">Transmission</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Urgency *
                  </label>
                  <select
                    required
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Bid Deadline */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Bid Deadline (Hours) *
                </label>
                <select
                  required
                  value={formData.bid_deadline_hours}
                  onChange={(e) => setFormData({ ...formData, bid_deadline_hours: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="24">24 hours (1 day)</option>
                  <option value="48">48 hours (2 days)</option>
                  <option value="72">72 hours (3 days) - Recommended</option>
                  <option value="96">96 hours (4 days)</option>
                  <option value="120">120 hours (5 days)</option>
                  <option value="168">168 hours (1 week)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  How long workshops have to submit bids before the RFQ expires
                </p>
              </div>

              {/* Budget Range */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Estimated Budget Range (Optional)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.budget_min}
                      onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                      placeholder="Min (e.g., 500)"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.budget_max}
                      onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                      placeholder="Max (e.g., 1000)"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-slate-700 px-4 py-3 font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Draft RFQ'
                  )}
                </button>
              </div>

              {/* Info Note */}
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                <p className="text-xs text-blue-300">
                  This RFQ will be saved as a draft. The customer will receive a notification to review
                  and approve it before it's published to the workshop marketplace.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
