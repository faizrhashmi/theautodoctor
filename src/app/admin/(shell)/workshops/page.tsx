'use client'

/**
 * Admin Workshop Management Page
 * Manage all workshops: approvals, suspensions, and monitoring
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  DollarSign,
  Users,
  MapPin,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  Settings,
  Ban,
  CheckSquare,
  Eye
} from 'lucide-react'

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
  const [loading, setLoading] = useState(true)
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [filteredWorkshops, setFilteredWorkshops] = useState<Workshop[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null)
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

  const handleApproveWorkshop = async (workshopId: string) => {
    if (!confirm('Are you sure you want to approve this workshop?')) return

    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/workshops/${workshopId}/approve`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to approve workshop')

      await fetchWorkshops()
      setSelectedWorkshop(null)
    } catch (error: any) {
      console.error('Error approving workshop:', error)
      alert(error.message || 'Failed to approve workshop')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSuspendWorkshop = async (workshopId: string) => {
    const reason = prompt('Enter reason for suspension (optional):')
    if (reason === null) return // User cancelled

    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/workshops/${workshopId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) throw new Error('Failed to suspend workshop')

      await fetchWorkshops()
      setSelectedWorkshop(null)
    } catch (error: any) {
      console.error('Error suspending workshop:', error)
      alert(error.message || 'Failed to suspend workshop')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivateWorkshop = async (workshopId: string) => {
    if (!confirm('Are you sure you want to reactivate this workshop?')) return

    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/workshops/${workshopId}/reactivate`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to reactivate workshop')

      await fetchWorkshops()
      setSelectedWorkshop(null)
    } catch (error: any) {
      console.error('Error reactivating workshop:', error)
      alert(error.message || 'Failed to reactivate workshop')
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
          <div className="divide-y">
            {filteredWorkshops.map((workshop) => (
              <WorkshopRow
                key={workshop.id}
                workshop={workshop}
                onSelect={() => setSelectedWorkshop(workshop)}
                onApprove={handleApproveWorkshop}
                onSuspend={handleSuspendWorkshop}
                onReactivate={handleReactivateWorkshop}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Workshop Detail Modal */}
      {selectedWorkshop && (
        <WorkshopDetailModal
          workshop={selectedWorkshop}
          onClose={() => setSelectedWorkshop(null)}
          onApprove={handleApproveWorkshop}
          onSuspend={handleSuspendWorkshop}
          onReactivate={handleReactivateWorkshop}
          actionLoading={actionLoading}
        />
      )}
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

interface WorkshopRowProps {
  workshop: Workshop
  onSelect: () => void
  onApprove: (id: string) => Promise<void>
  onSuspend: (id: string) => Promise<void>
  onReactivate: (id: string) => Promise<void>
  actionLoading: boolean
}

function WorkshopRow({
  workshop,
  onSelect,
  onApprove,
  onSuspend,
  onReactivate,
  actionLoading
}: WorkshopRowProps) {
  const getStatusBadge = () => {
    switch (workshop.status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
            <Ban className="h-3 w-3" />
            Suspended
          </span>
        )
    }
  }

  return (
    <div className="p-4 hover:bg-slate-700/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Workshop Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-5 w-5 text-slate-500 flex-shrink-0" />
            <h3 className="font-semibold text-white truncate">
              {workshop.business_name || workshop.name}
            </h3>
            {getStatusBadge()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-400 ml-8">
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{workshop.email}</span>
            </div>
            {workshop.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{workshop.phone}</span>
              </div>
            )}
            {workshop.city && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{workshop.city}, {workshop.state_province || workshop.country}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 ml-8 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {workshop.mechanic_count || 0} mechanics
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {workshop.revenue_share_percentage}% revenue share
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(workshop.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onSelect}
            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>

          {workshop.status === 'pending' && (
            <button
              onClick={() => onApprove(workshop.id)}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Approve Workshop"
            >
              <CheckSquare className="h-4 w-4" />
            </button>
          )}

          {workshop.status === 'approved' && (
            <button
              onClick={() => onSuspend(workshop.id)}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Suspend Workshop"
            >
              <Ban className="h-4 w-4" />
            </button>
          )}

          {workshop.status === 'suspended' && (
            <button
              onClick={() => onReactivate(workshop.id)}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Reactivate Workshop"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface WorkshopDetailModalProps {
  workshop: Workshop
  onClose: () => void
  onApprove: (id: string) => Promise<void>
  onSuspend: (id: string) => Promise<void>
  onReactivate: (id: string) => Promise<void>
  actionLoading: boolean
}

function WorkshopDetailModal({
  workshop,
  onClose,
  onApprove,
  onSuspend,
  onReactivate,
  actionLoading
}: WorkshopDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Workshop Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="font-semibold text-white mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <DetailField label="Workshop Name" value={workshop.name} />
              <DetailField label="Business Name" value={workshop.business_name || 'N/A'} />
              <DetailField label="Email" value={workshop.email} />
              <DetailField label="Phone" value={workshop.phone || 'N/A'} />
              <DetailField label="Status" value={workshop.status} badge />
              <DetailField
                label="Revenue Share"
                value={`${workshop.revenue_share_percentage}%`}
              />
            </div>
          </div>

          {/* Location */}
          {(workshop.address || workshop.city) && (
            <div>
              <h3 className="font-semibold text-white mb-3">Location</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <DetailField label="Address" value={workshop.address || 'N/A'} fullWidth />
                <DetailField label="City" value={workshop.city || 'N/A'} />
                <DetailField
                  label="State/Province"
                  value={workshop.state_province || 'N/A'}
                />
                <DetailField label="Country" value={workshop.country || 'N/A'} />
              </div>
            </div>
          )}

          {/* Statistics */}
          <div>
            <h3 className="font-semibold text-white mb-3">Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 text-center">
                <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {workshop.mechanic_count || 0}
                </p>
                <p className="text-xs text-blue-400 mt-1">Mechanics</p>
              </div>
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-center">
                <TrendingUp className="h-6 w-6 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {workshop.total_sessions || 0}
                </p>
                <p className="text-xs text-green-400 mt-1">Sessions</p>
              </div>
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4 text-center">
                <DollarSign className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  ${(workshop.total_revenue || 0).toFixed(2)}
                </p>
                <p className="text-xs text-purple-400 mt-1">Revenue</p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div>
            <h3 className="font-semibold text-white mb-3">Timestamps</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <DetailField
                label="Created"
                value={new Date(workshop.created_at).toLocaleString()}
              />
              <DetailField
                label="Last Updated"
                value={new Date(workshop.updated_at).toLocaleString()}
              />
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
          >
            Close
          </button>

          {workshop.status === 'pending' && (
            <button
              onClick={() => onApprove(workshop.id)}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Approve Workshop
            </button>
          )}

          {workshop.status === 'approved' && (
            <button
              onClick={() => onSuspend(workshop.id)}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Ban className="h-4 w-4" />
              Suspend Workshop
            </button>
          )}

          {workshop.status === 'suspended' && (
            <button
              onClick={() => onReactivate(workshop.id)}
              disabled={actionLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Reactivate Workshop
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface DetailFieldProps {
  label: string
  value: string
  fullWidth?: boolean
  badge?: boolean
}

function DetailField({ label, value, fullWidth, badge }: DetailFieldProps) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      {badge ? (
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
            value === 'approved'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : value === 'pending'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {value}
        </span>
      ) : (
        <p className="text-sm text-white">{value}</p>
      )}
    </div>
  )
}