import { ArrowRight, ClipboardList, FileText, MessageCircle, ShieldCheck, Wrench, Zap, DollarSign, Users, CheckCircle, Video, Camera, Clock, Star, Package, MessageSquare } from 'lucide-react'
import Link from 'next/link'

const STEPS = [
  {
    title: 'Sign up & accept waiver',
    description: 'Create your account in 30 seconds. Confirm you\'re 18+ and digitally sign our Professional Automotive Consultation Agreement—protecting both you and our certified mechanics.',
    icon: ShieldCheck,
    highlight: '30 seconds',
    highlightColor: 'text-emerald-400'
  },
  {
    title: 'Choose your session type',
    description: 'Select Quick Chat (30 min, $9.99), Standard Video (45 min, $29.99), or Full Diagnostic (60 min, $49.99). Business customers can use subscription credits. Start instantly—no scheduling required.',
    icon: ClipboardList,
    highlight: 'Instant start',
    highlightColor: 'text-orange-400'
  },
  {
    title: 'Share vehicle details',
    description: 'Tell us about your vehicle (VIN or Year/Make/Model) and describe the issue in detail. Upload photos or scan reports if you have them. Optionally request your favorite mechanic.',
    icon: Camera,
    highlight: '2-3 minutes',
    highlightColor: 'text-blue-400'
  },
  {
    title: 'Connect with a mechanic',
    description: 'Your request is instantly broadcast to all available certified mechanics. The first available expert joins your session—usually within 2-5 minutes. No appointments, no waiting days.',
    icon: Zap,
    highlight: '2-5 min wait',
    highlightColor: 'text-yellow-400'
  },
  {
    title: 'Live video diagnostic',
    description: 'Show your mechanic the problem via HD video. Collaborate in real-time with built-in chat, screen sharing, and file uploads. Need more time? Extend your session with one click.',
    icon: Video,
    highlight: 'HD video + chat',
    highlightColor: 'text-purple-400'
  },
  {
    title: 'Receive professional quote',
    description: 'After your session, get a detailed repair quote with itemized parts and labor costs. Review, accept, or post an RFQ to get competitive bids from multiple workshops.',
    icon: FileText,
    highlight: 'Within 24 hours',
    highlightColor: 'text-teal-400'
  }
]

const FEATURES = [
  {
    icon: Clock,
    title: 'No Appointments Needed',
    description: 'Start a session instantly, whenever you need help. Our certified mechanics are available 7 days a week—no scheduling, no waiting days for an appointment slot.'
  },
  {
    icon: Star,
    title: 'Certified Experts Only',
    description: 'Every mechanic is fully certified with verified credentials displayed on their profile. Many hold Red Seal certification and brand-specific specializations.'
  },
  {
    icon: DollarSign,
    title: 'Transparent Pricing',
    description: 'See exact costs upfront before you start. Choose Quick Chat ($9.99), Standard Video ($29.99), or Full Diagnostic ($49.99). Business subscriptions offer credit packages with discounts.'
  },
  {
    icon: Users,
    title: 'RFQ Marketplace',
    description: 'Need quotes from multiple shops? Post a Request for Quote (RFQ) and receive competitive bids from verified workshops in your area—completely free.'
  },
  {
    icon: MessageSquare,
    title: 'Real-Time Collaboration',
    description: 'HD video streaming, live text chat, screen sharing, and drag-and-drop file uploads. Share scan reports, photos, or diagnostic codes instantly during your session.'
  },
  {
    icon: Package,
    title: 'Detailed Documentation',
    description: 'Get a complete session summary with mechanic notes, recommended repairs, parts lists, and estimated costs. Download and share with your local shop or DIY.'
  }
]

const PRICING = [
  {
    name: 'Quick Chat',
    duration: '30 minutes',
    price: '$9.99',
    description: 'Fast triage over private chat with a certified mechanic',
    features: ['Direct chat for photos, videos, and codes', 'Action plan delivered before chat ends', 'Great for warning lights or quick questions']
  },
  {
    name: 'Standard Video',
    duration: '45 minutes',
    price: '$29.99',
    description: 'Most popular - Live video consultation to walk through complex issues',
    features: ['HD video with screen sharing', 'Step-by-step troubleshooting', 'Recording link after the call', 'Perfect for noises, leaks, or guided inspections'],
    popular: true
  },
  {
    name: 'Full Diagnostic',
    duration: '60 minutes',
    price: '$49.99',
    description: 'Comprehensive video session with written diagnostic report',
    features: ['Advanced testing walkthroughs', 'Multi-system coverage in one call', 'Summary email with repair roadmap', 'Best for recurring issues or pre-purchase inspections']
  }
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-block rounded-full bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-300 border border-orange-500/20">
              How it works
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Get expert help in <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">minutes</span>, not days
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-slate-300">
              No appointments. No waiting rooms. Just instant access to certified mechanics via HD video, live chat, and real-time collaboration.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:from-orange-600 hover:to-red-700 hover:shadow-xl"
              >
                Start your first session
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-slate-600 px-8 py-4 text-base font-semibold text-slate-200 transition hover:border-orange-500 hover:text-white"
              >
                View pricing
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-24">
        {/* Step-by-Step Process */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">The complete process</h2>
            <p className="mt-3 text-lg text-slate-400">From signup to repair quote in 6 simple steps</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <article key={step.title} className="relative rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur transition hover:border-orange-500/50 hover:bg-slate-800/70">
                  <div className="flex items-start gap-4">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-lg font-bold text-white shadow-lg">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-5 w-5 text-orange-400" />
                        <span className={`text-xs font-semibold ${step.highlightColor}`}>
                          {step.highlight}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                      <p className="text-sm text-slate-300 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* Key Features */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Why customers choose us</h2>
            <p className="mt-3 text-lg text-slate-400">Everything you need for professional automotive diagnostics</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="rounded-2xl border border-slate-700 bg-slate-800/30 p-6 backdrop-blur transition hover:border-orange-500/30">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 mb-4">
                    <Icon className="h-6 w-6 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Pricing Overview */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Simple, transparent pricing</h2>
            <p className="mt-3 text-lg text-slate-400">Choose the session length that fits your needs</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border-2 p-6 backdrop-blur transition ${
                  plan.popular
                    ? 'border-orange-500 bg-gradient-to-br from-orange-500/10 to-red-500/5 shadow-xl'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-4 py-1 text-xs font-semibold text-white shadow-lg">
                    Most Popular
                  </span>
                )}
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{plan.duration}</p>
                  <p className="text-4xl font-bold text-orange-400 mt-4">{plan.price}</p>
                </div>
                <p className="text-sm text-slate-300 text-center mb-6 min-h-[3rem]">{plan.description}</p>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-5 w-5 text-orange-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-slate-400 mt-8">
            💼 <span className="font-semibold text-white">Business customers:</span> Get subscription plans with credit packages and volume discounts.{' '}
            <Link href="/contact" className="text-orange-400 hover:text-orange-300 underline">
              Contact us
            </Link>
          </p>
        </section>

        {/* CTA Section */}
        <section className="rounded-3xl border-2 border-orange-500/30 bg-gradient-to-br from-orange-900/30 to-slate-900/30 p-8 sm:p-12 backdrop-blur text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            Join thousands of customers who trust AskAutoDoctor for fast, reliable automotive diagnostics. Sign up free and connect with a certified mechanic in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:from-orange-600 hover:to-red-700 hover:shadow-xl"
            >
              Create free account
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/customer/rfq/create"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-slate-600 px-8 py-4 text-base font-semibold text-slate-200 transition hover:border-orange-500 hover:text-white"
            >
              <Users className="h-5 w-5" />
              Or post an RFQ for free
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-400">
            No credit card required • Cancel anytime • 100% satisfaction guaranteed
          </p>
        </section>
      </main>
    </div>
  )
}
