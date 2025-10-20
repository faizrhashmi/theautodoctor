'use client'

import Link from 'next/link'

type Plan = {
  name: string
  price: string
  duration: string
  features: string[]
  popular?: boolean
}

const plans: Plan[] = [
  {
    name: 'Quick Consult',
    price: '$25',
    duration: '15 min',
    features: ['Rapid triage', 'Troubleshooting steps', 'Follow-up notes'],
  },
  {
    name: 'Standard Consult',
    price: '$45',
    duration: '30 min',
    features: ['Detailed diagnosis', 'Repair guidance', 'Parts suggestions', 'Priority support'],
    popular: true,
  },
  {
    name: 'Pre-Purchase Inspection',
    price: '$90',
    duration: '60 min',
    features: ['Comprehensive checklist', 'History review', 'Negotiation tips', 'Written report'],
  },
]

export default function Pricing() {
  return (
    <section className="container py-20">
      <div
        className="text-center mb-12"
      >
        <h1 className="h-section">Transparent Luxury Pricing</h1>
        <p className="text-white/70 mt-2">No surprises. Session length is guaranteed and secured via Stripe.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div
            key={p.name}
            className="relative card-lux pt-10"
          >
            {p.popular && <div className="ribbon">Most Popular</div>}
            <div className="text-xl font-extrabold">{p.name}</div>
            <div className="mt-1 text-4xl font-black">{p.price}</div>
            <div className="text-white/60">/ {p.duration}</div>

            <ul className="mt-6 space-y-3 text-white/80">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <i className="fas fa-check text-[--lux-gold]" /> <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link href="/start" className="btn btn-primary mt-8 w-full text-center">Book {p.name}</Link>
          </div>
        ))}
      </div>

      <div className="glass mt-12 rounded-2xl p-6 text-sm text-white/70">
        <div className="font-semibold text-white mb-2">What’s included</div>
        Secure payment via Stripe • Email confirmations via Resend • HD live call via LiveKit • Magic-link login via Supabase
      </div>
    </section>
  )
}
