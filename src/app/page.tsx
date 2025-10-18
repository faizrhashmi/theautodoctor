'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircleIcon, ShieldCheckIcon, SparklesIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/solid'

const features = [
  {
    icon: <WrenchScrewdriverIcon className="w-6 h-6 text-[--lux-gold]" />,
    title: 'Master Technicians',
    desc: 'Certified experts across European, JDM, Domestic and EV platforms.',
  },
  {
    icon: <ShieldCheckIcon className="w-6 h-6 text-[--lux-gold]" />,
    title: 'Trusted & Secure',
    desc: 'Supabase Auth + Stripe secure checkout. Video powered by LiveKit.',
  },
  {
    icon: <SparklesIcon className="w-6 h-6 text-[--lux-gold]" />,
    title: 'Concierge Experience',
    desc: 'White-glove guidance from first contact to final recommendation.',
  },
  {
    icon: <CheckCircleIcon className="w-6 h-6 text-[--lux-gold]" />,
    title: 'Actionable Outcomes',
    desc: 'Clear diagnosis, repair paths and negotiation tips when buying.',
  },
]

const testimonials = [
  {
    name: 'A. Patel • Toronto',
    quote: 'Five stars. They caught an issue the dealer missed and saved me thousands.',
    rating: 5,
  },
  { name: 'M. Chen • Vancouver', quote: 'Luxury experience from start to finish. Seamless video consult.', rating: 5 },
  { name: 'S. Khalid • Dubai', quote: 'Professional, on time, and the report was perfect for negotiations.', rating: 5 },
]

export default function Home() {
  return (
    <div>
      {/* HERO with parallax/bg overlays */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'var(--grad-hero)' }}
      >
        {/* Parallax shapes */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-1/3 -right-24 w-[28rem] h-[28rem] rounded-full bg-[--lux-gold]/10 blur-3xl" />
        </div>

        <div className="container relative py-28">
          <motion.h1
            className="text-5xl md:text-6xl font-black leading-tight"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Premium Auto Consultations <span className="text-[--lux-gold]">On-Demand</span>
          </motion.h1>
          <motion.p
            className="mt-6 text-lg md:text-xl text-white/80 max-w-2xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            Expert diagnostics, pre-purchase inspections and repair guidance. Meet live with a master mechanic—anywhere.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Link className="btn btn-primary" href="/book">Book a Consultation</Link>
            <Link className="btn btn-outline" href="/pricing">View Pricing</Link>
          </motion.div>

          {/* Trust bar */}
          <div className="mt-12 glass-soft rounded-2xl p-4 grid sm:grid-cols-4 gap-6">
            {['Stripe Secure', 'LiveKit HD Video', 'Supabase Auth', 'Certified Mechanics'].map((t, i) => (
              <div key={t} className="flex items-center gap-3">
                <i className="fas fa-shield-check text-[--lux-gold]" />
                <span className="text-white/80 text-sm md:text-base">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container py-20">
        <h2 className="h-section mb-10">Why AutoDoctor</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card-lux hover:scale-[1.01] transition">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <div className="font-bold text-lg">{f.title}</div>
              <p className="text-white/70 mt-2 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROCESS */}
      <section className="container pb-10">
        <div className="glass rounded-2xl p-8">
          <h2 className="h-section mb-6">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: '1', t: 'Choose Service', d: 'Quick consult or full inspection.' },
              { n: '2', t: 'Book Securely', d: 'Pick a time, pay via Stripe.' },
              { n: '3', t: 'Meet Your Expert', d: 'Live video with a master mechanic.' },
            ].map((s) => (
              <div key={s.n} className="card-lux">
                <div className="w-10 h-10 rounded-full bg-[--lux-gold]/20 border border-[--lux-gold]/40 flex items-center justify-center font-extrabold text-[--lux-gold] mb-3">
                  {s.n}
                </div>
                <div className="font-semibold">{s.t}</div>
                <p className="text-white/70 text-sm mt-1">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL CAROUSEL */}
      <section className="container py-16">
        <h2 className="h-section mb-6">What clients say</h2>
        <Carousel />
      </section>

      {/* CTA */}
      <section className="container py-14">
        <div className="glass rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="text-2xl md:text-3xl font-extrabold">Ready for a luxury consult?</div>
            <p className="text-white/70 mt-1">Get expert answers today—no dealership runaround.</p>
          </div>
          <Link className="btn btn-primary" href="/book">Book Now</Link>
        </div>
      </section>
    </div>
  )
}

/** Simple auto-advancing testimonial carousel using Framer Motion */
function Carousel() {
  const duration = 5

  return (
    <div className="relative overflow-hidden">
      <motion.div
        className="flex gap-6"
        initial={{ x: 0 }}
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration, ease: 'linear', repeat: Infinity }}
      >
        {[...testimonials, ...testimonials].map((t, i) => (
          <div key={i} className="min-w-[320px] md:min-w-[420px] card-lux">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10" />
              <div className="font-semibold">{t.name}</div>
            </div>
            <p className="text-white/80 mt-3 italic">“{t.quote}”</p>
            <div className="mt-3 text-[--lux-gold]">
              {'★'.repeat(t.rating)}<span className="text-white/30">{'★'.repeat(5 - t.rating)}</span>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
