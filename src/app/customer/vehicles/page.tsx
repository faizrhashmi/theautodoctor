'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Trash2, Star, Plus, Edit2 } from 'lucide-react'
import type { Vehicle } from '@/types/supabase'

export default function VehiclesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [vehicle, setVehicle] = useState({
    make: '',
    model: '',
    year: '',
    vin: '',
    color: '',
    mileage: '',
    plate: '',
    nickname: '',
  })

  useEffect(() => {
    loadVehicles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadVehicles() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/customer/login')
        return
      }

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setVehicles(data || [])
    } catch (err: any) {
      console.error('Error loading vehicles:', err)
      setError(err.message)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/customer/login')
        return
      }

      if (editingId) {
        // Update existing vehicle
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({
            ...vehicle,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)
          .eq('user_id', user.id)

        if (updateError) throw updateError
      } else {
        // Insert new vehicle
        const { error: insertError } = await supabase
          .from('vehicles')
          .insert({
            ...vehicle,
            user_id: user.id,
            is_primary: vehicles.length === 0, // First vehicle is primary
          })

        if (insertError) throw insertError
      }

      setSuccess(true)
      setShowForm(false)
      setEditingId(null)
      setVehicle({
        make: '',
        model: '',
        year: '',
        vin: '',
        color: '',
        mileage: '',
        plate: '',
        nickname: '',
      })
      await loadVehicles()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      await loadVehicles()
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleSetPrimary(id: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('vehicles')
        .update({ is_primary: true })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      await loadVehicles()
    } catch (err: any) {
      setError(err.message)
    }
  }

  function handleEdit(v: Vehicle) {
    setVehicle({
      make: v.make,
      model: v.model,
      year: v.year,
      vin: v.vin || '',
      color: v.color || '',
      mileage: v.mileage || '',
      plate: v.plate || '',
      nickname: v.nickname || '',
    })
    setEditingId(v.id)
    setShowForm(true)
  }

  function handleAddNew() {
    setVehicle({
      make: '',
      model: '',
      year: '',
      vin: '',
      color: '',
      mileage: '',
      plate: '',
      nickname: '',
    })
    setEditingId(null)
    setShowForm(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-white/10 bg-white/5 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-white">My Vehicles</h1>
          <Link
            href="/customer/dashboard"
            className="text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            Vehicle saved successfully!
          </div>
        )}

        {!showForm && (
          <div className="mb-6">
            <button
              onClick={handleAddNew}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" />
              Add New Vehicle
            </button>
          </div>
        )}

        {showForm && (
          <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm backdrop-blur">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingId ? 'Edit Vehicle' : 'Add New Vehicle'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                }}
                className="text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Make <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicle.make}
                    onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                    placeholder="Toyota, Honda, Ford..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Model <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicle.model}
                    onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                    placeholder="Civic, Accord, F-150..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Year <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicle.year}
                    onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                    placeholder="2020"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Nickname <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={vehicle.nickname}
                    onChange={(e) => setVehicle({ ...vehicle, nickname: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                    placeholder="My Honda, Dad's Truck..."
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
                    placeholder="Silver, Black..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    License Plate <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={vehicle.plate}
                    onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                    placeholder="ABC 1234"
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
                    placeholder="17 characters"
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
                  className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-600 hover:to-red-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingId ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Vehicles Table */}
        {vehicles.length > 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 shadow-sm backdrop-blur overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Vehicle
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="transition hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {v.is_primary && (
                            <Star className="h-4 w-4 fill-orange-400 text-orange-400" />
                          )}
                          <div>
                            <p className="font-semibold text-white">
                              {v.year} {v.make} {v.model}
                            </p>
                            {v.nickname && (
                              <p className="text-xs text-slate-400">{v.nickname}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm text-slate-300">
                          {v.color && <p>Color: {v.color}</p>}
                          {v.plate && <p>Plate: {v.plate}</p>}
                          {v.mileage && <p>Mileage: {v.mileage}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {v.is_primary ? (
                          <span className="inline-flex items-center rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-300">
                            Primary
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetPrimary(v.id)}
                            className="text-xs text-slate-400 hover:text-orange-400"
                          >
                            Set as primary
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(v)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(v.id)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {vehicles.length === 0 && !showForm && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center shadow-sm backdrop-blur">
            <p className="text-slate-400">No vehicles added yet. Add your first vehicle to get started.</p>
          </div>
        )}
      </main>
    </div>
  )
}
