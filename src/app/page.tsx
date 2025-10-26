import Link from 'next/link'
import { CheckCircle2, Shield, Video, Clock, Zap, Star } from 'lucide-react'
import HeroSection from '@/components/home/HeroSection'

const SERVICES = [
  {
    name: 'Free Trial',
    price: '$0',
    duration: '5 min',
    description: '⚡ LIMITED TIME - Try before you buy',
    features: ['Quick text chat', 'Ask one question', 'No credit card needed'],
    gradient: 'from-green-500 to-emerald-600',
    icon: '🎁',
    badge: 'LIMITED TIME',
    special: true
  },
  {
    name: 'Quick Chat',
    price: '$9.99',
    duration: '30 min',
    description: 'Fast text consultation for quick questions',
    features: ['Text-based chat', 'Photo & video sharing', 'Instant answers'],
    gradient: 'from-orange-500 to-red-600',
    icon: '💬'
  },
  {
    name: 'Video Diagnostic',
    price: '$29.99',
    duration: '45 min',
    description: 'Live HD video session with mechanic',
    features: ['HD video call', 'Screen sharing', 'Session recording'],
    gradient: 'from-red-600 to-red-700',
    icon: '🎥',
    popular: true
  },
  {
    name: 'Complete Guidance',
    price: '$49.99',
    duration: '60 min',
    description: 'Expert analysis with actionable repair plan',
    features: ['Senior mechanic', 'Written report', 'Repair roadmap'],
    gradient: 'from-red-700 to-orange-800',
    icon: '🔧'
  }
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Book Your Session',
    description: 'Choose a plan and schedule a time that works for you. Upload photos or videos of your issue.',
    icon: Clock
  },
  {
    step: '02',
    title: 'Connect with Mechanic',
    description: 'Join a secure HD video or chat session with a Red Seal certified mechanic.',
    icon: Video
  },
  {
    step: '03',
    title: 'Get Expert Guidance',
    description: 'Receive professional diagnosis, repair recommendations, and a detailed action plan.',
    icon: CheckCircle2
  }
]

const BENEFITS = [
  {
    icon: Shield,
    title: 'Red Seal Certified',
    description: 'Every mechanic is Red Seal certified and background-verified'
  },
  {
    icon: Clock,
    title: 'Save Time & Money',
    description: 'No driving to shops, no waiting rooms, instant expert help'
  },
  {
    icon: Video,
    title: 'HD Video Sessions',
    description: 'Crystal-clear video quality with screen sharing capabilities'
  },
  {
    icon: Star,
    title: '100% Satisfaction',
    description: 'Not satisfied? Full refund guaranteed, no questions asked'
  }
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Limited Time Banner - Sticky */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 py-3 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-3 text-center">
            <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1">
              <Zap className="h-4 w-4 animate-pulse text-yellow-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">Limited Time</span>
            </div>
            <p className="text-sm font-semibold text-white sm:text-base">
              🎁 Get Your First Session <span className="text-yellow-300">100% FREE</span> - No Credit Card Required!
            </p>
            <Link
              href="/signup"
              className="hidden rounded-full bg-white px-4 py-1.5 text-xs font-bold text-green-600 transition hover:bg-gray-100 sm:block"
            >
              Claim Now →
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section - Full Width Background */}
      <HeroSection />

      {/* Services/Pricing Section */}
      <section className="relative py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Choose Your Service
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Transparent pricing. Expert mechanics. Instant help.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {SERVICES.map((service, index) => (
              <div
                key={index}
                className={`relative rounded-3xl border bg-white/5 p-8 backdrop-blur transition hover:bg-white/10 ${
                  service.special
                    ? 'border-green-500/70 shadow-xl shadow-green-500/30 ring-2 ring-green-500/30'
                    : service.popular
                    ? 'border-orange-500/50 shadow-lg shadow-orange-500/20'
                    : 'border-white/10'
                }`}
              >
                {service.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-1 text-xs font-bold text-white shadow-lg animate-pulse">
                    <Zap className="h-3 w-3" />
                    {service.badge}
                  </div>
                )}
                {service.popular && !service.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}
                <div className="text-center">
                  <div className="text-4xl">{service.icon}</div>
                  <h3 className="mt-4 text-xl font-bold text-white">{service.name}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-white">{service.price}</span>
                    <span className="text-slate-400"> / {service.duration}</span>
                  </div>
                  <p className="mt-4 text-sm text-slate-400">{service.description}</p>
                </div>

                <ul className="mt-6 space-y-3">
                  {service.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-orange-400" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`mt-8 block rounded-full bg-gradient-to-r ${service.gradient} px-6 py-3 text-center font-semibold text-white transition hover:shadow-lg`}
                >
                  Book Now
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-20 bg-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Get expert help in three simple steps
            </p>
          </div>

          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {HOW_IT_WORKS.map((item, index) => (
              <div key={index} className="relative text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600">
                  <item.icon className="h-10 w-10 text-white" />
                </div>
                <div className="absolute left-1/2 top-10 -translate-x-1/2 text-6xl font-bold text-orange-500/10">
                  {item.step}
                </div>
                <h3 className="relative z-10 mt-6 text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="relative py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Why Choose AskAutoDoctor
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:bg-white/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
                  <benefit.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-4 font-semibold text-white">{benefit.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-red-600/10 p-12 text-center backdrop-blur">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Ready to Get Started?
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              Join hundreds of satisfied customers getting expert auto help instantly
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-600 hover:to-red-700"
              >
                Start Free Trial
                <Zap className="h-5 w-5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/20 px-8 py-4 text-base font-semibold text-white backdrop-blur transition hover:border-orange-400/50 hover:bg-orange-500/10"
              >
                View All Plans
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
