'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Calendar, FileText, Wrench, AlertCircle } from 'lucide-react'
import { AuthGuard } from '@/components/AuthGuard'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import type { Vehicle } from '@/types/supabase'

type ServiceHistoryItem = {
  record_type: 'session' | 'intake'
  record_id: string
  record_date: string
  service_type: string
  status: string | null
  request_type: string | null
  notes: string | null
  mechanic_name: string | null
  concern: string | null
  intake_plan: string | null
  is_follow_up: boolean | null
  parent_session_id: string | null
}

function VehicleHistoryPageContent() {
  const params = useParams()
  const router = useRouter()
  const vehicleId = params.id as string
  const supabase = createClient()
  const { user } = useAuthGuard({ requiredRole: 'customer' })

  const [loading, setLoading] = useState(true)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [history, setHistory] = useState<ServiceHistoryItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && vehicleId) {
      loadVehicleAndHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, vehicleId])

  async function loadVehicleAndHistory() {
    if (!user || !vehicleId) return

    try {
      setLoading(true)
      setError(null)

      // Load vehicle details
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .eq('user_id', user.id)
        .single()

      if (vehicleError) {
        console.error('Error loading vehicle:', vehicleError)
        setError('Vehicle not found or access denied')
        return
      }

      setVehicle(vehicleData)

      // Load service history from view
      const { data: historyData, error: historyError } = await supabase
        .from('vehicle_service_history')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('owner_id', user.id)
        .order('record_date', { ascending: false })

      if (historyError) {
        console.error('Error loading history:', historyError)
        // Don't fail if history view doesn't exist yet
        setHistory([])
      } else {
        setHistory(historyData || [])
      }
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Failed to load vehicle history')
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getStatusBadge(status: string | null) {
    if (!status) return null

    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/20',
      waiting: 'bg-blue-500/20 text-blue-300 border-blue-400/20',
      live: 'bg-green-500/20 text-green-300 border-green-400/20',
      completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/20',
      cancelled: 'bg-red-500/20 text-red-300 border-red-400/20',
      accepted: 'bg-purple-500/20 text-purple-300 border-purple-400/20',
    }

    const colorClass = statusColors[status.toLowerCase()] || 'bg-slate-500/20 text-slate-300 border-slate-400/20'

    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${colorClass}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <header className="border-b border-white/10 bg-white/5 shadow-sm backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <h1 className="text-lg font-semibold text-white">Vehicle History</h1>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-center text-slate-400">Loading vehicle history...</div>
        </main>
      </div>
    )
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <header className="border-b border-white/10 bg-white/5 shadow-sm backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <h1 className="text-lg font-semibold text-white">Vehicle History</h1>
            <Link
              href="/customer/vehicles"
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Back to Vehicles
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-rose-400" />
            <p className="text-lg text-rose-300">{error || 'Vehicle not found'}</p>
            <Link
              href="/customer/vehicles"
              className="mt-4 inline-block rounded-lg bg-orange-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              Back to Vehicles
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-white/10 bg-white/5 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/customer/vehicles"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-semibold text-white">Service History</h1>
          </div>
          <Link
            href="/customer/dashboard"
            className="text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Vehicle Info Card */}
        <div className="mb-6 sm:mb-8 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h2>
              {vehicle.nickname && (
                <p className="mt-1 text-sm sm:text-base text-slate-400">{vehicle.nickname}</p>
              )}
              <div className="mt-3 sm:mt-4 flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-slate-300">
                {vehicle.vin && <span>VIN: {vehicle.vin}</span>}
                {vehicle.plate && <span>Plate: {vehicle.plate}</span>}
                {vehicle.color && <span>Color: {vehicle.color}</span>}
                {vehicle.mileage && <span>Mileage: {vehicle.mileage}</span>}
              </div>
            </div>
            {vehicle.is_primary && (
              <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-300">
                Primary Vehicle
              </span>
            )}
          </div>
        </div>

        {/* Service History Timeline */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-sm backdrop-blur">
          <h3 className="mb-4 sm:mb-6 text-lg sm:text-xl font-semibold text-white">Service History</h3>

          {history.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-slate-600" />
              <p className="text-slate-400">No service history yet for this vehicle.</p>
              <p className="mt-2 text-sm text-slate-500">
                Service records will appear here when you submit intakes or complete sessions for this vehicle.
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {history.map((item) => (
                <div
                  key={`${item.record_type}-${item.record_id}`}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5 transition hover:bg-white/10"
                >
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 w-full">
                      <div className="rounded-lg bg-orange-500/20 p-2.5 sm:p-3 shrink-0">
                        {item.record_type === 'session' ? (
                          <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                        ) : (
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <h4 className="text-sm sm:text-base font-semibold text-white">
                            {item.record_type === 'session' ? 'Service Session' : 'Intake Form'}
                          </h4>
                          {item.status && getStatusBadge(item.status)}
                        </div>
                        <div className="mt-2 space-y-1 text-xs sm:text-sm text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(item.record_date)}</span>
                          </div>
                          {item.service_type && (
                            <p>Type: {item.service_type}</p>
                          )}
                          {item.request_type && (
                            <p>Request Type: {item.request_type}</p>
                          )}
                          {item.mechanic_name && (
                            <p>Mechanic: {item.mechanic_name}</p>
                          )}
                          {item.is_follow_up && (
                            <p className="text-blue-400">Follow-up Session</p>
                          )}
                          {item.concern && (
                            <p className="mt-2 text-slate-300">Concern: {item.concern}</p>
                          )}
                          {item.notes && (
                            <p className="mt-2 text-slate-300">Notes: {item.notes}</p>
                          )}
                          {item.intake_plan && (
                            <p>Plan: {item.intake_plan}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// Wrap the page with AuthGuard for automatic authentication protection
export default function VehicleHistoryPage() {
  return (
    <AuthGuard requiredRole="customer" redirectTo="/signup?redirect=/customer/vehicles">
      <VehicleHistoryPageContent />
    </AuthGuard>
  )
}
