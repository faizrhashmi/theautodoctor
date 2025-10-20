import Link from 'next/link'
import { ArrowRight, CalendarClock, CheckCircle2, Shield, Wrench, Gauge, MessageSquare, Video, FileText, Users } from 'lucide-react'
import MechanicPresenceIndicator from '@/components/realtime/MechanicPresenceIndicator'

const SERVICE_PACKAGES = [
  {
    title: 'Rapid Video Diagnostics',
    price: '$49',
    duration: '30 minutes',
    description: 'Ideal for light diagnostics, maintenance questions, and quick inspections.',
    highlights: ['Live HD video call', 'Mechanic summary email', 'Follow-up chat access']
  },
  {
    title: 'Deep Dive Inspection',
    price: '$89',
    duration: '60 minutes',
    description: 'Perfect for complex issues, code scans, and pre-purchase checks.',
    highlights: ['Step-by-step repair plan', 'Parts and tool list', 'Priority booking']
  },
  {
    title: 'Shop Support Retainer',
    price: '$199',
    duration: 'Monthly',
    description: 'For independent shops needing expert backup on-demand.',
    highlights: ['Unlimited quick chats', 'Shared file vault', 'Dedicated mechanic team']
  }
]

const PROCESS_STEPS = [
  {
    title: 'Book & share vehicle details',
    description: 'Select a time, describe the issue, and upload any photos or diagnostics.',
    icon: CalendarClock
  },
  {
    title: 'Join the virtual service bay',
    description: 'Connect with a certified Red Seal mechanic inside our HD video workspace.',
    icon: Video
  },
  {
    title: 'Get actionable next steps',
    description: 'Receive a written summary, recommended repairs, and parts list in minutes.',
    icon: FileText
  }
]

const TRUST_POINTS = [
  { title: 'Red Seal Certified', description: 'All AskAutoDoctor mechanics are licensed across Canada.', icon: Shield },
  { title: 'Supabase Security', description: 'Secure login, file storage, and session management powered by Supabase.', icon: CheckCircle2 },
  { title: 'LiveKit HD Sessions', description: 'Crystal-clear video and audio with integrated timers and extensions.', icon: Video }
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.4),_transparent_60%)]" />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 py-24 sm:px-6 lg:px-8 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">
              <Shield className="h-4 w-4" /> Certified Virtual Garage
            </div>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">
              Precision automotive diagnostics
              <span className="block text-blue-300">without leaving your driveway</span>
            </h1>
            <p className="max-w-xl text-lg text-slate-300">
              Connect instantly with Red Seal mechanics for expert repair guidance, inspections, and troubleshooting. Each session includes a digital waiver, live session timer, and file sharing workspace.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-400"
              >
                Book your session
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-300/40 px-6 py-3 text-sm font-semibold text-blue-100 transition hover:border-blue-200 hover:text-white"
              >
                Explore the process
              </Link>
            </div>
            <MechanicPresenceIndicator
              variant="dark"
              className="max-w-fit"
              zeroText="Our mechanics are offline right now—leave your details and we'll notify you."
              loadingText="Checking which mechanics are live…"
            />
            <div className="grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-2xl font-bold text-white">500+</p>
                <p className="text-xs uppercase tracking-wide text-blue-200">Sessions completed</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-2xl font-bold text-white">4.9/5</p>
                <p className="text-xs uppercase tracking-wide text-blue-200">Average rating</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-2xl font-bold text-white">Ontario</p>
                <p className="text-xs uppercase tracking-wide text-blue-200">Province-wide coverage</p>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="relative rounded-3xl border border-blue-500/30 bg-white/5 p-6 shadow-2xl backdrop-blur">
              <div className="absolute -top-6 left-6 flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase text-emerald-100">
                <Gauge className="h-3.5 w-3.5" /> Live session workspace
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                  <p className="text-xs uppercase text-blue-200">Session timer</p>
                  <p className="text-2xl font-bold text-white">24:18</p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-3/4 rounded-full bg-blue-500" />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                  <p className="text-xs uppercase text-blue-200">Mechanic</p>
                  <p className="text-lg font-semibold text-white">Jamie Carter</p>
                  <p className="text-sm text-slate-300">Red Seal • Electrical specialist</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                  <p className="text-xs uppercase text-blue-200">Shared files</p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-300">
                    <li>• 2020_Audi_Q5_codes.png</li>
                    <li>• spark_plug_invoice.pdf</li>
                    <li>• idle_video.mov</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {TRUST_POINTS.map((point) => {
            const Icon = point.icon
            return (
              <div key={point.title} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-blue-400/40">
                <Icon className="h-8 w-8 text-blue-300" />
                <h3 className="mt-4 text-xl font-semibold text-white">{point.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{point.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-slate-950/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="rounded-full bg-blue-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">3 step workflow</span>
            <h2 className="mt-4 text-3xl font-bold">How AskAutoDoctor works</h2>
            <p className="mt-2 text-sm text-slate-300">Every session runs through our secure workspace for predictable, professional support.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PROCESS_STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="relative rounded-3xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur">
                  <span className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <Icon className="h-6 w-6 text-blue-300" />
                  <h3 className="mt-4 text-xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="rounded-full bg-blue-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">Services & pricing</span>
          <h2 className="mt-4 text-3xl font-bold">Choose the right support package</h2>
          <p className="mt-2 text-sm text-slate-300">Transparent pricing, session timers, and optional extensions billed automatically.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {SERVICE_PACKAGES.map((service) => (
            <div key={service.title} className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h3 className="text-xl font-semibold text-white">{service.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{service.description}</p>
              <div className="mt-6 text-3xl font-bold text-white">{service.price}</div>
              <p className="text-xs uppercase tracking-wide text-blue-200">{service.duration}</p>
              <ul className="mt-6 space-y-2 text-sm text-slate-300">
                {service.highlights.map((highlight) => (
                  <li key={highlight}>• {highlight}</li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                Book now
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-950/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[3fr,2fr]">
            <div>
              <span className="rounded-full bg-blue-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-blue-200">Built for professionals</span>
              <h2 className="mt-4 text-3xl font-bold">Mechanics dashboard & availability control</h2>
              <p className="mt-3 text-sm text-slate-300">
                Manage live queues, control availability, extend sessions with Stripe payments, and deliver polished summaries from a single pane of glass.
              </p>
              <ul className="mt-6 grid gap-4 text-sm text-slate-300 sm:grid-cols-2">
                <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Users className="h-5 w-5 text-blue-300" />
                  <p className="mt-2 font-semibold text-white">Session queue management</p>
                  <p>Prioritise waiting customers and launch the video workspace instantly.</p>
                </li>
                <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <MessageSquare className="h-5 w-5 text-blue-300" />
                  <p className="mt-2 font-semibold text-white">Floating support chat</p>
                  <p>Minimize, reopen, or close conversations without leaving the page.</p>
                </li>
                <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Wrench className="h-5 w-5 text-blue-300" />
                  <p className="mt-2 font-semibold text-white">File & waiver automation</p>
                  <p>Secure digital waivers and synced file sharing keep paperwork tidy.</p>
                </li>
                <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Gauge className="h-5 w-5 text-blue-300" />
                  <p className="mt-2 font-semibold text-white">Availability controls</p>
                  <p>Define weekly blocks and publish to the booking calendar in seconds.</p>
                </li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="rounded-2xl border border-blue-400/30 bg-slate-900/70 p-5">
                <p className="text-xs uppercase text-blue-200">Next in queue</p>
                <p className="text-lg font-semibold text-white">2020 Audi Q5 • Brandon L.</p>
                <p className="text-sm text-slate-300">Check engine light diagnostics • 10 mins until start</p>
                <div className="mt-4 flex items-center gap-3 text-sm text-slate-300">
                  <CalendarClock className="h-4 w-4 text-blue-300" /> 3:30 PM EST
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                <p className="text-xs uppercase text-blue-200">Availability snapshot</p>
                <p className="mt-2 text-sm text-slate-300">Mon • Wed • Fri • 9AM – 6PM</p>
                <p className="text-xs text-slate-400">Automatically syncs to Supabase calendars.</p>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                <p className="text-xs uppercase text-blue-200">Session extensions</p>
                <p className="mt-2 text-sm text-slate-300">Request additional time, approve, and charge through Stripe instantly.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Homepage footer removed to avoid reserving space; site footer rendered by layout component. */}
    </div>
  )
}
