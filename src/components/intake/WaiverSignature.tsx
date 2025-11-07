// @ts-nocheck
'use client'

import { useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { FileSignature, Check, AlertCircle, Loader2 } from 'lucide-react'

interface WaiverSignatureProps {
  onSubmit: (signatureData: string, fullName: string) => Promise<void>
  fullName?: string
  email?: string
}

const WAIVER_VERSION = '1.0'
const LAST_UPDATED = 'October 23, 2025'

const WAIVER_TERMS = [
  {
    title: 'Remote Consultation Nature',
    content: 'I understand that AskAutoDoctor provides remote automotive consultations and advisory guidance. These consultations do not replace in-person vehicle inspections by certified technicians and are provided for informational purposes only.'
  },
  {
    title: 'Limitation of Liability',
    content: 'I acknowledge that AskAutoDoctor mechanics cannot physically inspect my vehicle and that any advice given is based solely on the information I provide. I agree that AskAutoDoctor and its mechanics are not liable for any damages, injuries, or losses resulting from actions taken based on remote consultation advice.'
  },
  {
    title: 'Vehicle Operation Responsibility',
    content: 'I understand that I am solely responsible for the operation and maintenance of my vehicle. Any recommendations provided during consultations should be verified and executed by certified automotive technicians when physical repairs or maintenance are required.'
  },
  {
    title: 'Recording and Privacy',
    content: 'I consent to the recording of consultation sessions for quality assurance, training purposes, and dispute resolution. I understand that my personal information will be handled in accordance with AskAutoDoctor\'s Privacy Policy.'
  },
  {
    title: 'Professional Recommendations',
    content: 'I acknowledge that mechanics may recommend seeking in-person professional services for complex issues. I agree to follow such recommendations and understand that remote consultations have limitations based on the nature of remote diagnostics.'
  },
  {
    title: 'Age and Authorization',
    content: 'I certify that I am at least 18 years of age and am the owner or authorized representative of the vehicle in question. I have the legal authority to request automotive guidance for this vehicle.'
  },
  {
    title: 'No Guarantee of Results',
    content: 'I understand that automotive diagnostics can be complex and that following advice does not guarantee specific outcomes. Multiple factors can affect vehicle performance and repair success.'
  }
]

export default function WaiverSignature({ onSubmit, fullName = '', email = '' }: WaiverSignatureProps) {
  const sigCanvasRef = useRef<SignatureCanvas>(null)
  const [name, setName] = useState(fullName)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const termsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check if terms are already at bottom (short content)
    const termsEl = termsRef.current
    if (termsEl && termsEl.scrollHeight <= termsEl.clientHeight + 50) {
      setScrolledToBottom(true)
    }
  }, [])

  const handleScroll = () => {
    const termsEl = termsRef.current
    if (!termsEl) return

    const isAtBottom = termsEl.scrollHeight - termsEl.scrollTop <= termsEl.clientHeight + 50
    if (isAtBottom) {
      setScrolledToBottom(true)
    }
  }

  const handleClear = () => {
    sigCanvasRef.current?.clear()
    setIsEmpty(true)
    setError(null)
  }

  const handleSignatureEnd = () => {
    setIsEmpty(sigCanvasRef.current?.isEmpty() ?? true)
  }

  const handleSubmit = async () => {
    setError(null)

    // Validation
    if (!name.trim()) {
      setError('Please enter your full name')
      return
    }

    if (!agreedToTerms) {
      setError('You must agree to the terms before signing')
      return
    }

    if (!scrolledToBottom) {
      setError('Please scroll through and read all the terms')
      return
    }

    if (isEmpty || sigCanvasRef.current?.isEmpty()) {
      setError('Please provide your signature')
      return
    }

    try {
      setIsSubmitting(true)
      const signatureData = sigCanvasRef.current?.toDataURL('image/png') || ''
      await onSubmit(signatureData, name.trim())
    } catch (err: any) {
      setError(err.message || 'Failed to submit waiver. Please try again.')
      setIsSubmitting(false)
    }
  }

  const canSubmit = !isEmpty && agreedToTerms && scrolledToBottom && name.trim() && !isSubmitting

  return (
    <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
      {/* Header - Mobile First */}
      <header className="text-center px-2">
        <div className="mx-auto mb-4 sm:mb-5 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/30 to-orange-600/20 shadow-lg">
          <FileSignature className="h-8 w-8 sm:h-10 sm:w-10 text-orange-400" />
        </div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl lg:text-5xl">Quick Safety Agreement</h1>
        <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto px-4">
          Before we connect you with a mechanic, we need your signature on this safety agreement. It's a standard formality to keep everyone protected.
        </p>
        <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 sm:px-4 py-1.5 sm:py-2">
          <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs sm:text-sm font-medium text-blue-300">Takes about 2 minutes</span>
        </div>
        <p className="mt-2 sm:mt-3 text-xs text-slate-400">
          Version {WAIVER_VERSION} • Last updated: {LAST_UPDATED}
        </p>
      </header>

      {/* Terms Section - Mobile First */}
      <section className="rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 sm:p-6 md:p-8 backdrop-blur-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-white">Terms of Service</h2>
          <span className="text-xs font-medium text-slate-400 bg-slate-700/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full whitespace-nowrap">
            7 key points
          </span>
        </div>

        <div
          ref={termsRef}
          onScroll={handleScroll}
          className="max-h-[28rem] sm:max-h-[32rem] space-y-4 sm:space-y-6 overflow-y-auto rounded-lg sm:rounded-xl border border-slate-700/50 bg-slate-900/80 p-4 sm:p-6 md:p-8 text-sm scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
        >
          {WAIVER_TERMS.map((term, idx) => (
            <div key={idx} className="space-y-2 sm:space-y-3 pb-4 sm:pb-6 border-b border-slate-700/50 last:border-0 last:pb-0">
              <h3 className="flex items-start gap-2 sm:gap-3 font-bold text-orange-300 text-sm sm:text-base">
                <span className="flex h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/30 to-orange-600/20 text-xs sm:text-sm font-bold shadow-md">
                  {idx + 1}
                </span>
                {term.title}
              </h3>
              <p className="pl-8 sm:pl-10 leading-relaxed text-slate-200 text-sm">{term.content}</p>
            </div>
          ))}

          <div className="mt-6 sm:mt-8 rounded-lg sm:rounded-xl border-2 border-orange-400/40 bg-gradient-to-br from-orange-500/20 to-orange-600/10 p-4 sm:p-6 shadow-lg">
            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-300 flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-bold text-orange-200 uppercase tracking-wide">Important Notice</p>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-orange-100/90">
              By signing this agreement, you acknowledge that you have read, understood, and agree to all terms and conditions stated above.
              You confirm that the information you provide is accurate and that you understand the limitations of remote automotive consultations.
            </p>
          </div>
        </div>

        {!scrolledToBottom && (
          <div className="mt-3 sm:mt-4 flex items-center gap-2 text-xs sm:text-sm text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded-lg p-2.5 sm:p-3">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse flex-shrink-0" />
            <span className="font-medium">Please scroll through all terms to continue</span>
          </div>
        )}
      </section>

      {/* Signature Section - Mobile First */}
      <section className="rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 sm:p-6 md:p-8 backdrop-blur-sm shadow-2xl">
        <h2 className="mb-4 sm:mb-6 text-lg sm:text-xl font-bold text-white">Your Signature</h2>

        <div className="space-y-4 sm:space-y-6">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2">
              Full Legal Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="mt-2 block w-full rounded-xl border-2 border-slate-700/50 bg-slate-900/80 px-5 py-3.5 text-white text-base placeholder:text-slate-500 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-400/20 transition-all"
              disabled={isSubmitting}
            />
            <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Please match your legal identification
            </p>
          </div>

          {/* Signature Canvas - Softer Colors */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-bold text-slate-200">
                Draw Your Signature <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleClear}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 text-sm font-semibold text-orange-400 transition hover:text-orange-300 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Clear
              </button>
            </div>
            <div className="relative rounded-xl border-2 border-dashed border-slate-600/50 bg-slate-800/60 p-2 sm:p-3 shadow-inner">
              <SignatureCanvas
                ref={sigCanvasRef}
                canvasProps={{
                  className: 'signature-canvas w-full h-36 sm:h-44 bg-slate-50 rounded-lg cursor-crosshair shadow-sm',
                  style: { touchAction: 'none' }
                }}
                onEnd={handleSignatureEnd}
              />
              {/* Signature line guide */}
              <div className="absolute bottom-[3.5rem] sm:bottom-[4.5rem] left-4 right-4 sm:left-8 sm:right-8 border-b border-dashed border-slate-300/40 pointer-events-none" />
            </div>
            <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Use your mouse, trackpad, or touch screen to sign
            </p>
          </div>

          {/* Agreement Checkbox - Mobile Optimized */}
          <label className="flex items-start gap-3 sm:gap-4 rounded-lg sm:rounded-xl border-2 border-slate-700/50 bg-slate-900/80 p-3 sm:p-4 md:p-5 text-xs sm:text-sm text-slate-200 transition hover:bg-slate-900 hover:border-orange-500/30 cursor-pointer group active:scale-[0.99]">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              disabled={isSubmitting}
              className="mt-0.5 sm:mt-1 h-5 w-5 flex-shrink-0 rounded-md border-slate-600 bg-slate-800 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="leading-relaxed">
              <span className="font-semibold text-white">I confirm that:</span> I am at least 18 years of age, I have read and understood all terms above,
              and I agree to this Safety Agreement.
              {email && <span className="block mt-2 text-xs text-slate-400 font-medium">Signing as: {email}</span>}
            </span>
          </label>

          {/* Error Message - Mobile Optimized */}
          {error && (
            <div className="flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border-2 border-rose-400/50 bg-rose-500/20 p-3 sm:p-4 text-xs sm:text-sm text-rose-200 shadow-lg">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Submit Button - Mobile Touch Optimized */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-6 py-4 sm:py-5 text-base sm:text-lg font-bold text-white shadow-2xl shadow-orange-500/30 transition-all hover:from-orange-400 hover:via-orange-500 hover:to-orange-600 hover:shadow-orange-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2 sm:gap-3">
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                <span className="hidden sm:inline">Submitting your signature...</span>
                <span className="sm:hidden">Submitting...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2 sm:gap-3">
                <Check className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="hidden sm:inline">Sign & Continue to Session</span>
                <span className="sm:hidden">Sign & Continue</span>
              </span>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Securely stored with timestamp for legal compliance</span>
          </div>
        </div>
      </section>
    </div>
  )
}
