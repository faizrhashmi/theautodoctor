import { ArrowRight, CalendarCheck, ClipboardList, FileText, MessageCircle, ShieldCheck, Wrench } from 'lucide-react'
import Link from 'next/link'

const STEPS = [
  {
    title: 'Tell us about your vehicle',
    description: 'Create an account, confirm you are 18+, and complete the quick intake with make, model, and symptoms.',
    icon: ClipboardList
  },
  {
    title: 'Secure your digital waiver',
    description: 'Review and e-sign the Professional Automotive Consultation Agreement to protect you and your mechanic.',
    icon: ShieldCheck
  },
  {
    title: 'Choose a time that works',
    description: 'Pick from available mechanic slots synced in real time with our availability dashboard.',
    icon: CalendarCheck
  },
  {
    title: 'Meet in the virtual service bay',
    description: 'Join the LiveKit-powered video room with timers, chat, and drag-drop file sharing.',
    icon: MessageCircle
  },
  {
    title: 'Capture diagnostics together',
    description: 'Follow guided camera angles, upload scan reports, and request session extensions if more time is needed.',
    icon: Wrench
  },
  {
    title: 'Get your summary & next steps',
    description: 'Receive a downloadable recap with repair recommendations, parts list, and follow-up instructions.',
    icon: FileText
  }
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="bg-orange-950/40">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
          <span className="rounded-full bg-orange-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-orange-200">
            How it works
          </span>
          <h1 className="mt-4 text-4xl font-bold">From intake to expert diagnosis in minutes</h1>
          <p className="mt-3 max-w-2xl text-sm text-orange-100">
            AskAutoDoctor combines secure authentication, digital waivers, and live collaboration so you can move from question to clarity without stepping into a shop.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="grid gap-6 md:grid-cols-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <article key={step.title} className="relative rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <span className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <Icon className="h-6 w-6 text-orange-300" />
                <h2 className="mt-4 text-xl font-semibold text-white">{step.title}</h2>
                <p className="mt-2 text-sm text-slate-300">{step.description}</p>
              </article>
            )
          })}
        </section>

        <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-br from-orange-900/70 to-slate-900/70 p-8 backdrop-blur">
          <h2 className="text-2xl font-bold text-white">Ready to see it in action?</h2>
          <p className="mt-2 text-sm text-orange-100">Hop into a session within minutes or explore the mechanic dashboard first.</p>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-orange-400"
            >
              Book a session
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/mechanic/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-orange-200/60 px-6 py-3 text-sm font-semibold text-orange-100 transition hover:border-orange-100 hover:text-white"
            >
              View mechanic tools
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
