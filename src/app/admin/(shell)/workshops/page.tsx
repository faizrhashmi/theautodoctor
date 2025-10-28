'use client'

/**
 * Admin Workshop Management Page
 * Manage all workshops: approvals, suspensions, and monitoring
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Building2,
  CheckCircle,
  Clock,
  Search,
  Filter,
  DollarSign,
  Users,
  MapPin,
  Mail,
  Phone,
  TrendingUp,
  Ban,
  Eye
} from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'

interface Workshop {
  id: string
  name: string
  business_name: string | null
  email: string
  phone: string | null
  address: string | null
  city: string | null
  state_province: string | null
  country: string | null
  status: 'pending' | 'approved' | 'suspended'
  revenue_share_percentage: number
  created_at: string
  updated_at: string
  // Aggregated data
  mechanic_count?: number
  total_sessions?: number
  total_revenue?: number
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'suspended'

export default function WorkshopsPage() {
  // ✅ Auth guard - requires admin role
  const { isLoading: authLoading, user } = useAuthGuard({ requiredRole: 'admin' })

  const [loading, setLoading] = useState(true)
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [filteredWorkshops, setFilteredWorkshops] = useState<Workshop[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [actionWorkshop, setActionWorkshop] = useState<Workshop | null>(null)
  const [activeAction, setActiveAction] = useState<'approve' | 'suspend' | 'reactivate' | null>(null)
  const [actionReason, setActionReason] = useState<string>('')
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchWorkshops = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/workshops')

      if (!response.ok) {
        throw new Error('Failed to fetch workshops')
      }

      const data = await response.json()
      setWorkshops(data.workshops || [])
    } catch (error: any) {
      console.error('Error fetching workshops:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkshops()
  }, [fetchWorkshops])

  // Apply filters
  useEffect(() => {
    let filtered = workshops

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(w => w.status === statusFilter)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(w =>
        w.name.toLowerCase().includes(query) ||
        (w.business_name && w.business_name.toLowerCase().includes(query)) ||
        w.email.toLowerCase().includes(query) ||
        (w.city && w.city.toLowerCase().includes(query))
      )
    }

    setFilteredWorkshops(filtered)
  }, [workshops, statusFilter, searchQuery])

  function openAction(workshop: Workshop, action: NonNullable<typeof activeAction>) {
    setActionWorkshop(workshop)
    setActiveAction(action)
    setActionStatus(null)
    setActionReason('')
    setMenuOpenId(null)
  }

  function closeAction() {
    setActionWorkshop(null)
    setActiveAction(null)
    setActionStatus(null)
    setActionReason('')
  }

  async function approveWorkshop() {
    if (!actionWorkshop) return
    try {
      setActionLoading(true)
      setActionStatus(null)
      const response = await fetch(`/api/admin/workshops/${actionWorkshop.id}/approve`, {
        method: 'POST'
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to approve workshop')
      }
      setActionStatus({ type: 'success', message: 'Workshop approved successfully.' })
      await fetchWorkshops()
    } catch (error: any) {
      setActionStatus({ type: 'error', message: error?.message || 'Failed to approve workshop.' })
    } finally {
      setActionLoading(false)
    }
  }

  async function suspendWorkshop() {
    if (!actionWorkshop) return
    if (!actionReason.trim()) {
      setActionStatus({ type: 'error', message: 'Please provide a suspension reason.' })
      return
    }

    try {
      setActionLoading(true)
      setActionStatus(null)
      const response = await fetch(`/api/admin/workshops/${actionWorkshop.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: actionReason.trim() })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to suspend workshop')
      }
      setActionStatus({ type: 'success', message: data?.message || 'Workshop suspended.' })
      await fetchWorkshops()
    } catch (error: any) {
      setActionStatus({ type: 'error', message: error?.message || 'Failed to suspend workshop.' })
    } finally {
      setActionLoading(false)
    }
  }

  async function reactivateWorkshop() {
    if (!actionWorkshop) return
    try {
      setActionLoading(true)
      setActionStatus(null)
      const response = await fetch(`/api/admin/workshops/${actionWorkshop.id}/reactivate`, {
        method: 'POST'
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to reactivate workshop')
      }
      setActionStatus({ type: 'success', message: data?.message || 'Workshop reactivated.' })
      await fetchWorkshops()
    } catch (error: any) {
      setActionStatus({ type: 'error', message: error?.message || 'Failed to reactivate workshop.' })
    } finally {
      setActionLoading(false)
    }
  }

  // Calculate stats
  const stats = {
    total: workshops.length,
    pending: workshops.filter(w => w.status === 'pending').length,
    approved: workshops.filter(w => w.status === 'approved').length,
    suspended: workshops.filter(w => w.status === 'suspended').length
  }

  async function handleActionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeAction) return

    if (activeAction === 'approve') {
      await approveWorkshop()
    } else if (activeAction === 'suspend') {
      await suspendWorkshop()
    } else if (activeAction === 'reactivate') {
      await reactivateWorkshop()
    }
  }

  const actionTitle =
    activeAction === 'approve'
      ? 'Approve Workshop'
      : activeAction === 'suspend'
      ? 'Suspend Workshop'
      : activeAction === 'reactivate'
      ? 'Reactivate Workshop'
      : ''

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="ml-4 text-slate-400">Loading workshops...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Workshop Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage workshop registrations, approvals, and monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">
            {filteredWorkshops.length} of {workshops.length} workshops
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Workshops"
          value={stats.total}
          icon={<Building2 className="h-5 w-5 text-blue-600" />}
          bgColor="bg-blue-50"
          textColor="text-blue-900"
        />
        <StatCard
          label="Pending Approval"
          value={stats.pending}
          icon={<Clock className="h-5 w-5 text-yellow-600" />}
          bgColor="bg-yellow-50"
          textColor="text-yellow-900"
          badge={stats.pending > 0 ? `${stats.pending} new` : undefined}
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          bgColor="bg-green-50"
          textColor="text-green-900"
        />
        <StatCard
          label="Suspended"
          value={stats.suspended}
          icon={<Ban className="h-5 w-5 text-red-600" />}
          bgColor="bg-red-50"
          textColor="text-red-900"
        />
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, email, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-4 py-2 border border-slate-700 bg-slate-800/50 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workshops List */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700">
        {filteredWorkshops.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">No workshops found</p>
            <p className="text-sm text-slate-500 mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Workshops will appear here when registered'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {filteredWorkshops.map((workshop) => (
              <div key={workshop.id} className="p-5 hover:bg-slate-900/60 transition-colors">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{workshop.name}</h3>
                      {workshop.business_name && (
                        <span className="rounded-full bg-slate-900/70 px-2.5 py-1 text-xs text-slate-300">
                          {workshop.business_name}
                        </span>
                      )}
                      <span className="rounded-full border border-slate-600 px-2.5 py-1 text-xs text-slate-300">
                        ID: {workshop.id.slice(0, 8)}
                      </span>
                      <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-medium text-orange-300">
                        Since {new Date(workshop.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-4 w-4 text-slate-500" />
                        {workshop.email}
                      </span>
                      {workshop.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-4 w-4 text-slate-500" />
                          {workshop.phone}
                        </span>
                      )}
                      {workshop.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          {[workshop.city, workshop.state_province, workshop.country]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
                      <StatusPill status={workshop.status} />
                      <span className="inline-flex items-center gap-2 rounded bg-slate-900/70 px-2.5 py-1 text-slate-300">
                        <Users className="h-3.5 w-3.5 text-slate-500" />
                        {workshop.mechanic_count ?? 0} mechanics
                      </span>
                      <span className="inline-flex items-center gap-2 rounded bg-slate-900/70 px-2.5 py-1 text-slate-300">
                        <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
                        {workshop.total_sessions ?? 0} sessions
                      </span>
                      <span className="inline-flex items-center gap-2 rounded bg-slate-900/70 px-2.5 py-1 text-slate-300">
                        <DollarSign className="h-3.5 w-3.5 text-slate-500" />
                        ${(workshop.total_revenue ?? 0).toFixed(2)} revenue share
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 text-sm">
                    <button
                      onClick={() =>
                        setMenuOpenId((prev) => (prev === workshop.id ? null : workshop.id))
                      }
                      className="rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition"
                    >
                      Manage
                    </button>
                    <a
                      href={`/admin/workshops/${workshop.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-orange-400 hover:text-orange-300 transition"
                    >
                      <Eye className="h-4 w-4" />
                      View details
                    </a>
                    {menuOpenId === workshop.id && (
                      <div className="mt-2 rounded-lg border border-slate-700 bg-slate-950/95 p-2 shadow-lg">
                        {workshop.status !== 'approved' && (
                          <button
                            onClick={() => openAction(workshop, 'approve')}
                            className="block w-full rounded-md px-2 py-2 text-left text-slate-200 hover:bg-slate-800/60"
                          >
                            Approve workshop
                          </button>
                        )}
                        {workshop.status !== 'suspended' ? (
                          <button
                            onClick={() => openAction(workshop, 'suspend')}
                            className="block w-full rounded-md px-2 py-2 text-left text-slate-200 hover:bg-slate-800/60"
                          >
                            Suspend workshop
                          </button>
                        ) : (
                          <button
                            onClick={() => openAction(workshop, 'reactivate')}
                            className="block w-full rounded-md px-2 py-2 text-left text-slate-200 hover:bg-slate-800/60"
                          >
                            Reactivate workshop
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper Components
interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  bgColor: string
  textColor: string
  badge?: string
}

function StatCard({ label, value, icon, bgColor, textColor, badge }: StatCardProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 ${bgColor} rounded-lg`}>{icon}</div>
        {badge && (
          <span className="text-xs font-medium bg-gradient-to-r from-orange-500 to-red-600 text-white px-2 py-1 rounded shadow-lg">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className={`text-2xl font-bold ${textColor} mt-1`}>{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: Workshop['status'] }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-semibold text-green-300 border border-green-400/40">
        <CheckCircle className="h-3.5 w-3.5" />
        Approved
      </span>
    )
  }

  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs font-semibold text-yellow-300 border border-yellow-400/40">
        <Clock className="h-3.5 w-3.5" />
        Pending
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-300 border border-red-400/40">
      <Ban className="h-3.5 w-3.5" />
      Suspended
    </span>
  )
}
