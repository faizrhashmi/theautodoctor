'use client'

/**
 * WaiverSigningForm - Customer signs waiver before joining scheduled session
 *
 * Features:
 * - Display full waiver text
 * - Signature pad or typed signature
 * - Agreement checkboxes
 * - Submit signature to API
 * - Redirect to session lobby after signing
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, AlertTriangle, Video, Wrench } from 'lucide-react'

interface WaiverSigningFormProps {
  sessionId: string
  mechanicName: string
  scheduledFor: Date
  sessionType: string
}

export default function WaiverSigningForm({
  sessionId,
  mechanicName,
  scheduledFor,
  sessionType
}: WaiverSigningFormProps) {
  const router = useRouter()
  const [signature, setSignature] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToLiability, setAgreedToLiability] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formattedDate = scheduledFor.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const formattedTime = scheduledFor.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  })

  const serviceTypeText = sessionType === 'video' ? 'Online Video Session' : 'In-Person Workshop Visit'
  const ServiceIcon = sessionType === 'video' ? Video : Wrench

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!signature.trim()) {
      setError('Please enter your full legal name')
      return
    }

    if (!agreedToTerms || !agreedToLiability) {
      setError('You must agree to all terms before proceeding')
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch(`/api/sessions/${sessionId}/sign-waiver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signature.trim(),
          signedAt: new Date().toISOString()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit waiver')
      }

      // Redirect to session lobby
      router.push(`/customer/sessions/${sessionId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to submit waiver. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-6 sm:py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/50 rounded-full mb-4">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <span className="text-sm font-medium text-orange-300">Waiver Signature Required</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Sign Waiver to Join Your Session
          </h1>
          <p className="text-slate-400">Please review and sign the waiver below to proceed</p>
        </div>

        {/* Session Info Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 sm:p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
              <ServiceIcon className="h-6 w-6 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Upcoming Session</p>
              <h3 className="text-lg font-bold text-white mb-2">{serviceTypeText}</h3>
              <div className="space-y-1 text-sm">
                <p className="text-slate-300">
                  <span className="text-slate-500">Mechanic:</span> {mechanicName}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-500">Date:</span> {formattedDate}
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-500">Time:</span> {formattedTime}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Waiver Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-6">
          {/* Waiver Text */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Session Waiver Agreement</h2>

            <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto text-sm text-slate-300 leading-relaxed space-y-4">
              <p>
                <strong className="text-white">1. Acknowledgment of Services</strong><br />
                I acknowledge that I am receiving automotive diagnostic and consultation services from TheAutoDoctor
                and its affiliated mechanics ("Service Provider"). I understand that these services may include
                {sessionType === 'video' ? ' remote video diagnostics, troubleshooting guidance, and repair recommendations.'
                  : ' in-person vehicle inspection, diagnostic testing, and hands-on mechanical services.'}
              </p>

              <p>
                <strong className="text-white">2. No Guarantees</strong><br />
                I understand that automotive diagnostics and repairs involve complex systems and that Service Provider
                cannot guarantee specific outcomes or results. I acknowledge that:
                - Diagnoses are based on available information and may require further investigation
                - Repairs may reveal additional issues not initially apparent
                - Vehicle performance depends on many factors outside the mechanic's control
              </p>

              <p>
                <strong className="text-white">3. Limitation of Liability</strong><br />
                I agree that Service Provider, its mechanics, employees, and affiliates shall not be liable for any
                indirect, incidental, special, or consequential damages arising from the services provided, including
                but not limited to vehicle damage, personal injury, lost time, or lost profits. The total liability
                shall not exceed the amount paid for the session.
              </p>

              <p>
                <strong className="text-white">4. Customer Responsibilities</strong><br />
                I agree to:
                - Provide accurate and complete information about my vehicle and its issues
                - Follow safety recommendations provided by the mechanic
                - Disclose any known hazards or safety concerns with the vehicle
                {sessionType === 'video'
                  ? '- Not perform any work beyond my skill level without proper guidance'
                  : '- Not interfere with the mechanic\'s work or access to the vehicle'}
              </p>

              <p>
                <strong className="text-white">5. Payment and Cancellation</strong><br />
                I acknowledge that I have reviewed and agree to the cancellation policy:
                - 24+ hours notice: Full refund (minus $5 processing fee)
                - 2-24 hours notice: 75% refund
                - Less than 2 hours notice or no-show: 50% account credit, 50% to mechanic
              </p>

              {sessionType === 'diagnostic' && (
                <p>
                  <strong className="text-white">6. In-Person Services Additional Terms</strong><br />
                  For in-person services, I acknowledge:
                  - I authorize the mechanic to operate my vehicle as necessary for diagnosis and repair
                  - I will not hold Service Provider liable for pre-existing damage discovered during service
                  - I understand that additional costs may apply for parts and extended labor
                </p>
              )}

              <p>
                <strong className="text-white">{sessionType === 'diagnostic' ? '7' : '6'}. Release of Claims</strong><br />
                I hereby release, waive, and forever discharge Service Provider from any and all claims, demands,
                damages, or causes of action arising out of or related to the automotive services provided, except
                in cases of gross negligence or willful misconduct.
              </p>

              <p>
                <strong className="text-white">{sessionType === 'diagnostic' ? '8' : '7'}. Governing Law</strong><br />
                This agreement shall be governed by the laws of the jurisdiction in which services are provided.
                Any disputes shall be resolved through binding arbitration.
              </p>
            </div>
          </div>

          {/* Agreement Checkboxes */}
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
                />
              </div>
              <span className="text-sm text-slate-300 group-hover:text-white transition">
                I have read and understand the terms of this waiver agreement. I agree to all terms and conditions stated above.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={agreedToLiability}
                  onChange={(e) => setAgreedToLiability(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
                />
              </div>
              <span className="text-sm text-slate-300 group-hover:text-white transition">
                I acknowledge and accept the limitation of liability and release of claims as described in this waiver.
              </span>
            </label>
          </div>

          {/* Signature Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Digital Signature (Type your full legal name)
            </label>
            <input
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="John Smith"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition font-serif text-lg"
              disabled={submitting}
            />
            <p className="text-xs text-slate-500">
              By typing your name above, you are providing a legal electronic signature
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !signature.trim() || !agreedToTerms || !agreedToLiability}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-orange-500/30 disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Submitting Waiver...</span>
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                <span>Sign Waiver & Continue to Session</span>
              </>
            )}
          </button>

          <p className="text-xs text-center text-slate-500">
            After signing, you'll be redirected to the session lobby
          </p>
        </form>
      </div>
    </div>
  )
}
