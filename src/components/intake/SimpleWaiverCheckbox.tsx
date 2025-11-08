'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle, Loader2, Shield, ArrowDown } from 'lucide-react'

interface SimpleWaiverCheckboxProps {
  onSubmit: (signatureData: string, fullName: string) => Promise<void>
  fullName?: string
  email?: string
}

export default function SimpleWaiverCheckbox({
  onSubmit,
  fullName: initialFullName = '',
  email = '',
}: SimpleWaiverCheckboxProps) {
  const [agreed, setAgreed] = useState(false)
  const [fullName, setFullName] = useState(initialFullName)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)

  // Track scroll to enable checkbox
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget
    const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 10
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agreed) {
      setError('You must agree to the waiver to continue')
      return
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please enter your full name')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create a text-based signature instead of image
      // Backend accepts data:text/plain;base64,... format
      const timestamp = new Date().toISOString()
      const agreementText = `AGREED: ${fullName.trim()} agreed to the waiver terms on ${timestamp} for ${email}`
      const base64Text = btoa(agreementText)
      const signatureData = `data:text/plain;base64,${base64Text}`

      await onSubmit(signatureData, fullName.trim())
    } catch (err: any) {
      setError(err.message || 'Failed to submit waiver. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
          <Shield className="h-6 w-6 text-orange-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Safety Agreement</h2>
          <p className="text-sm text-slate-300">Quick review and confirmation</p>
        </div>
      </div>

      {/* Scroll Prompt (shown when not scrolled to bottom) */}
      {!hasScrolledToBottom && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-500/15 px-4 py-3 text-sm text-orange-100">
          <ArrowDown className="h-4 w-4 flex-shrink-0 animate-bounce" />
          <span>Please scroll through the entire waiver to continue</span>
        </div>
      )}

      {/* Waiver Content */}
      <div
        className="mb-6 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-300"
        onScroll={handleScroll}
      >
        <h3 className="mb-3 font-semibold text-white">Liability Waiver & Terms of Service</h3>

        <div className="space-y-3">
          <p>
            By using The Auto Doctor's services, you acknowledge and agree to the following:
          </p>

          <div>
            <h4 className="mb-1 font-semibold text-white">1. Service Nature</h4>
            <p className="text-xs">
              The Auto Doctor provides remote automotive diagnostic and advisory services. Our mechanics
              offer professional opinions and guidance based on visual inspections and information you provide.
            </p>
          </div>

          <div>
            <h4 className="mb-1 font-semibold text-white">2. No Hands-On Work</h4>
            <p className="text-xs">
              Our service is strictly consultative. We do not perform physical repairs or modifications
              to your vehicle. Any work performed on your vehicle is your responsibility.
            </p>
          </div>

          <div>
            <h4 className="mb-1 font-semibold text-white">3. Limitation of Liability</h4>
            <p className="text-xs">
              You agree to release, indemnify, and hold harmless The Auto Doctor, its mechanics, and
              affiliates from any claims, damages, or losses arising from:
            </p>
            <ul className="ml-4 mt-1 list-disc space-y-1 text-xs">
              <li>Actions you take based on our advice or recommendations</li>
              <li>Repairs or work performed by you or third parties</li>
              <li>Misdiagnosis or incomplete information provided during remote consultation</li>
              <li>Technical issues or service interruptions during video sessions</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-1 font-semibold text-white">4. Safety First</h4>
            <p className="text-xs">
              You are responsible for working safely on your vehicle. Always follow proper safety
              procedures, use appropriate tools, and seek professional in-person help for complex repairs.
            </p>
          </div>

          <div>
            <h4 className="mb-1 font-semibold text-white">5. Accuracy of Information</h4>
            <p className="text-xs">
              Our advice is based on the information and visual access you provide. Incomplete or
              inaccurate information may affect the quality of our recommendations.
            </p>
          </div>

          <div>
            <h4 className="mb-1 font-semibold text-white">6. No Warranty</h4>
            <p className="text-xs">
              The Auto Doctor makes no warranties or guarantees regarding outcomes. Remote diagnostics
              have inherent limitations compared to in-person inspections.
            </p>
          </div>

          <div>
            <h4 className="mb-1 font-semibold text-white">7. Emergency Situations</h4>
            <p className="text-xs">
              Our service is not intended for emergency situations. If you experience brake failure,
              steering issues, or other safety-critical problems, seek immediate professional assistance.
            </p>
          </div>
        </div>
      </div>

      {/* Agreement Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name Input */}
        <div className="space-y-2">
          <label htmlFor="fullName" className="block text-sm font-medium text-white">
            Full Name <span className="text-orange-400">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full legal name"
            required
            disabled={isSubmitting}
            className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-orange-400/70 focus:ring-2 focus:ring-orange-400/40 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Checkbox Agreement */}
        <div className={`rounded-xl border p-4 transition ${
          hasScrolledToBottom
            ? 'border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-red-500/10'
            : 'border-slate-600/30 bg-slate-800/20'
        }`}>
          <label className={`flex items-start gap-3 ${hasScrolledToBottom ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={isSubmitting || !hasScrolledToBottom}
              className="mt-1 h-5 w-5 cursor-pointer rounded border-white/20 bg-white/10 text-orange-500 transition focus:ring-2 focus:ring-orange-400/40 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className={`flex-1 text-sm transition ${hasScrolledToBottom ? 'text-white' : 'text-slate-400'}`}>
              I have read and agree to the liability waiver and terms of service. I understand that
              The Auto Doctor provides remote advisory services only and I am responsible for any work
              performed on my vehicle.
            </span>
          </label>

          {/* Hint when not yet scrolled */}
          {!hasScrolledToBottom && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Scroll through the waiver above to enable this checkbox</span>
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !agreed || !fullName.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-400 hover:to-orange-500 hover:shadow-xl hover:shadow-orange-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-orange-500 disabled:hover:to-orange-600"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              <span>I Agree - Continue</span>
            </>
          )}
        </button>

        {/* Helper Text */}
        <p className="text-center text-xs text-slate-400">
          By clicking "I Agree", you confirm that you have read and understood the waiver terms
        </p>
      </form>
    </div>
  )
}
