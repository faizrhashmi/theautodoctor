'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

const SERVICES = [
  { id: 'quick', label: 'Quick Consult (15m)', amount: 2500 },
  { id: 'standard', label: 'Standard Consult (30m)', amount: 4500 },
  { id: 'ppi', label: 'Pre-Purchase Inspection (60m)', amount: 9000 },
]

export default function BookPage() {
  const [service, setService] = useState(SERVICES[1].id)
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    try {
      setLoading(true)
      // Keep your existing API route intact – adjust payload to your current handler
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      })
      const { url } = await res.json()
      window.location.href = url
    } catch (e) {
      console.error(e)
      setLoading(false)
      alert('Unable to start checkout. Please try again.')
    }
  }

  return (
    <section className="container py-20">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8">
        <h1 className="h-section">Book a Session</h1>
        <p className="text-white/70 mt-2">Select a service and a time. You’ll check out securely with Stripe.</p>

        <div className="grid md:grid-cols-2 gap-8 mt-8">
          <div className="space-y-3">
            {SERVICES.map((s) => (
              <label key={s.id} className={`card-lux flex items-center justify-between cursor-pointer ${service === s.id ? 'ring-2 ring-[--lux-gold]' : ''}`}>
                <div className="font-semibold">{s.label}</div>
                <input
                  type="radio"
                  name="service"
                  className="accent-[--lux-gold]"
                  checked={service === s.id}
                  onChange={() => setService(s.id)}
                />
              </label>
            ))}
          </div>

          <div className="card-lux">
            <div className="font-semibold">Summary</div>
            <p className="text-white/70 text-sm mt-1">You will be able to pick a date/time during the checkout flow.</p>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="btn btn-primary mt-6 w-full"
            >
              {loading ? 'Starting checkout…' : 'Continue to Stripe'}
            </button>

            <div className="text-white/60 text-xs mt-3">
              Payments: Stripe • Video: LiveKit • Auth: Supabase
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
