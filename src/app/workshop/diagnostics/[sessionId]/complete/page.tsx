'use client'

/**
 * Workshop Mechanic Diagnosis Completion
 *
 * Mechanic's interface to complete a diagnostic session
 * Key: Mechanics do NOT see pricing - they only provide technical diagnosis
 * The diagnosis is then sent to service advisor/admin who creates the quote
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle, Upload, X } from 'lucide-react'

interface DiagnosisForm {
  summary: string
  findings: string[]
  recommended_services: string[]
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  service_type: string
  notes_for_service_advisor: string
  photos: string[]
}

export default function WorkshopDiagnosticCompletePage() {
  const { sessionId } = useParams()
  const router = useRouter()

  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [diagnosis, setDiagnosis] = useState<DiagnosisForm>({
    summary: '',
    findings: [],
    recommended_services: [],
    urgency: 'medium',
    service_type: '',
    notes_for_service_advisor: '',
    photos: []
  })

  const [newFinding, setNewFinding] = useState('')
  const [newService, setNewService] = useState('')

  useEffect(() => {
    loadSession()
  }, [sessionId])

  async function loadSession() {
    try {
      const response = await fetch(`/api/workshop/diagnostics/${sessionId}`)
      if (!response.ok) throw new Error('Failed to load session')

      const data = await response.json()
      setSession(data)

      // Pre-fill if session has issue description
      if (data.issue_description) {
        setDiagnosis(prev => ({
          ...prev,
          summary: `Customer reported: ${data.issue_description}`
        }))
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function addFinding() {
    if (!newFinding.trim()) return

    setDiagnosis({
      ...diagnosis,
      findings: [...diagnosis.findings, newFinding.trim()]
    })
    setNewFinding('')
  }

  function removeFinding(index: number) {
    setDiagnosis({
      ...diagnosis,
      findings: diagnosis.findings.filter((_, i) => i !== index)
    })
  }

  function addRecommendedService() {
    if (!newService.trim()) return

    setDiagnosis({
      ...diagnosis,
      recommended_services: [...diagnosis.recommended_services, newService.trim()]
    })
    setNewService('')
  }

  function removeRecommendedService(index: number) {
    setDiagnosis({
      ...diagnosis,
      recommended_services: diagnosis.recommended_services.filter((_, i) => i !== index)
    })
  }

  async function submitDiagnosis() {
    // Validate
    if (!diagnosis.summary.trim()) {
      setError('Please provide a diagnosis summary')
      return
    }

    if (diagnosis.recommended_services.length === 0) {
      setError('Please add at least one recommended service')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/workshop/diagnostics/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagnosis)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit diagnosis')
      }

      // Success - redirect to dashboard with notification
      router.push('/workshop/dashboard?notification=diagnosis_submitted')
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Complete Diagnosis</h1>
      <p className="text-slate-400 mb-8">
        Document your technical findings. A service advisor will create the quote.
      </p>

      {/* Session Info */}
      <div className="mb-6 bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="font-semibold text-lg mb-3">Session Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Customer</p>
            <p className="font-semibold">{session?.customer_name}</p>
          </div>
          <div>
            <p className="text-slate-400">Vehicle</p>
            <p className="font-semibold">{session?.vehicle || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-slate-400">Session Type</p>
            <p className="font-semibold capitalize">{session?.session_type?.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-slate-400">Scheduled</p>
            <p className="font-semibold">
              {session?.scheduled_at ? new Date(session.scheduled_at).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>
        {session?.issue_description && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Customer's Issue Description:</p>
            <p className="text-slate-200">{session.issue_description}</p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {/* Diagnosis Form */}
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <label className="block mb-3">
            <span className="text-sm font-semibold text-slate-200">
              Diagnosis Summary <span className="text-red-400">*</span>
            </span>
            <p className="text-xs text-slate-400 mb-2">
              Summarize what's wrong with the vehicle in 2-3 sentences
            </p>
            <textarea
              value={diagnosis.summary}
              onChange={(e) => setDiagnosis({ ...diagnosis, summary: e.target.value })}
              className="w-full h-32 px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="e.g., Front brake pads are worn down to 2mm (below 3mm minimum). Rotors show light surface rust but are within spec. Brake fluid is dark, recommend flush."
            />
          </label>
        </div>

        {/* Detailed Findings */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="font-semibold mb-3">Detailed Findings</h3>
          <p className="text-sm text-slate-400 mb-4">
            Add specific findings from your inspection (optional but recommended)
          </p>

          <div className="space-y-2 mb-3">
            {diagnosis.findings.map((finding, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-slate-900 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="flex-1 text-sm">{finding}</p>
                <button
                  onClick={() => removeFinding(index)}
                  className="text-slate-400 hover:text-red-400 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newFinding}
              onChange={(e) => setNewFinding(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addFinding()}
              placeholder="e.g., Front left brake pad: 2mm remaining"
              className="flex-1 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={addFinding}
              className="px-6 py-2 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Add
            </button>
          </div>
        </div>

        {/* Recommended Services */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="font-semibold mb-3">
            Recommended Services <span className="text-red-400">*</span>
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            What work needs to be done? Service advisor will use this to create the quote.
          </p>

          <div className="space-y-2 mb-3">
            {diagnosis.recommended_services.map((service, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-slate-900 rounded-lg">
                <span className="text-orange-400 font-bold">{index + 1}.</span>
                <p className="flex-1 text-sm">{service}</p>
                <button
                  onClick={() => removeRecommendedService(index)}
                  className="text-slate-400 hover:text-red-400 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addRecommendedService()}
              placeholder="e.g., Front brake pad replacement"
              className="flex-1 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={addRecommendedService}
              className="px-6 py-2 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Add
            </button>
          </div>
        </div>

        {/* Urgency & Service Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Urgency */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <label className="block">
              <span className="text-sm font-semibold text-slate-200 mb-3 block">
                Urgency Level <span className="text-red-400">*</span>
              </span>
              <select
                value={diagnosis.urgency}
                onChange={(e) => setDiagnosis({ ...diagnosis, urgency: e.target.value as any })}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="low">Low - Can wait 2-4 weeks</option>
                <option value="medium">Medium - Address within 1-2 weeks</option>
                <option value="high">High - Address this week</option>
                <option value="urgent">Urgent - Unsafe to drive</option>
              </select>
            </label>
          </div>

          {/* Service Type */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <label className="block">
              <span className="text-sm font-semibold text-slate-200 mb-3 block">
                Service Category
              </span>
              <select
                value={diagnosis.service_type}
                onChange={(e) => setDiagnosis({ ...diagnosis, service_type: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select category...</option>
                <option value="brakes">Brakes</option>
                <option value="suspension">Suspension</option>
                <option value="engine">Engine</option>
                <option value="transmission">Transmission</option>
                <option value="electrical">Electrical</option>
                <option value="diagnostics">Diagnostics</option>
                <option value="oil_change">Oil Change</option>
                <option value="tire_rotation">Tire Rotation</option>
                <option value="air_filter">Air Filter</option>
                <option value="general">General Maintenance</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
        </div>

        {/* Notes for Service Advisor */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <label className="block">
            <span className="text-sm font-semibold text-slate-200 mb-2 block">
              Notes for Service Advisor
            </span>
            <p className="text-xs text-slate-400 mb-3">
              Any pricing considerations, part availability, or special notes to help with the quote
            </p>
            <textarea
              value={diagnosis.notes_for_service_advisor}
              onChange={(e) => setDiagnosis({ ...diagnosis, notes_for_service_advisor: e.target.value })}
              className="w-full h-24 px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="e.g., Customer mentioned tight budget. Standard pads should be fine. Parts in stock."
            />
          </label>
          <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-200">
              💡 The service advisor will use your diagnosis to create a detailed quote with pricing.
              You won't see the pricing - focus on the technical assessment.
            </p>
          </div>
        </div>

        {/* Photos */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="font-semibold mb-3">Diagnostic Photos</h3>
          <p className="text-sm text-slate-400 mb-4">
            Upload photos of the issue to help the service advisor and customer
          </p>
          <button className="px-6 py-3 bg-slate-700 rounded-lg font-semibold hover:bg-slate-600 transition flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Photos
          </button>
          {/* TODO: Implement file upload */}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={submitDiagnosis}
          disabled={submitting}
          className="flex-1 px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 rounded-xl font-semibold text-lg hover:from-green-500 hover:to-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Diagnosis to Service Advisor'}
        </button>
        <button
          onClick={() => router.push('/workshop/dashboard')}
          className="px-8 py-4 bg-slate-700 rounded-xl font-semibold hover:bg-slate-600 transition"
        >
          Cancel
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-slate-800 border border-slate-700 rounded-xl">
        <p className="text-sm text-slate-300">
          <strong>What happens next:</strong> Your diagnosis will be sent to a service advisor
          who will create a detailed quote with pricing and send it to the customer for approval.
        </p>
      </div>
    </div>
  )
}
