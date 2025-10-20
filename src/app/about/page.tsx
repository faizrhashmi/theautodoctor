import Link from 'next/link'
import { CheckCircle2, Wrench, ShieldCheck, Clock, Video, BadgeCheck, Sparkles, Globe2, Users } from 'lucide-react'
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

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24 lg:py-28">
          <AnimatedHero>
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div className="space-y-6 text-center lg:text-left">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-700/30 px-4 py-2 text-blue-100">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  About Us
                </span>
                <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
                  AskAutoDoctor – Real Answers from Certified Mechanics
                </h1>
                <p className="text-base leading-relaxed text-blue-100 sm:text-lg">
                  We make professional automotive help accessible, affordable, and effortless—anytime, anywhere.
                </p>
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-start">
                  <Link
                    href="/start"
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    Get Help Now
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    View Pricing
                  </Link>
                </div>
              </div>
              <div className="relative hidden lg:block">
                <div className="absolute -inset-10 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-emerald-400/30 via-cyan-400/20 to-sky-400/10 blur-3xl" />
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur">
                  <ul className="space-y-3 text-blue-100">
                    {HELP_LIST.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
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

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid items-start gap-10 md:grid-cols-3">
          <div className="space-y-5 md:col-span-2">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">We’re Mechanics on a Mission</h2>
            <p className="text-slate-600">
              AskAutoDoctor was born from a simple truth: car owners deserve honest guidance before they spend thousands at a shop.
              Too many people get misled by upsells, confusing jargon, or bad advice online. We built a professional, on-demand way
              to talk to real certified mechanics—without the pressure of a sales counter.
            </p>
            <p className="text-slate-600">
              In minutes, you can show a mechanic what’s going on via live video, share photos, scan codes, and get a clear plan of action.
              We prepare you with knowledge before you walk into a repair shop so you stay in control of your budget and your safety.
            </p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-xl font-semibold text-slate-900">What You Can Expect:</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <Wrench className="h-5 w-5 text-blue-500" />
                  <span>Certified mechanics with dealership, OEM, and independent experience.</span>
                </li>
                <li className="flex gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-500" />
                  <span>Totally unbiased advice. We don’t sell repairs—we protect you from bad ones.</span>
                </li>
                <li className="flex gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span>Fast answers. Sessions can start within minutes, not days.</span>
                </li>
                <li className="flex gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                  <span>Plain-language explanations so you can make confident decisions.</span>
                </li>
              </ul>
            </div>
          </div>
          <aside className="space-y-4 rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Our Core Values</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Honesty & transparency at every step.
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Education before sales.
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Protecting drivers from overspending.
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Putting people ahead of profit.
              </li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              <Globe2 className="h-4 w-4" />
              Our Vision
            </div>
            <h3 className="text-2xl font-semibold text-slate-900">A Global Network of Certified Mechanics</h3>
            <p className="text-slate-700">
              Whether you’re at home, at a dealership, on the roadside, or in another country—your Auto Doctor is one click away.
              We’re redefining automotive service with transparency, technology, and trust.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-8">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5" />
              <p className="font-semibold text-slate-900">Community & Education</p>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              We treat every customer like family—educating drivers, protecting them from bad repairs, and helping them make smart decisions.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <h3 className="text-2xl font-semibold text-slate-900">What Makes Us Different</h3>
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-slate-200 p-6 shadow-sm">
              <Icon className="h-6 w-6 text-emerald-600" />
              <h4 className="mt-3 font-semibold text-slate-900">{title}</h4>
              <p className="mt-2 text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
          <div className="flex items-start gap-4">
            <ShieldCheck className="h-6 w-6 text-emerald-700" />
            <div>
              <h3 className="text-xl font-semibold text-emerald-900">Our Promise to Drivers</h3>
              <p className="mt-2 text-emerald-900/90">
                We will educate you, protect you from bad repairs, and help you make smart decisions. When you understand what your car needs, you’re always in control.
              </p>
              <p className="mt-3 font-medium text-emerald-900">No more guessing. No more fear. Just expert help when you need it.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 p-8 text-white shadow-lg">
          <div className="grid items-center gap-8 lg:grid-cols-3">
            <div className="space-y-2 lg:col-span-2">
              <h3 className="text-2xl font-semibold">The Future of Auto Care Starts Here</h3>
              <p className="text-white/90">
                AskAutoDoctor is more than a platform—it’s a movement. We are bringing trust back to the automotive industry with technology, transparency, and human expertise.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link
                href="/start"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-slate-100"
              >
                Start a Session
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-2xl border border-slate-200 p-6 text-sm text-slate-600">
          <p className="font-medium text-slate-800">Need alternate formats?</p>
          <p className="mt-1">
            Ask for a shorter summary, an SEO-optimized version, a storytelling / founder journey, or a Tailwind section-by-section layout.
          </p>
        </div>
      </section>
    </div>
  )
}
