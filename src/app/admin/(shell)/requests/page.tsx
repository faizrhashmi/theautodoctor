// @ts-nocheck
'use client'

/**
 * Admin Requests Queue Page
 * Manage unassigned service requests and manual mechanic assignment
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  User,
  Calendar,
  MapPin,
  Car,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  UserPlus
} from 'lucide-react'

interface ServiceRequest {
  id: string
  customer_user_id: string
  vehicle_make: string
  vehicle_model: string
  vehicle_year: number
  issue_description: string
  location: string
  status: 'pending' | 'assigned' | 'cancelled'
  created_at: string
  assigned_mechanic_id: string | null
}

interface Mechanic {
  id: string
  name: string
  email: string
  is_available: boolean
  specializations: string[]
}

export default function RequestsQueuePage() {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [mechanics, setMechanics] = useState<Mechanic[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'assigned' | 'cancelled'>(
    'pending'
  )
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)
  const [assigningTo, setAssigningTo] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch requests
      const reqResponse = await fetch('/api/admin/requests')
      if (!reqResponse.ok) throw new Error('Failed to fetch requests')
      const reqData = await reqResponse.json()
      setRequests(reqData.requests || [])

      // Fetch available mechanics
      const mechResponse = await fetch('/api/admin/users/mechanics')
      if (!mechResponse.ok) throw new Error('Failed to fetch mechanics')
      const mechData = await mechResponse.json()
      setMechanics(mechData.mechanics || [])
    } catch (error: any) {
      console.error('Error fetching data:', error)
      alert('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAssignMechanic = async (requestId: string, mechanicId: string) => {
    if (!confirm('Assign this request to the selected mechanic?')) return

    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/requests/${requestId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mechanicId })
      })

      if (!response.ok) throw new Error('Failed to assign mechanic')

      alert('Request assigned successfully')
      setSelectedRequest(null)
      setAssigningTo(null)
      await fetchData()
    } catch (error: any) {
      console.error('Error assigning mechanic:', error)
      alert(error.message || 'Failed to assign mechanic')
    } finally {
      setActionLoading(false)
    }
  }

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    // Status filter
    if (statusFilter !== 'all' && req.status !== statusFilter) return false

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        req.vehicle_make?.toLowerCase().includes(query) ||
        req.vehicle_model?.toLowerCase().includes(query) ||
        req.issue_description?.toLowerCase().includes(query) ||
        req.location?.toLowerCase().includes(query)
      )
    }

    return true
  })

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    assigned: requests.filter((r) => r.status === 'assigned').length,
    cancelled: requests.filter((r) => r.status === 'cancelled').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-slate-400">Loading requests...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Service Requests Queue</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage unassigned requests and manually assign mechanics
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Requests"
          value={stats.total}
          icon={<Bell className="h-5 w-5 text-blue-600" />}
          bgColor="bg-blue-50"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={<Clock className="h-5 w-5 text-yellow-600" />}
          bgColor="bg-yellow-50"
          badge={stats.pending > 0}
        />
        <StatCard
          label="Assigned"
          value={stats.assigned}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          bgColor="bg-green-50"
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelled}
          icon={<XCircle className="h-5 w-5 text-red-600" />}
          bgColor="bg-red-50"
        />
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by vehicle, issue, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'pending' | 'assigned' | 'cancelled')
              }
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/25 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No requests found</p>
            <p className="text-sm text-slate-500 mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Requests will appear here when customers submit them'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredRequests.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                mechanics={mechanics}
                onAssign={(mechanicId) => handleAssignMechanic(request.id, mechanicId)}
                actionLoading={actionLoading}
              />
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
  badge?: boolean
}

function StatCard({ label, value, icon, bgColor, badge }: StatCardProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 ${bgColor} rounded-lg`}>{icon}</div>
        {badge && (
          <span className="text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded">
            ACTION NEEDED
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  )
}

interface RequestRowProps {
  request: ServiceRequest
  mechanics: Mechanic[]
  onAssign: (mechanicId: string) => Promise<void>
  actionLoading: boolean
}

function RequestRow({ request, mechanics, onAssign, actionLoading }: RequestRowProps) {
  const [selectedMechanic, setSelectedMechanic] = useState('')

  const getStatusBadge = () => {
    switch (request.status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )
      case 'assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
            <CheckCircle className="h-3 w-3" />
            Assigned
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
            <XCircle className="h-3 w-3" />
            Cancelled
          </span>
        )
    }
  }

  return (
    <div className="p-4 hover:bg-slate-900/50 transition">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Request Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-white">
              {request.vehicle_year} {request.vehicle_make} {request.vehicle_model}
            </h3>
            {getStatusBadge()}
          </div>

          <p className="text-sm text-slate-200 mb-2 line-clamp-2">{request.issue_description}</p>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {request.location || 'No location'}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(request.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Right: Assignment */}
        {request.status === 'pending' && (
          <div className="flex items-center gap-2">
            <select
              value={selectedMechanic}
              onChange={(e) => setSelectedMechanic(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              disabled={actionLoading}
            >
              <option value="">Select Mechanic...</option>
              {mechanics
                .filter((m) => m.is_available)
                .map((mechanic) => (
                  <option key={mechanic.id} value={mechanic.id}>
                    {mechanic.name}
                  </option>
                ))}
            </select>
            <button
              onClick={() => selectedMechanic && onAssign(selectedMechanic)}
              disabled={!selectedMechanic || actionLoading}
              className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/25 text-white text-sm font-medium rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50 transition flex items-center gap-1"
            >
              <UserPlus className="h-3 w-3" />
              Assign
            </button>
          </div>
        )}

        {request.status === 'assigned' && request.assigned_mechanic_id && (
          <div className="text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
            Assigned to mechanic
          </div>
        )}
      </div>
    </div>
  )
}
