'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Car,
  Wrench,
  DollarSign,
  ArrowRight,
  Filter
} from 'lucide-react'

interface Escalation {
  id: string
  diagnostic_session_id: string
  customer_id: string
  status: 'pending' | 'accepted' | 'in_progress' | 'quote_sent' | 'declined'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  vehicle_info: {
    year: number
    make: string
    model: string
    color: string
    license_plate?: string
  }
  issue_summary: string
  diagnosis_summary: string
  recommended_services: string[]
  mechanic_notes: string
  referral_fee_percent: number
  created_at: string
  customer: {
    full_name: string
    city: string
  }
  escalating_mechanic: {
    name: string
  }
  assigned_advisor?: {
    name: string
  }
  quote?: {
    id: string
    customer_total: number
    status: string
  }
}

interface EscalationCounts {
  pending: number
  accepted: number
  in_progress: number
  quote_sent: number
  declined: number
  total: number
}

export default function WorkshopEscalationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [counts, setCounts] = useState<EscalationCounts>({
    pending: 0,
    accepted: 0,
    in_progress: 0,
    quote_sent: 0,
    declined: 0,
    total: 0
  })
  const [error, setError] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadEscalations()
  }, [selectedStatus, selectedPriority])

  const loadEscalations = async () => {
    try {
      setLoading(true)
      setError(null)

      let url = '/api/workshop/escalation-queue'
      const params = new URLSearchParams()

      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus)
      }

      if (selectedPriority !== 'all') {
        params.append('priority', selectedPriority)
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login?redirect=/workshop/escalations')
          return
        }
        throw new Error(data.error || 'Failed to load escalations')
      }

      setEscalations(data.escalations)
      setCounts(data.counts)

    } catch (err: any) {
      console.error('Failed to load escalations:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (escalationId: string) => {
    try {
      setProcessingId(escalationId)

      const response = await fetch('/api/workshop/escalation-queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escalation_id: escalationId,
          action: 'accept'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept escalation')
      }

      // Reload escalations
      await loadEscalations()

    } catch (err: any) {
      alert(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Clock },
      accepted: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle },
      in_progress: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Wrench },
      quote_sent: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', icon: FileText },
      declined: { color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: XCircle }
    }

    const badge = badges[status as keyof typeof badges] || badges.pending
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </span>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const badges = {
      low: 'bg-slate-500/20 text-slate-400 border-slate-500/50',
      normal: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      urgent: 'bg-red-500/20 text-red-400 border-red-500/50'
    }

    return (
      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${badges[priority as keyof typeof badges] || badges.normal}`}>
        {priority}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8 sm:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Escalation Queue</h1>
              <p className="mt-2 text-slate-400">
                Diagnostic sessions escalated from virtual mechanics for repair quotes
              </p>
            </div>
            <Link
              href="/workshop/dashboard"
              className="rounded-full bg-slate-800 border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total</p>
                <p className="text-2xl font-bold text-white">{counts.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-slate-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-500/50 bg-yellow-500/10 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-400">Pending</p>
                <p className="text-2xl font-bold text-white">{counts.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-green-500/50 bg-green-500/10 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-400">Accepted</p>
                <p className="text-2xl font-bold text-white">{counts.accepted}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-blue-500/50 bg-blue-500/10 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-400">In Progress</p>
                <p className="text-2xl font-bold text-white">{counts.in_progress}</p>
              </div>
              <Wrench className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-purple-500/50 bg-purple-500/10 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-400">Quotes Sent</p>
                <p className="text-2xl font-bold text-white">{counts.quote_sent}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="h-5 w-5 text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="in_progress">In Progress</option>
              <option value="quote_sent">Quote Sent</option>
              <option value="declined">Declined</option>
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/50 bg-red-500/10 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-500">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
            <p className="mt-4 text-slate-400">Loading escalations...</p>
          </div>
        )}

        {/* Escalations List */}
        {!loading && escalations.length === 0 && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-600" />
            <h3 className="mt-4 text-lg font-semibold text-white">No escalations found</h3>
            <p className="mt-2 text-slate-400">
              {selectedStatus !== 'all' || selectedPriority !== 'all'
                ? 'Try adjusting your filters'
                : 'Escalated sessions from virtual mechanics will appear here'}
            </p>
          </div>
        )}

        {!loading && escalations.length > 0 && (
          <div className="space-y-4">
            {escalations.map((escalation) => (
              <div
                key={escalation.id}
                className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6 hover:border-orange-500/50 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(escalation.status)}
                    {getPriorityBadge(escalation.priority)}
                  </div>
                  <p className="text-sm text-slate-400">
                    {new Date(escalation.created_at).toLocaleDateString()} at{' '}
                    {new Date(escalation.created_at).toLocaleTimeString()}
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Vehicle */}
                    <div className="flex items-start gap-3">
                      <Car className="h-5 w-5 text-green-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-400">Vehicle</p>
                        <p className="font-semibold text-white">
                          {escalation.vehicle_info.year} {escalation.vehicle_info.make}{' '}
                          {escalation.vehicle_info.model}
                        </p>
                        <p className="text-sm text-slate-400">{escalation.vehicle_info.color}</p>
                      </div>
                    </div>

                    {/* Customer */}
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-400">Customer</p>
                        <p className="font-semibold text-white">{escalation.customer.full_name}</p>
                        <p className="text-sm text-slate-400">{escalation.customer.city}</p>
                      </div>
                    </div>

                    {/* Referring Mechanic */}
                    <div className="flex items-start gap-3">
                      <Wrench className="h-5 w-5 text-orange-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-400">Referred by</p>
                        <p className="font-semibold text-white">{escalation.escalating_mechanic.name}</p>
                        <p className="text-xs text-green-400">
                          Referral fee: {escalation.referral_fee_percent}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Issue */}
                    <div>
                      <p className="text-sm font-semibold text-slate-400 mb-2">Issue Summary</p>
                      <p className="text-white">{escalation.issue_summary}</p>
                    </div>

                    {/* Diagnosis */}
                    {escalation.diagnosis_summary && (
                      <div>
                        <p className="text-sm font-semibold text-slate-400 mb-2">Mechanic Diagnosis</p>
                        <p className="text-slate-300">{escalation.diagnosis_summary}</p>
                      </div>
                    )}

                    {/* Recommended Services */}
                    {escalation.recommended_services && escalation.recommended_services.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-slate-400 mb-2">Recommended Services</p>
                        <ul className="space-y-1">
                          {escalation.recommended_services.map((service, idx) => (
                            <li key={idx} className="text-slate-300 text-sm">• {service}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Mechanic Notes */}
                    {escalation.mechanic_notes && (
                      <div>
                        <p className="text-sm font-semibold text-slate-400 mb-2">Mechanic Notes</p>
                        <p className="text-slate-300 text-sm">{escalation.mechanic_notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-6 border-t border-slate-700 flex items-center justify-between">
                  {escalation.status === 'pending' && (
                    <button
                      onClick={() => handleAccept(escalation.id)}
                      disabled={processingId === escalation.id}
                      className="rounded-full bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {processingId === escalation.id ? 'Accepting...' : 'Accept Escalation'}
                    </button>
                  )}

                  {(escalation.status === 'accepted' || escalation.status === 'in_progress') && (
                    <Link
                      href={`/workshop/quotes/create/${escalation.diagnostic_session_id}`}
                      className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
                    >
                      Create Quote
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}

                  {escalation.quote && (
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm text-slate-400">Quote sent</p>
                        <p className="font-semibold text-white">
                          ${escalation.quote.customer_total.toFixed(2)}
                        </p>
                      </div>
                      <span className="text-slate-400">•</span>
                      <span className="capitalize text-slate-300">{escalation.quote.status}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
