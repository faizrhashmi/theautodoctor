'use client'

import { useState } from 'react'
import { Check, FileSignature, ShieldCheck } from 'lucide-react'

const AGREEMENT_POINTS = [
  'Remote consultations provide advisory guidance and do not replace in-person inspections.',
  'Vehicle operation remains the responsibility of the vehicle owner.',
  'Sessions may be recorded for quality and training purposes.',
  'Any recommendations should be executed by certified technicians when physical repairs are required.'
]

export default function WaiverPage() {
  const [accepted, setAccepted] = useState(false)
  const [signature, setSignature] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submitWaiver = () => {
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-slate-900 px-4 py-16 text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
            <ShieldCheck className="h-4 w-4" /> Digital waiver
          </span>
          <h1 className="mt-4 text-4xl font-bold">Professional Automotive Consultation Agreement</h1>
          <p className="mt-3 text-sm text-blue-100">
            Please review the following terms before joining your live session. Signing electronically keeps both you and your mechanic covered.
          </p>
        </header>

        <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <h2 className="text-lg font-semibold text-blue-100">Terms of service</h2>
          <ul className="space-y-3 text-sm text-blue-50">
            {AGREEMENT_POINTS.map((point) => (
              <li key={point} className="flex gap-3">
                <Check className="mt-1 h-4 w-4 text-blue-300" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <h2 className="text-lg font-semibold text-blue-100">Sign & confirm</h2>
          <p className="mt-2 text-sm text-blue-100">
            By signing you acknowledge that you are 18+ and authorized to request automotive guidance for the listed vehicle.
          </p>

          <label className="mt-6 block text-sm text-blue-50">Full name (signature)</label>
          <input
            value={signature}
            onChange={(event) => setSignature(event.target.value)}
            placeholder="Type your full name"
            className="mt-2 w-full rounded-2xl border border-blue-300/40 bg-white/10 px-4 py-3 text-base text-white placeholder:text-blue-200 focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-200/40"
          />

          <label className="mt-6 flex items-center gap-3 text-sm text-blue-50">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="h-5 w-5 rounded border border-blue-300/40 bg-blue-900/40"
            />
            I agree to the Professional Automotive Consultation Agreement.
          </label>

          <button
            type="button"
            onClick={submitWaiver}
            disabled={!accepted || !signature}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/50"
          >
            <FileSignature className="h-4 w-4" />
            {submitted ? 'Waiver saved' : 'Sign agreement'}
          </button>
        </section>
      </div>
    </div>
  )
}
