'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function VehiclesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [vehicle, setVehicle] = useState({
    make: '',
    model: '',
    year: '',
    vin: '',
    color: '',
    mileage: '',
  })

  useEffect(() => {
    loadVehicleInfo()
  }, [])

  async function loadVehicleInfo() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/customer/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('vehicle_info')
      .eq('id', user.id)
      .single()

    if (profile?.vehicle_info) {
      const vehicleInfo = profile.vehicle_info as Record<string, string>
      setVehicle({
        make: vehicleInfo.make || '',
        model: vehicleInfo.model || '',
        year: vehicleInfo.year || '',
        vin: vehicleInfo.vin || '',
        color: vehicleInfo.color || '',
        mileage: vehicleInfo.mileage || '',
      })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/customer/login')
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ vehicle_info: vehicle })
      .eq('id', user.id)

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/customer/dashboard'), 1500)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-white/10 bg-white/5 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-white">Manage Vehicles</h1>
          <Link
            href="/customer/dashboard"
            className="text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm backdrop-blur">
          <h2 className="text-xl font-semibold text-white">Vehicle Information</h2>
          <p className="mt-2 text-sm text-slate-400">
            Add your vehicle details to help our mechanics prepare for your diagnostic session.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              Vehicle information saved successfully! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Make <span className="text-slate-400">(e.g., Toyota, Honda)</span>
                </label>
                <input
                  type="text"
                  value={vehicle.make}
                  onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                  placeholder="Honda"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Model <span className="text-slate-400">(e.g., Civic, Accord)</span>
                </label>
                <input
                  type="text"
                  value={vehicle.model}
                  onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                  placeholder="Civic"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Year
                </label>
                <input
                  type="text"
                  value={vehicle.year}
                  onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                  placeholder="2020"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Color <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={vehicle.color}
                  onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                  placeholder="Silver"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  VIN <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={vehicle.vin}
                  onChange={(e) => setVehicle({ ...vehicle, vin: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                  placeholder="1HGBH41JXMN109186"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Mileage <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={vehicle.mileage}
                  onChange={(e) => setVehicle({ ...vehicle, mileage: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                  placeholder="75,000 km"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-600 hover:to-red-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Vehicle Information'}
              </button>
              <Link
                href="/customer/dashboard"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/40 hover:bg-white/5"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
