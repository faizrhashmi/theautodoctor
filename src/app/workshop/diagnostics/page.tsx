// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Wrench,
  Calendar,
  User,
  Car,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Filter,
  Search,
  FileText,
  DollarSign,
  Phone,
  Mail,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DiagnosticSession {
  id: string
  customer_id: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  mechanic_id?: string
  mechanic_name?: string
  mechanic_email?: string
  session_type: 'chat' | 'video' | 'upgraded_from_chat' | 'mobile_visit'
  status: string
  base_price: number
  total_price: number
  vehicle_info?: any
  issue_description?: string
  scheduled_at?: string
  created_at: string
  diagnosis_summary?: string
  urgency?: string
  service_type?: string
}

export default function WorkshopDiagnosticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sessions, setSessions] = useState<DiagnosticSession[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'scheduled' | 'completed' | 'cancelled'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [workshopInfo, setWorkshopInfo] = useState<any>(null)

  const loadSessions = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError(null)

    try {
      const response = await fetch(`/api/workshop/diagnostics?status=${filter}&limit=100`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/workshop/login')
          return
        }
        throw new Error(data.error || 'Failed to load diagnostic sessions')
      }

      setSessions(data.sessions || [])
      setWorkshopInfo(data.workshop)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [filter])

  const handleRefresh = () => {
    loadSessions(false)
  }

  const filteredSessions = sessions.filter((session) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      session.customer_name?.toLowerCase().includes(searchLower) ||
      session.customer_email?.toLowerCase().includes(searchLower) ||
      session.vehicle_info?.make?.toLowerCase().includes(searchLower) ||
      session.vehicle_info?.model?.toLowerCase().includes(searchLower) ||
      session.issue_description?.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-400">Loading diagnostics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20 lg:pl-64 lg:pt-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Diagnostic Sessions</h1>
              <p className="mt-2 text-slate-400">
                Manage all diagnostic sessions for your workshop
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-400 transition hover:bg-purple-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="mb-6 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'All Sessions', icon: Wrench },
              { value: 'pending', label: 'Pending', icon: Clock },
              { value: 'scheduled', label: 'Scheduled', icon: Calendar },
              { value: 'completed', label: 'Completed', icon: CheckCircle2 },
              { value: 'cancelled', label: 'Cancelled', icon: AlertCircle },
            ].map((filterOption) => {
              const Icon = filterOption.icon
              return (
                <button
                  key={filterOption.value}
                  onClick={() => setFilter(filterOption.value as any)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                    filter === filterOption.value
                      ? 'border border-purple-500/50 bg-purple-500/20 text-purple-300'
                      : 'border border-white/10 bg-slate-800/40 text-slate-400 hover:bg-slate-700/40 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {filterOption.label}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, vehicle, or issue..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-800/40 py-2 pl-10 pr-4 text-white placeholder-slate-400 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
        </div>

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <Wrench className="mx-auto h-16 w-16 text-slate-600" />
            <p className="mt-4 text-lg font-medium text-slate-400">
              {searchTerm
                ? 'No diagnostic sessions match your search'
                : filter === 'all'
                  ? 'No diagnostic sessions yet'
                  : `No ${filter} diagnostic sessions`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredSessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-purple-500/30 hover:bg-white/[0.07]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Left Section - Main Info */}
                    <div className="flex-1 space-y-3">
                      {/* Header Row */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                            <Wrench className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{session.customer_name}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <span className="capitalize">{session.session_type.replace('_', ' ')}</span>
                              <span>•</span>
                              <span>{new Date(session.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={session.status} />
                      </div>

                      {/* Vehicle Info */}
                      {session.vehicle_info && (
                        <div className="flex items-center gap-2 text-sm">
                          <Car className="h-4 w-4 text-slate-500" />
                          <span className="text-slate-300">
                            {session.vehicle_info.year} {session.vehicle_info.make}{' '}
                            {session.vehicle_info.model}
                          </span>
                        </div>
                      )}

                      {/* Issue Description */}
                      {session.issue_description && (
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {session.issue_description}
                        </p>
                      )}

                      {/* Contact Info */}
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                        {session.customer_email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            <span>{session.customer_email}</span>
                          </div>
                        )}
                        {session.customer_phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{session.customer_phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Mechanic Info */}
                      {session.mechanic_name && (
                        <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-sm">
                          <User className="h-4 w-4 text-blue-400" />
                          <span className="text-blue-300">
                            Assigned to: {session.mechanic_name}
                          </span>
                        </div>
                      )}

                      {/* Urgency */}
                      {session.urgency && (
                        <div className="flex items-center gap-2">
                          <AlertCircle
                            className={`h-4 w-4 ${
                              session.urgency === 'urgent'
                                ? 'text-red-400'
                                : session.urgency === 'high'
                                  ? 'text-orange-400'
                                  : 'text-yellow-400'
                            }`}
                          />
                          <span
                            className={`text-sm font-medium capitalize ${
                              session.urgency === 'urgent'
                                ? 'text-red-300'
                                : session.urgency === 'high'
                                  ? 'text-orange-300'
                                  : 'text-yellow-300'
                            }`}
                          >
                            {session.urgency} Priority
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex flex-col items-end gap-3">
                      {/* Price */}
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-lg font-bold text-white">
                          <DollarSign className="h-5 w-5" />
                          {session.total_price.toFixed(2)}
                        </div>
                        {session.base_price !== session.total_price && (
                          <p className="text-xs text-slate-500">Base: ${session.base_price.toFixed(2)}</p>
                        )}
                      </div>

                      {/* Scheduled Time */}
                      {session.scheduled_at && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(session.scheduled_at).toLocaleString()}</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Link
                          href={`/workshop/diagnostics/${session.id}`}
                          className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-400 transition hover:bg-purple-500/20"
                        >
                          View Details
                        </Link>
                        {session.status === 'completed' && session.diagnosis_summary && (
                          <Link
                            href={`/workshop/quotes/create/${session.id}`}
                            className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400 transition hover:bg-green-500/20"
                          >
                            Create Quote
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Footer Stats */}
        {filteredSessions.length > 0 && (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-sm text-slate-400">
              Showing <span className="font-semibold text-white">{filteredSessions.length}</span>{' '}
              {filter === 'all' ? 'total' : filter} diagnostic session
              {filteredSessions.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { label: string; color: string; bgColor: string; icon: any }
  > = {
    pending: {
      label: 'Pending',
      color: 'text-yellow-300',
      bgColor: 'bg-yellow-500/20 border-yellow-500/30',
      icon: Clock,
    },
    scheduled: {
      label: 'Scheduled',
      color: 'text-blue-300',
      bgColor: 'bg-blue-500/20 border-blue-500/30',
      icon: Calendar,
    },
    in_progress: {
      label: 'In Progress',
      color: 'text-purple-300',
      bgColor: 'bg-purple-500/20 border-purple-500/30',
      icon: Wrench,
    },
    completed: {
      label: 'Completed',
      color: 'text-green-300',
      bgColor: 'bg-green-500/20 border-green-500/30',
      icon: CheckCircle2,
    },
    cancelled: {
      label: 'Cancelled',
      color: 'text-red-300',
      bgColor: 'bg-red-500/20 border-red-500/30',
      icon: AlertCircle,
    },
  }

  const config = statusConfig[status] || statusConfig.pending
  const Icon = config.icon

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${config.bgColor} ${config.color}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </div>
  )
}
