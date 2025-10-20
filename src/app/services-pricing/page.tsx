import Link from 'next/link'
import { ArrowRight, CheckCircle2, FileText, Gauge, MessageCircle, Timer } from 'lucide-react'

const OFFERINGS = [
  {
    name: 'Free Session',
    price: '$0',
    duration: 'Up to 5 minutes',
    description: 'Sample AskAutoDoctor with a short text-only conversation.',
    features: ['Chat with a certified mechanic', 'Share one photo or video clip', 'Quick go/no-go advice']
  },
  {
    name: 'Quick Chat',
    price: '$9.99',
    duration: '30 minutes',
    description: 'Fast text triage when you need reassurance or a second opinion.',
    features: ['Private text workspace', 'Send photos, videos, and scan data', 'Action plan before chat ends']
  },
  {
    name: 'Standard Video',
    price: '$29.99',
    duration: '45 minutes',
    description: 'Live video session to troubleshoot, inspect, and plan next steps.',
    features: ['HD video & screen sharing', 'Guided inspections & documentation', 'Session recording link']
  },
  {
    name: 'Full Diagnostic',
    price: '$49.99',
    duration: '60 minutes',
    description: 'Deep dive consultation with written summary and repair roadmap.',
    features: ['Senior mechanic lead', 'Multiple issues covered in one call', 'Detailed follow-up report']
  }
]

const VALUE_ADDS = [
  {
    title: 'Integrated session timer',
    description: 'Real-time countdown with warnings at 5 minutes and 60 seconds remaining.',
    icon: Timer
  },
  {
    title: 'Secure file sharing',
    description: 'Drag-and-drop documents, diagnostics, and receipts to a shared vault.',
    icon: FileText
  },
  {
    title: 'Pro-grade messaging',
    description: 'Floating chat bubble follows you across pages with minimize/close controls.',
    icon: MessageCircle
  },
  {
    title: 'Mechanic availability tools',
    description: 'Set weekly blocks, pause specific days, and sync with bookings instantly.',
    icon: Gauge
  },
  {
    title: 'Session extensions',
    description: 'Approve paid time extensions mid-call and charge through Stripe.',
    icon: CheckCircle2
  }
]

export default function ServicesPricingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Services & pricing</p>
          <h1 className="mt-4 text-4xl font-bold">Professional help for every automotive scenario</h1>
          <p className="mt-3 max-w-2xl text-sm text-blue-100">
            All packages include digital waivers, real-time collaboration, and secure file sharing. Extend sessions on demand with one-click payments.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {OFFERINGS.map((offering) => (
            <article key={offering.name} className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <h2 className="text-xl font-semibold text-white">{offering.name}</h2>
              <p className="mt-2 text-sm text-slate-300">{offering.description}</p>
              <div className="mt-6 text-3xl font-bold text-white">{offering.price}</div>
              <p className="text-xs uppercase tracking-wide text-blue-200">{offering.duration}</p>
              <ul className="mt-6 space-y-2 text-sm text-slate-300">
                {offering.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                Book now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-16 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <h2 className="text-2xl font-bold text-white">What makes AskAutoDoctor sessions different?</h2>
          <p className="mt-2 text-sm text-slate-300">We built a digital service bay that mirrors the tools and trust of an in-person shop.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {VALUE_ADDS.map((value) => {
              const Icon = value.icon
              return (
                <div key={value.title} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
                  <Icon className="h-6 w-6 text-blue-300" />
                  <h3 className="mt-4 text-lg font-semibold text-white">{value.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{value.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-900/80 to-slate-900/80 p-8 backdrop-blur">
          <h2 className="text-2xl font-bold text-white">Need on-going shop support?</h2>
          <p className="mt-2 text-sm text-blue-100">We partner with independent mechanics and dealership teams for remote diagnostic coverage.</p>
          <Link
            href="/book"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-blue-200/60 px-5 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-100 hover:text-white"
          >
            Schedule a discovery call
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    </div>
  )
}
