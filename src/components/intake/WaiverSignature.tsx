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
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <header className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/20">
          <FileSignature className="h-8 w-8 text-orange-400" />
        </div>
        <h1 className="text-3xl font-bold text-white md:text-4xl">Professional Automotive Consultation Agreement</h1>
        <p className="mt-3 text-sm text-slate-300">
          Version {WAIVER_VERSION} • Last updated: {LAST_UPDATED}
        </p>
        <p className="mt-2 text-sm text-orange-100">
          Please review the following terms before joining your live session. Your electronic signature confirms your understanding and agreement.
        </p>
      </header>

      {/* Terms Section */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="mb-4 text-lg font-semibold text-white">Terms of Service</h2>

        <div
          ref={termsRef}
          onScroll={handleScroll}
          className="max-h-96 space-y-4 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-200"
        >
          {WAIVER_TERMS.map((term, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="flex items-start gap-2 font-semibold text-orange-200">
                <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-xs">
                  {idx + 1}
                </span>
                {term.title}
              </h3>
              <p className="pl-7 leading-relaxed text-slate-300">{term.content}</p>
            </div>
          ))}

          <div className="mt-6 rounded-lg border border-orange-400/30 bg-orange-500/10 p-4">
            <p className="text-xs font-semibold text-orange-200">IMPORTANT NOTICE</p>
            <p className="mt-2 text-xs leading-relaxed text-orange-100">
              By signing this agreement, you acknowledge that you have read, understood, and agree to all terms and conditions stated above.
              You confirm that the information you provide is accurate and that you understand the limitations of remote automotive consultations.
            </p>
          </div>
        </div>

        {!scrolledToBottom && (
          <div className="mt-3 flex items-center gap-2 text-xs text-orange-300">
            <AlertCircle className="h-4 w-4" />
            <span>Please scroll through all terms to continue</span>
          </div>
        )}
      </section>

      {/* Signature Section */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="mb-4 text-lg font-semibold text-white">Sign & Confirm</h2>

        <div className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-200">
              Full Legal Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full legal name"
              className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-slate-400">This should match your legal identification</p>
          </div>

          {/* Signature Canvas */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-200">
                Digital Signature <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleClear}
                disabled={isSubmitting}
                className="text-xs font-semibold text-orange-400 transition hover:text-orange-300 disabled:opacity-50"
              >
                Clear signature
              </button>
            </div>
            <div className="mt-2 rounded-xl border-2 border-dashed border-white/20 bg-slate-900/60 p-2">
              <SignatureCanvas
                ref={sigCanvasRef}
                canvasProps={{
                  className: 'signature-canvas w-full h-40 bg-white rounded-lg cursor-crosshair',
                  style: { touchAction: 'none' }
                }}
                onEnd={handleSignatureEnd}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Sign above using your mouse or touchscreen
            </p>
          </div>

          {/* Agreement Checkbox */}
          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200 transition hover:bg-slate-950/60">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              disabled={isSubmitting}
              className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0"
            />
            <span>
              I certify that I am at least 18 years of age, I have read and understood all terms above,
              and I agree to the Professional Automotive Consultation Agreement.
              {email && <span className="block mt-1 text-xs text-slate-400">Signing as: {email}</span>}
            </span>
          </label>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-400/50 bg-rose-500/10 p-4 text-sm text-rose-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:from-orange-400 hover:via-orange-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting signature...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Check className="h-5 w-5" />
                Submit signature & continue
              </span>
            )}
          </button>

          <p className="text-center text-xs text-slate-400">
            Your signature will be securely stored and timestamped for legal compliance
          </p>
        </div>
      </section>
    </div>
  )
}
