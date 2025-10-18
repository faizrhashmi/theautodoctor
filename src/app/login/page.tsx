'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (error) return alert(error.message)
    setSent(true)
  }

  return (
    <section className="container py-20">
      <div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto glass rounded-2xl p-8">
        <h1 className="h-section">Login</h1>
        <p className="text-white/70 mt-2">Weâ€™ll email you a secure sign-in link.</p>

        {sent ? (
          <div className="card-lux mt-6">
            <div className="font-semibold">Check your inbox</div>
            <p className="text-white/70 text-sm mt-1">{email}</p>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="mt-6 space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 outline-none focus:border-[--lux-gold]"
            />
            <button className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Sendingâ€¦' : 'Send magic link'}
            </button>
          </form>
        )}

        <div className="text-white/60 text-xs mt-4">
          By continuing you agree to our terms & privacy.
        </div>
      </div>
    </section>
  )
}
