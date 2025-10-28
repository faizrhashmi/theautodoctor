'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, CheckCircle2, ClipboardList, Wrench } from 'lucide-react'

type PlanId = 'free' | 'quick' | 'standard' | 'diagnostic' | 'chat10' | 'video15'

const PLAN_DETAILS: Record<
  PlanId,
  {
    label: string
    summary: string
    duration: string
    cta: string
  }
> = {
  free: {
    label: 'Free Session',
    summary: 'Sample the platform with a short text-only chat.',
    duration: 'Up to 5 minutes · Text chat',
    cta: 'Upgrade your plan',
  },
  quick: {
    label: 'Quick Chat',
    summary: 'Fast text triage when you need quick reassurance or a second opinion.',
    duration: '30 minute live chat',
    cta: 'Review chat instructions',
  },
  chat10: {
    label: 'Quick Chat',
    summary: 'Fast text triage when you need quick reassurance or a second opinion.',
    duration: '30 minute live chat',
    cta: 'Review chat instructions',
  },
  standard: {
    label: 'Standard Video',
    summary: 'Live HD video call with guided troubleshooting and screen sharing.',
    duration: '45 minute video session',
    cta: 'Prepare for the video call',
  },
  video15: {
    label: 'Standard Video',
    summary: 'Live HD video call with guided troubleshooting and screen sharing.',
    duration: '45 minute video session',
    cta: 'Prepare for the video call',
  },
  diagnostic: {
    label: 'Full Diagnostic',
    summary: 'Deep dive consultation with written summary and repair roadmap.',
    duration: '60 minute video deep dive',
    cta: 'See diagnostic checklist',
  },
}

type OnboardingFlowProps = {
  email: string
  initialPlan: string | null
  initialSlot: string | null
  initialFullName: string | null
  initialPhone: string | null
  initialVehicle: string | null
}

export default function OnboardingFlow({
  email,
  initialPlan,
  initialSlot,
  initialFullName,
  initialPhone,
  initialVehicle,
}: OnboardingFlowProps) {
  const [fullName, setFullName] = useState(initialFullName ?? '')
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [vehicle, setVehicle] = useState(initialVehicle ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const planDetails = useMemo(() => {
    if (initialPlan && initialPlan in PLAN_DETAILS) {
      const key = initialPlan as PlanId
      return PLAN_DETAILS[key]
    }
    return PLAN_DETAILS.free
  }, [initialPlan])

  const formattedSlot = useMemo(() => {
    if (!initialSlot) return null
    const value = new Date(initialSlot)
    if (Number.isNaN(value.getTime())) return null
    return value.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }, [initialSlot])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setSaveError(null)
    setSavedAt(null)

    try {
      const response = await fetch('/api/customer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          vehicle: vehicle.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const message =
          typeof data?.error === 'string'
            ? data.error
            : 'We could not save your info just now. Please try again.'
        throw new Error(message)
      }

      setSavedAt(new Date())
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Something went wrong while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-16 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 sm:px-8 lg:px-12">
        <header className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-orange-200">
            <Wrench className="h-3.5 w-3.5" />
            Finish onboarding
          </span>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Get ready for your session
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-red-600">
              Your mechanic is almost ready
            </span>
          </h1>
          <p className="max-w-3xl text-base text-orange-100/85 md:text-lg">
            Confirm your contact details, review your selected plan, and book a time slot. We use this info so the
            mechanic can prepare the right tools and resources before your session starts.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
              <header className="flex flex-col gap-2 border-b border-white/10 pb-6">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-orange-200/90">
                  <ClipboardList className="h-4 w-4" />
                  Step 1 · Contact details
                </div>
                <h2 className="text-2xl font-semibold text-white">Double-check how we reach you</h2>
                <p className="text-sm text-orange-100/75">
                  We will use these details to send confirmations, reminders, and follow-up notes after your session.
                </p>
              </header>

              <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white" htmlFor="full-name">
                    Full name
                  </label>
                  <input
                    id="full-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400/70 focus:ring-2 focus:ring-orange-400/40"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white" htmlFor="phone">
                    Phone number (optional)
                  </label>
                  <input
                    id="phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400/70 focus:ring-2 focus:ring-orange-400/40"
                  />
                  <p className="text-xs text-orange-100/60">
                    We only call if the mechanic needs clarification before your session begins.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white" htmlFor="vehicle">
                    Vehicle & notes (optional)
                  </label>
                  <textarea
                    id="vehicle"
                    value={vehicle}
                    onChange={(event) => setVehicle(event.target.value)}
                    placeholder="2018 Honda Civic · ABS light after brake job"
                    rows={3}
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-400/70 focus:ring-2 focus:ring-orange-400/40"
                  />
                  <p className="text-xs text-orange-100/60">
                    Give your mechanic a heads-up about the vehicle or issues you want to cover.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-600 hover:to-red-700 hover:shadow-xl hover:shadow-orange-500/40 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSaving ? 'Saving…' : 'Save details'}
                  </button>
                  <p className="text-xs text-orange-200/80">
                    Signed in as <span className="font-semibold">{email}</span>
                  </p>
                </div>

                {saveError && (
                  <div className="rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
                    {saveError}
                  </div>
                )}

                {savedAt && (
                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    <CheckCircle2 className="h-4 w-4" />
                    Details saved {savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. You’re good to
                    go.
                  </div>
                )}
              </form>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-orange-200/90">
                <CalendarClock className="h-4 w-4" />
                Step 2 · Schedule your session
              </div>
              <p className="mt-3 text-sm text-orange-100/75">
                Choose a time that works for you. We show real-time mechanic availability in the dashboard.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Link
                  href="/customer/dashboard"
                  className="rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-500/15 to-red-600/15 px-4 py-3 text-sm font-semibold text-white transition hover:border-orange-300 hover:bg-orange-500/25"
                >
                  Go to dashboard
                </Link>
                <Link
                  href="/customer/dashboard"
                  className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-orange-300 hover:bg-orange-500/15"
                >
                  Book a session
                </Link>
              </div>
              {formattedSlot && (
                <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  You last selected <span className="font-semibold">{formattedSlot}</span>. You can confirm or change this in
                  the dashboard.
                </p>
              )}
            </div>
          </section>

          <aside className="space-y-8">
            <div className="rounded-3xl border border-orange-400/30 bg-gradient-to-br from-orange-500/20 to-red-600/20 p-6 backdrop-blur">
              <header className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-orange-200/90">Your plan</span>
                <h2 className="text-xl font-semibold text-white">{planDetails.label}</h2>
              </header>
              <p className="mt-2 text-sm text-orange-100/80">{planDetails.summary}</p>
              <p className="mt-4 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-orange-200/90">
                {planDetails.duration}
              </p>
              <Link
                href="/customer/dashboard"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-200 transition hover:text-white"
              >
                {planDetails.cta}
              </Link>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h3 className="text-lg font-semibold text-white">What happens next?</h3>
              <ul className="mt-4 space-y-3 text-sm text-orange-100/80">
                <li>
                  <CheckCircle2 className="mr-2 inline h-4 w-4 text-orange-300" />
                  Mechanics review your notes and prep before the call.
                </li>
                <li>
                  <CheckCircle2 className="mr-2 inline h-4 w-4 text-orange-300" />
                  You’ll receive reminders 24h and 1h before the session.
                </li>
                <li>
                  <CheckCircle2 className="mr-2 inline h-4 w-4 text-orange-300" />
                  After the session, we send a written summary and next steps.
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
              <h3 className="text-lg font-semibold text-white">Need help?</h3>
              <p className="mt-2 text-sm text-orange-100/75">
                Email <a className="font-semibold text-orange-300 hover:text-orange-100" href="mailto:support@askautodoctor.com">support@askautodoctor.com</a> or
                message our team in the dashboard chat.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
