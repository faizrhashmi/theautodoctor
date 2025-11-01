'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, FileText, MessageCircle, Building2, AlertCircle, CheckCircle } from 'lucide-react'
import { MECHANIC_FEES } from '@/config/mechanicPricing'

interface DiagnosticSession {
  id: string
  customer_id: string
  mechanic_id: string
  status: string
  escalated: boolean
  escalation_status: string | null
  diagnosis_summary: string
  recommended_services: string[]
  created_at: string
  completed_at: string
  session: {
    concern_summary: string
    vehicle: {
      year: number
      make: string
      model: string
      color: string
    }
  }
  customer: {
    full_name: string
  }
}

interface EscalationStatus {
  can_escalate: boolean
  already_escalated: boolean
  escalation?: any
  session_status?: string
  message?: string
}

export default function MechanicSessionCompletePage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [session, setSession] = useState<DiagnosticSession | null>(null)
  const [escalationStatus, setEscalationStatus] = useState<EscalationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [escalating, setEscalating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [mechanicNotes, setMechanicNotes] = useState('')

  useEffect(() => {
    loadSessionData()
  }, [sessionId])

  const loadSessionData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch diagnostic session details
      const sessionRes = await fetch(`/api/mechanic/sessions/${sessionId}`)
      if (!sessionRes.ok) {
        throw new Error('Failed to load session')
      }
      const sessionData = await sessionRes.json()
      setSession(sessionData)

      // Check escalation status
      const escalationRes = await fetch(`/api/mechanic/escalate-session?diagnostic_session_id=${sessionId}`)
      if (escalationRes.ok) {
        const escalationData = await escalationRes.json()
        setEscalationStatus(escalationData)
      }

    } catch (err: any) {
      console.error('Failed to load session:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEscalate = async () => {
    if (!session) return

    setEscalating(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/mechanic/escalate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnostic_session_id: session.id,
          urgency: urgency,
          priority: priority,
          mechanic_notes: mechanicNotes
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to escalate session')
      }

      setSuccess(data.message)

      // Reload escalation status
      await loadSessionData()

      // Clear notes
      setMechanicNotes('')

    } catch (err: any) {
      setError(err.message)
    } finally {
      setEscalating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-16 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="text-center text-slate-400">Loading session...</div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-16 sm:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-xl font-semibold text-white">Session not found</h2>
            <p className="mt-2 text-slate-400">{error || 'Unable to load session details'}</p>
            <Link href="/mechanic/dashboard" className="mt-6 inline-block rounded-full bg-orange-600 px-6 py-3 text-white hover:bg-orange-700">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const vehicleDisplay = `${session.session.vehicle.year} ${session.session.vehicle.make} ${session.session.vehicle.model}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-16 sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <Link href="/mechanic/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <header className="rounded-3xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-white">Session summary ready for delivery</h1>
          <p className="mt-2 text-sm text-slate-400">
            Wrap up by saving your notes, uploading attachments, and sending the recap to the customer.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-500">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-500/50 bg-green-500/10 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <p className="text-green-500">{success}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          {/* Session Summary */}
          <div className="rounded-3xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-white mb-6">Session Summary</h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-green-400 uppercase tracking-wide">Vehicle</label>
                <p className="mt-1 text-lg text-white">{vehicleDisplay}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-green-400 uppercase tracking-wide">Customer</label>
                <p className="mt-1 text-white">{session.customer.full_name}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-green-400 uppercase tracking-wide">Concern</label>
                <p className="mt-1 text-slate-300">{session.session.concern_summary}</p>
              </div>

              {session.diagnosis_summary && (
                <div>
                  <label className="text-sm font-semibold text-green-400 uppercase tracking-wide">Your Diagnosis</label>
                  <p className="mt-1 text-slate-300">{session.diagnosis_summary}</p>
                </div>
              )}

              {session.recommended_services && session.recommended_services.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-green-400 uppercase tracking-wide">Recommended Services</label>
                  <ul className="mt-2 space-y-1">
                    {session.recommended_services.map((service, idx) => (
                      <li key={idx} className="text-slate-300">• {service}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-green-400 uppercase tracking-wide">Status</label>
                <p className="mt-1 text-white capitalize">{session.status}</p>
              </div>
            </div>
          </div>

          {/* Actions Sidebar */}
          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-white">Mechanic checklist</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li className="flex gap-2">
                  <ClipboardList className="mt-0.5 h-4 w-4 text-orange-500" />
                  <span>Submit diagnosis summary and action plan.</span>
                </li>
                <li className="flex gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-green-500" />
                  <span>Upload any annotated photos or documents.</span>
                </li>
                <li className="flex gap-2">
                  <MessageCircle className="mt-0.5 h-4 w-4 text-purple-500" />
                  <span>Send follow-up message through platform chat.</span>
                </li>
              </ul>
            </section>

            {/* Escalation Section */}
            {escalationStatus?.already_escalated ? (
              <section className="rounded-3xl border border-green-500/50 bg-green-500/10 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h2 className="text-lg font-semibold text-white">Escalated to Workshop</h2>
                </div>
                <p className="text-sm text-slate-300">
                  This session has been escalated to a workshop. You'll receive a {MECHANIC_FEES.REFERRAL_FEE_PERCENT}% referral fee when the customer approves the repair quote.
                </p>
                {escalationStatus.escalation?.organizations && (
                  <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                    <p className="text-sm text-slate-400">Assigned to:</p>
                    <p className="font-semibold text-white">{escalationStatus.escalation.organizations.name}</p>
                    <p className="text-sm text-slate-400">{escalationStatus.escalation.organizations.city}</p>
                  </div>
                )}
              </section>
            ) : escalationStatus?.can_escalate ? (
              <section className="rounded-3xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-white">Escalate to Workshop</h2>
                </div>
                <p className="text-sm text-slate-300 mb-4">
                  Send this diagnostic to a workshop for repair quote creation. You'll earn a {MECHANIC_FEES.REFERRAL_FEE_PERCENT}% referral fee on approved repairs.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Urgency</label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as any)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Notes for Workshop (optional)</label>
                    <textarea
                      value={mechanicNotes}
                      onChange={(e) => setMechanicNotes(e.target.value)}
                      placeholder="Any additional notes for the workshop service advisor..."
                      rows={3}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <button
                    onClick={handleEscalate}
                    disabled={escalating}
                    className="w-full rounded-full bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {escalating ? 'Escalating...' : 'Escalate to Workshop'}
                  </button>
                </div>
              </section>
            ) : (
              <section className="rounded-3xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6 shadow-sm">
                <p className="text-sm text-slate-400">
                  {escalationStatus?.message || 'This session cannot be escalated at this time.'}
                </p>
              </section>
            )}

            <section className="rounded-3xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-white">Next actions</h2>
              <div className="mt-4 space-y-3">
                <button className="w-full rounded-full bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700">
                  Send summary to customer
                </button>
                <Link href="/mechanic/dashboard" className="block w-full rounded-full border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-slate-300 shadow-sm transition hover:border-orange-500 hover:text-orange-500">
                  Back to dashboard
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
