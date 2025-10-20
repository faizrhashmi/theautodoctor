import Link from 'next/link'
import { CheckCircle2, Wrench, ShieldCheck, Clock, Video, BadgeCheck, Sparkles, Globe2 } from 'lucide-react'
import AnimatedHero from '@/components/about/AnimatedHero'

const FEATURES = [
  {
    icon: BadgeCheck,
    title: 'Certified & Verified Mechanics Only',
    desc: 'Every mechanic is vetted, experienced, and highly trained.',
  },
  {
    icon: Video,
    title: 'Live Video + Real Diagnostics',
    desc: 'Not just chat—show and see in real time within minutes.',
  },
  {
    icon: ShieldCheck,
    title: 'Honest Advice, No Upselling',
    desc: 'We don’t profit from repairs, so our guidance stays 100% unbiased.',
  },
  {
    icon: Sparkles,
    title: 'Clear, Simple Explanations',
    desc: 'We translate “mechanic language” into plain English.',
  },
  {
    icon: Clock,
    title: 'Fair & Transparent Pricing',
    desc: 'Flat fees. No hidden charges. No surprises.',
  },
]

const HELP_LIST = [
  'Real certified mechanics (not AI, not forums)',
  'Honest advice before you spend money',
  'Second opinions on shop estimates',
  'Help reading warning lights, sounds, leaks & codes',
  'Pre-purchase and remote vehicle inspections',
  'Guidance for DIY repairs or maintenance',
  'Support for ICE, Hybrid & EV vehicles',
]

const STORY_CALLOUTS = [
  {
    title: 'Our Story',
    description:
      'AskAutoDoctor was born from a simple truth: car owners deserve honest guidance before they spend thousands at a shop.',
  },
  {
    title: 'Our Team',
    description:
      'Certified mechanics with dealership, OEM, and independent experience collaborate to give you live, transparent answers.',
  },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_transparent_60%)]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <AnimatedHero>
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="space-y-6 text-center lg:text-left">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  About
                </span>
                <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
                  AskAutoDoctor – real answers from certified mechanics
                </h1>
                <p className="text-base leading-relaxed text-slate-200 sm:text-lg">
                  We make professional automotive help accessible, affordable, and effortless—anytime, anywhere.
                </p>
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-start">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    Get help now
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                  >
                    View pricing
                  </Link>
                </div>
              </div>
              <div className="relative hidden lg:block">
                <div className="absolute -inset-12 -z-10 rounded-[3rem] bg-gradient-to-tr from-emerald-400/20 via-cyan-400/10 to-sky-500/20 blur-3xl" />
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur">
                  <ul className="space-y-3 text-sm text-slate-100">
                    {HELP_LIST.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </AnimatedHero>
        </div>
      </section>

      <section className="border-y border-white/5 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-8">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-black/20">
                <h2 className="text-2xl font-semibold sm:text-3xl">Our mission</h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-200 sm:text-base">
                  We give drivers the confidence to make the right decisions before they spend thousands at a shop. No upsells, no scare tactics—just expert mechanics guiding you with clarity and care.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-slate-200 sm:text-base">
                  In minutes you can show a mechanic what’s going on via live video, share photos, scan codes, and leave with an action plan. We prepare you before you walk into a repair shop so you stay in control of your budget and your safety.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {STORY_CALLOUTS.map(({ title, description }) => (
                  <div
                    key={title}
                    className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-inner shadow-cyan-500/10"
                  >
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">{description}</p>
                  </div>
                ))}
                <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-inner shadow-emerald-500/10">
                  <h3 className="text-lg font-semibold text-white">How we help</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {HELP_LIST.slice(0, 4).map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 text-emerald-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <aside className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-black/20">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-emerald-200">
                Our values
              </div>
              <ul className="space-y-4 text-sm text-slate-100">
                <li className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Honesty & transparency at every step.
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Education before sales.
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Protecting drivers from overspending.
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Putting people ahead of profit.
                </li>
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 text-xs font-medium uppercase tracking-widest text-slate-200">
              <Globe2 className="h-4 w-4 text-cyan-300" />
              Our vision
            </div>
            <h3 className="text-2xl font-semibold sm:text-3xl">A global network of certified mechanics</h3>
            <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
              Whether you’re at home, at a dealership, on the roadside, or in another country—your Auto Doctor is one click away. We’re redefining automotive service with transparency, technology, and trust.
            </p>
            <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6">
              <h4 className="text-lg font-semibold text-white">Community & education</h4>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                We treat every customer like family—educating drivers, protecting them from bad repairs, and helping them make smart decisions.
              </p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-inner shadow-cyan-500/10"
              >
                <Icon className="h-6 w-6 text-emerald-400" />
                <h4 className="mt-4 text-base font-semibold text-white">{title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-sky-500/10">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-5">
              <h3 className="text-2xl font-semibold sm:text-3xl">How sessions work</h3>
              <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
                Every call happens inside our secure virtual service bay. Share videos, diagnostics, receipts, or anything your mechanic needs to see. Leave the session with notes, a repair roadmap, and the confidence to move forward.
              </p>
              <ul className="grid gap-4 sm:grid-cols-2">
                {HELP_LIST.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100">
                    <Wrench className="mt-0.5 h-5 w-5 text-cyan-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-8 text-left shadow-lg shadow-emerald-500/20">
              <div className="flex items-start gap-4">
                <ShieldCheck className="h-8 w-8 text-emerald-300" />
                <div>
                  <h4 className="text-xl font-semibold text-white">Our promise to drivers</h4>
                  <p className="mt-3 text-sm leading-relaxed text-emerald-100/90">
                    We educate you, protect you from bad repairs, and help you make smart decisions. When you understand what your car needs, you’re always in control.
                  </p>
                  <p className="mt-4 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">No fear. No guesswork.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 p-8 text-white shadow-2xl shadow-emerald-500/20">
          <div className="grid items-center gap-8 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              <h3 className="text-2xl font-semibold sm:text-3xl">The future of auto care starts here</h3>
              <p className="text-sm leading-relaxed text-white/90 sm:text-base">
                AskAutoDoctor is more than a platform—it’s a movement. We bring trust back to the automotive industry with technology, transparency, and human expertise.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-slate-100"
              >
                Start a session
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
          <p className="font-semibold text-white">Need alternate formats?</p>
          <p className="mt-2 text-slate-300">
            Ask for a shorter summary, an SEO-optimized version, a storytelling / founder journey, or a Tailwind section-by-section layout.
          </p>
        </div>
      </section>
    </main>
  )
}
