'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Trash2, Star, Plus, Edit2, History } from 'lucide-react'
import type { Vehicle } from '@/types/supabase'
import { AuthGuard } from '@/components/AuthGuard'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import SmartYearSelector from '@/components/intake/SmartYearSelector'
import SmartBrandSelector from '@/components/intake/SmartBrandSelector'

function VehiclesPageContent() {
  const router = useRouter()
  const supabase = createClient()
  const { user } = useAuthGuard({ requiredRole: 'customer' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [decodingVin, setDecodingVin] = useState(false)
  const [vinDecodeError, setVinDecodeError] = useState<string | null>(null)
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
    if (user) {
      loadVehicles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function loadVehicles() {
    if (!user) return

    try {
      const { data, error: queryError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false })

      if (queryError) {
        console.error('Error loading vehicles:', queryError)
        setError('Failed to load vehicles. Please try refreshing the page.')
        return
      }

      setVehicles(data || [])
    } catch (err: any) {
      console.error('Error loading vehicles:', err)
      setError(err.message || 'An unexpected error occurred')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {

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
    if (!user) return

    try {
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
    if (!user) return

    try {
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
    setVinDecodeError(null)
  }

  async function handleDecodeVin() {
    const vin = vehicle.vin.trim().toUpperCase()

    if (!vin) {
      setVinDecodeError('Please enter a VIN first')
      return
    }

    if (vin.length !== 17) {
      setVinDecodeError('VIN must be exactly 17 characters')
      return
    }

    setDecodingVin(true)
    setVinDecodeError(null)

    try {
      const response = await fetch(`/api/vin-decode?vin=${encodeURIComponent(vin)}`)
      const result = await response.json()

      if (!result.success) {
        setVinDecodeError(result.error || 'Failed to decode VIN')
        return
      }

      const { data } = result

      // Auto-populate fields with decoded data
      setVehicle((prev) => ({
        ...prev,
        vin: vin, // Keep uppercase VIN
        year: data.year || prev.year,
        make: data.make || prev.make,
        model: data.model || prev.model,
      }))

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('VIN decode error:', err)
      setVinDecodeError(err.message || 'Failed to decode VIN')
    } finally {
      setDecodingVin(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-white/10 bg-white/5 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <h1 className="text-base sm:text-lg font-semibold text-white">My Vehicles</h1>
          <Link
            href="/customer/dashboard"
            className="text-xs sm:text-sm font-medium text-slate-300 transition hover:text-white py-2 sm:py-2.5 px-2.5 sm:px-3"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
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
          <div className="mb-4 sm:mb-6">
            <button
              onClick={handleAddNew}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" />
              Add New Vehicle
            </button>
          </div>
        )}

        {showForm && (
          <div className="mb-6 sm:mb-8 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 md:p-8 shadow-sm backdrop-blur">
            <div className="mb-4 sm:mb-6 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-white">
                {editingId ? 'Edit Vehicle' : 'Add New Vehicle'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                }}
                className="text-xs sm:text-sm text-slate-400 hover:text-white py-2 sm:py-2.5 px-2.5 sm:px-3"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
                <SmartYearSelector
                  label="Year *"
                  value={vehicle.year}
                  onChange={(value) => setVehicle({ ...vehicle, year: value })}
                  required
                />

                <SmartBrandSelector
                  label="Make *"
                  value={vehicle.make}
                  onChange={(value) => setVehicle({ ...vehicle, make: value })}
                  required
                />

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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-200">
                    VIN <span className="text-slate-400">(optional)</span>
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      maxLength={17}
                      value={vehicle.vin}
                      onChange={(e) => {
                        const upperVin = e.target.value.toUpperCase()
                        setVehicle({ ...vehicle, vin: upperVin })
                        setVinDecodeError(null)
                      }}
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                      placeholder="Enter 17-character VIN"
                    />
                    <button
                      type="button"
                      onClick={handleDecodeVin}
                      disabled={decodingVin || !vehicle.vin || vehicle.vin.length !== 17}
                      className="rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {decodingVin ? 'Decoding...' : 'Decode VIN'}
                    </button>
                  </div>
                  {vinDecodeError && (
                    <p className="mt-2 text-sm text-rose-400">{vinDecodeError}</p>
                  )}
                  {vehicle.vin.length > 0 && vehicle.vin.length !== 17 && (
                    <p className="mt-2 text-xs text-slate-400">
                      {vehicle.vin.length}/17 characters
                    </p>
                  )}
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

              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-3 sm:pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-600 hover:to-red-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingId ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Vehicles Table */}
        {vehicles.length > 0 && (
          <>
            <div className="hidden overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm backdrop-blur md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Vehicle
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Details
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Status
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {vehicles.map((v) => (
                      <tr key={v.id} className="transition hover:bg-white/5">
                        <td className="px-4 sm:px-6 py-4">
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
                        <td className="px-4 sm:px-6 py-4">
                          <div className="space-y-1 text-sm text-slate-300">
                            {v.color && <p>Color: {v.color}</p>}
                            {v.plate && <p>Plate: {v.plate}</p>}
                            {v.mileage && <p>Mileage: {v.mileage}</p>}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          {v.is_primary ? (
                            <span className="inline-flex items-center rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-300">
                              Primary
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetPrimary(v.id)}
                              className="py-2.5 px-3 text-xs text-slate-400 hover:text-orange-400"
                            >
                              Set as primary
                            </button>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/customer/vehicles/${v.id}/history`}
                              className="rounded-lg p-3 text-slate-400 transition hover:bg-white/10 hover:text-white"
                              title="View Service History"
                            >
                              <History className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleEdit(v)}
                              className="rounded-lg p-3 text-slate-400 transition hover:bg-white/10 hover:text-white"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(v.id)}
                              className="rounded-lg p-3 text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-400"
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

            <div className="space-y-4 md:hidden">
              {vehicles.map((v) => (
                <div key={v.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-white">
                          {v.year} {v.make} {v.model}
                        </p>
                        {v.nickname && <p className="text-sm text-slate-400">{v.nickname}</p>}
                      </div>
                      {v.is_primary ? (
                        <span className="inline-flex items-center rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-200">
                          Primary Vehicle
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetPrimary(v.id)}
                          className="text-xs font-semibold text-slate-300 underline-offset-2 hover:text-orange-300"
                        >
                          Set as primary
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm text-slate-300 sm:grid-cols-2">
                      {v.color && <p><span className="text-slate-500">Color:</span> {v.color}</p>}
                      {v.plate && <p><span className="text-slate-500">Plate:</span> {v.plate}</p>}
                      {v.mileage && <p><span className="text-slate-500">Mileage:</span> {v.mileage}</p>}
                      {v.vin && <p className="break-all text-xs"><span className="text-slate-500">VIN:</span> {v.vin}</p>}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/customer/vehicles/${v.id}/history`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                      >
                        <History className="h-4 w-4" />
                        View Service History
                      </Link>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          onClick={() => handleEdit(v)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit Vehicle
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:border-rose-500/50 hover:text-rose-200"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
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

// Wrap the page with AuthGuard for automatic authentication protection
export default function VehiclesPage() {
  return (
    <AuthGuard requiredRole="customer" redirectTo="/signup?redirect=/customer/vehicles">
      <VehiclesPageContent />
    </AuthGuard>
  )
}
