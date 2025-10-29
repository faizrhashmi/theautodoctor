'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, CheckCircle2 } from 'lucide-react'
import WaiverModal from '@/components/customer/WaiverModal'

export default function CompleteProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [showWaiver, setShowWaiver] = useState(false)
  const [waiverAccepted, setWaiverAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    country: 'Canada'
  })

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/signup')
        return
      }

      setUser(session.user)

      // Pre-fill from OAuth data if available
      const userData = session.user.user_metadata
      setForm(prev => ({
        ...prev,
        phone: userData?.phone || prev.phone,
      }))

      setLoading(false)
    }

    checkAuth()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!waiverAccepted) {
      setError('Please review and accept the waiver')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Update profile with completed information
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone: form.phone,
          date_of_birth: form.dateOfBirth,
          address: form.address,
          city: form.city,
          country: form.country,
          onboarding_completed: true,
          waiver_accepted: true,
          waiver_accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        setError('Failed to update profile. Please try again.')
        setSubmitting(false)
        return
      }

      // Success! Redirect to dashboard
      router.push('/customer/dashboard')

    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 sm:p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Complete Your Profile
              </h1>
              <p className="text-slate-400">
                We need a bit more information to set up your account. Signed in as <span className="text-orange-400">{user?.email}</span>
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 416-555-0123"
                  className="w-full rounded-xl border border-slate-600 bg-slate-900/60 px-4 py-3 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Date of Birth <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  className="w-full rounded-xl border border-slate-600 bg-slate-900/60 px-4 py-3 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition"
                />
                <p className="mt-1 text-xs text-slate-500">You must be 18 or older</p>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Street Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main Street"
                  className="w-full rounded-xl border border-slate-600 bg-slate-900/60 px-4 py-3 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition"
                />
              </div>

              {/* City & Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Toronto"
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/60 px-4 py-3 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Country <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/60 px-4 py-3 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition"
                  >
                    <option value="Canada">Canada</option>
                    <option value="United States">United States</option>
                  </select>
                </div>
              </div>

              {/* Waiver Section */}
              <div className={`rounded-xl border-2 p-5 transition ${
                waiverAccepted
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-slate-600 bg-slate-800/30'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {waiverAccepted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <div className="h-5 w-5 rounded border-2 border-slate-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">
                      {waiverAccepted ? (
                        <span className="text-emerald-400">Terms of Service & Waiver accepted</span>
                      ) : (
                        'Review and accept our Terms of Service & Waiver'
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowWaiver(true)}
                      className="mt-2 text-sm text-orange-400 hover:text-orange-300 underline"
                    >
                      {waiverAccepted ? 'Review Terms Again' : 'Read Terms & Waiver'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !waiverAccepted}
                className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Completing Setup...
                  </span>
                ) : (
                  'Complete Setup & Continue'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Waiver Modal */}
      <WaiverModal
        isOpen={showWaiver}
        onClose={() => setShowWaiver(false)}
        onAccept={() => {
          setWaiverAccepted(true)
          setShowWaiver(false)
        }}
      />
    </>
  )
}
