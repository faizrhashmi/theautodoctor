'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  DollarSign,
  Search,
  Filter,
  Calendar,
  User,
  Car,
  AlertCircle,
  TrendingUp
} from 'lucide-react'

interface Quote {
  id: string
  customer_total: number
  provider_receives: number
  subtotal: number
  platform_fee_amount: number
  platform_fee_percent: number
  status: string
  created_at: string
  sent_at: string
  viewed_at: string | null
  customer_responded_at: string | null
  notes: string
  internal_notes: string
  labor_cost: number
  parts_cost: number
  line_items: any[]
  estimated_completion_hours: number
  warranty_days: number
  customer: {
    id: string
    full_name: string
    email: string
    phone: string
  }
  diagnostic_session: {
    id: string
    issue_description: string
    vehicle_info: any
    status: string
  }
}

interface Stats {
  total: number
  pending: number
  approved: number
  declined: number
  totalValue: number
  pendingValue: number
}

export default function WorkshopQuotesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchQuotes()
  }, [filterStatus])

  const fetchQuotes = async () => {
    try {
      setLoading(true)

      // ✅ Workshop ID is automatically extracted from auth by requireWorkshopAPI in the API route
      const url = `/api/workshop/quotes${filterStatus !== 'all' ? `?status=${filterStatus}` : ''}`

      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setQuotes(data.quotes || [])
        setStats(data.stats || null)
      } else {
        console.error('Failed to fetch quotes:', data.error)
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredQuotes = quotes.filter(quote => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    return (
      quote.customer?.full_name?.toLowerCase().includes(searchLower) ||
      quote.customer?.email?.toLowerCase().includes(searchLower) ||
      quote.diagnostic_session?.issue_description?.toLowerCase().includes(searchLower) ||
      quote.id.toLowerCase().includes(searchLower)
    )
  })

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: Clock },
      viewed: { label: 'Viewed', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: Eye },
      approved: { label: 'Approved', color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: CheckCircle2 },
      declined: { label: 'Declined', color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: XCircle },
      modified: { label: 'Modified', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: FileText },
      in_progress: { label: 'In Progress', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: Clock },
      completed: { label: 'Completed', color: 'bg-green-600/20 text-green-200 border-green-600/30', icon: CheckCircle2 },
      cancelled: { label: 'Cancelled', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', icon: XCircle }
    }
    return configs[status] || configs.pending
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-400">Loading quotes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8 overflow-x-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Repair Quotes</h1>
              <p className="mt-1 text-slate-400">Manage and track all customer quotes</p>
            </div>
            <Link
              href="/workshop/dashboard"
              className="rounded-lg border border-white/10 bg-slate-800/60 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700/60"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={FileText}
              label="Total Quotes"
              value={stats.total}
              subtext={`${stats.approved} approved`}
              color="blue"
            />
            <StatCard
              icon={Clock}
              label="Pending"
              value={stats.pending}
              subtext="Awaiting response"
              color="yellow"
            />
            <StatCard
              icon={DollarSign}
              label="Total Value"
              value={`$${stats.totalValue.toFixed(2)}`}
              subtext="All quotes"
              color="green"
            />
            <StatCard
              icon={TrendingUp}
              label="Pending Value"
              value={`$${stats.pendingValue.toFixed(2)}`}
              subtext="In pipeline"
              color="purple"
            />
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'viewed', 'approved', 'declined', 'in_progress', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filterStatus === status
                    ? 'bg-purple-500 text-white'
                    : 'border border-white/10 bg-slate-800/40 text-slate-300 hover:bg-slate-700/40'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search quotes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-800/40 py-2 pl-10 pr-4 text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 sm:w-64"
            />
          </div>
        </div>

        {/* Quotes List */}
        <div className="space-y-4">
          {filteredQuotes.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-12 text-center">
              <FileText className="mx-auto h-16 w-16 text-slate-600" />
              <h3 className="mt-4 text-lg font-semibold text-white">No quotes found</h3>
              <p className="mt-2 text-sm text-slate-400">
                {searchQuery ? 'Try adjusting your search' : 'Start creating quotes from diagnostic sessions'}
              </p>
            </div>
          ) : (
            filteredQuotes.map((quote) => {
              const statusConfig = getStatusConfig(quote.status)
              const StatusIcon = statusConfig.icon

              return (
                <div
                  key={quote.id}
                  className="rounded-2xl border border-white/10 bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 transition hover:border-purple-500/30"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    {/* Left Section - Quote Info */}
                    <div className="flex-1 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-white">
                              Quote #{quote.id.slice(0, 8)}
                            </h3>
                            <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${statusConfig.color}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-400">
                            Created {new Date(quote.created_at).toLocaleDateString()} at{' '}
                            {new Date(quote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {/* Customer & Vehicle Info */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-blue-500/20 p-2">
                            <User className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-400">Customer</p>
                            <p className="font-medium text-white">{quote.customer?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-slate-400">{quote.customer?.email}</p>
                          </div>
                        </div>

                        {quote.diagnostic_session?.vehicle_info && (
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-purple-500/20 p-2">
                              <Car className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-400">Vehicle</p>
                              <p className="font-medium text-white">
                                {quote.diagnostic_session.vehicle_info?.year} {quote.diagnostic_session.vehicle_info?.make} {quote.diagnostic_session.vehicle_info?.model}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Issue Description */}
                      {quote.diagnostic_session?.issue_description && (
                        <div>
                          <p className="text-sm font-medium text-slate-400">Issue Description</p>
                          <p className="mt-1 text-white">{quote.diagnostic_session.issue_description}</p>
                        </div>
                      )}

                      {/* Line Items Summary */}
                      <div>
                        <p className="text-sm font-medium text-slate-400">Services</p>
                        <div className="mt-2 space-y-1">
                          {quote.line_items?.slice(0, 3).map((item: any, index: number) => (
                            <p key={index} className="text-sm text-white">
                              • {item.description} - ${item.subtotal?.toFixed(2)}
                            </p>
                          ))}
                          {quote.line_items?.length > 3 && (
                            <p className="text-sm text-slate-400">
                              + {quote.line_items.length - 3} more items
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Pricing & Actions */}
                    <div className="lg:w-80">
                      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-6">
                        <h4 className="mb-4 text-sm font-semibold text-white">Quote Summary</h4>

                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Labor</span>
                            <span className="text-white">${quote.labor_cost?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Parts</span>
                            <span className="text-white">${quote.parts_cost?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-white/10 pt-3 text-sm">
                            <span className="text-slate-400">Subtotal</span>
                            <span className="font-medium text-white">${quote.subtotal?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Platform Fee ({quote.platform_fee_percent}%)</span>
                            <span className="text-slate-400">${quote.platform_fee_amount?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-white/10 pt-3">
                            <span className="font-semibold text-white">Customer Total</span>
                            <span className="text-lg font-bold text-white">${quote.customer_total?.toFixed(2)}</span>
                          </div>
                          <div className="rounded-lg bg-green-500/20 p-3">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-green-300">You Receive</span>
                              <span className="font-bold text-green-200">${quote.provider_receives?.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 space-y-2">
                          <Link
                            href={`/workshop/quotes/${quote.id}`}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-600"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </Link>

                          {quote.diagnostic_session_id && (
                            <Link
                              href={`/workshop/diagnostics/${quote.diagnostic_session_id}`}
                              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700/60"
                            >
                              View Diagnostic
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: any
  label: string
  value: string | number
  subtext: string
  color: 'blue' | 'yellow' | 'green' | 'purple'
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    yellow: 'from-yellow-500 to-yellow-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{subtext}</p>
        </div>
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${colorClasses[color]}`}
        >
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>
    </div>
  )
}
