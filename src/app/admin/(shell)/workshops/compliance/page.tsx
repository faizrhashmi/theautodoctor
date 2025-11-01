// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface WorkshopCompliance {
  organization_id: string
  organization_name: string
  organization_type: string
  contact_email: string
  contact_phone: string
  agreement_id: string | null
  agreement_version: string | null
  signed_at: string | null
  agreement_status: string | null
  insurance_verified: boolean
  insurance_expiry_date: string | null
  insurance_coverage_amount: number | null
  insurance_provider: string | null
  insurance_status: string
  days_until_insurance_expiry: number | null
  business_registration_verified: boolean
  business_number: string | null
  gst_hst_number: string | null
  is_compliant: boolean
  workshop_status: string
}

export default function WorkshopCompliancePage() {
  const [workshops, setWorkshops] = useState<WorkshopCompliance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'compliant' | 'non-compliant' | 'expiring'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchWorkshops = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/workshops/compliance')

      if (!response.ok) {
        throw new Error('Failed to fetch workshop compliance data')
      }

      const data = await response.json()
      setWorkshops(data.workshops || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching workshops:', err)
      setError(err instanceof Error ? err.message : 'Failed to load workshops')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkshops()
  }, [])

  const filteredWorkshops = workshops.filter((workshop) => {
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      if (
        !workshop.organization_name?.toLowerCase().includes(term) &&
        !workshop.contact_email?.toLowerCase().includes(term)
      ) {
        return false
      }
    }

    // Compliance filter
    if (filter === 'compliant' && !workshop.is_compliant) return false
    if (filter === 'non-compliant' && workshop.is_compliant) return false
    if (filter === 'expiring') {
      const expiringStatuses = ['expiring_critical', 'expiring_warning', 'expired']
      if (!expiringStatuses.includes(workshop.insurance_status)) return false
    }

    return true
  })

  const stats = {
    total: workshops.length,
    compliant: workshops.filter((w) => w.is_compliant).length,
    nonCompliant: workshops.filter((w) => !w.is_compliant).length,
    expired: workshops.filter((w) => w.insurance_status === 'expired').length,
    expiringCritical: workshops.filter((w) => w.insurance_status === 'expiring_critical').length,
    expiringWarning: workshops.filter((w) => w.insurance_status === 'expiring_warning').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading workshop compliance data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <h2 className="text-red-500 font-semibold">Error Loading Dashboard</h2>
          <p className="text-slate-300 mt-2">{error}</p>
          <button
            onClick={fetchWorkshops}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Workshop Compliance</h1>
          <p className="text-slate-400 mt-1">Monitor workshop agreements & insurance status</p>
        </div>
        <button
          onClick={fetchWorkshops}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Workshops"
          value={stats.total}
          icon="🏢"
          color="blue"
        />
        <StatCard
          title="Compliant"
          value={stats.compliant}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Non-Compliant"
          value={stats.nonCompliant}
          icon="⚠️"
          color={stats.nonCompliant > 0 ? "red" : "gray"}
          alert={stats.nonCompliant > 0}
        />
        <StatCard
          title="Expired Insurance"
          value={stats.expired}
          icon="🚫"
          color={stats.expired > 0 ? "red" : "gray"}
          alert={stats.expired > 0}
        />
        <StatCard
          title="Expiring (7d)"
          value={stats.expiringCritical}
          icon="⏰"
          color={stats.expiringCritical > 0 ? "orange" : "gray"}
          alert={stats.expiringCritical > 0}
        />
        <StatCard
          title="Expiring (30d)"
          value={stats.expiringWarning}
          icon="⏳"
          color={stats.expiringWarning > 0 ? "yellow" : "gray"}
        />
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by workshop name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <FilterButton
              active={filter === 'all'}
              onClick={() => setFilter('all')}
              label="All"
            />
            <FilterButton
              active={filter === 'compliant'}
              onClick={() => setFilter('compliant')}
              label="Compliant"
              color="green"
            />
            <FilterButton
              active={filter === 'non-compliant'}
              onClick={() => setFilter('non-compliant')}
              label="Non-Compliant"
              color="red"
            />
            <FilterButton
              active={filter === 'expiring'}
              onClick={() => setFilter('expiring')}
              label="Expiring"
              color="orange"
            />
          </div>
        </div>
      </div>

      {/* Workshops Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Workshop</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Insurance</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Expiry</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Agreement</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Compliance</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredWorkshops.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No workshops found matching filters
                  </td>
                </tr>
              ) : (
                filteredWorkshops.map((workshop) => (
                  <WorkshopRow key={workshop.organization_id} workshop={workshop} onUpdate={fetchWorkshops} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  color,
  alert = false,
}: {
  title: string
  value: number
  icon: string
  color: string
  alert?: boolean
}) {
  const colorClasses = {
    blue: 'border-blue-500/30 bg-blue-500/10',
    green: 'border-green-500/30 bg-green-500/10',
    red: 'border-red-500/30 bg-red-500/10',
    orange: 'border-orange-500/30 bg-orange-500/10',
    yellow: 'border-yellow-500/30 bg-yellow-500/10',
    gray: 'border-slate-700 bg-slate-800/50',
  }

  return (
    <div className={`border rounded-xl p-4 ${colorClasses[color] || colorClasses.gray} ${alert ? 'animate-pulse' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{title}</div>
    </div>
  )
}

// Filter Button Component
function FilterButton({
  active,
  onClick,
  label,
  color = 'blue',
}: {
  active: boolean
  onClick: () => void
  label: string
  color?: string
}) {
  const activeClass = active
    ? 'bg-blue-500 text-white'
    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeClass}`}
    >
      {label}
    </button>
  )
}

// Workshop Row Component
function WorkshopRow({
  workshop,
  onUpdate,
}: {
  workshop: WorkshopCompliance
  onUpdate: () => void
}) {
  const [suspending, setSuspending] = useState(false)
  const [activating, setActivating] = useState(false)

  const getInsuranceStatusBadge = (status: string) => {
    const badges = {
      valid: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Valid' },
      expiring_warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Expiring Soon' },
      expiring_critical: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Expiring!' },
      expired: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Expired' },
      pending_verification: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Pending' },
      no_insurance: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'No Insurance' },
    }

    const badge = badges[status] || badges.no_insurance
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const getComplianceBadge = (isCompliant: boolean) => {
    if (isCompliant) {
      return <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">✓ Compliant</span>
    }
    return <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">✗ Non-Compliant</span>
  }

  const getWorkshopStatusBadge = (status: string) => {
    const badges = {
      active: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Active' },
      suspended: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Suspended' },
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pending' },
      closed: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Closed' },
    }

    const badge = badges[status] || badges.pending
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-CA')
  }

  const handleSuspend = async () => {
    if (!confirm(`Suspend ${workshop.organization_name}? This will prevent them from receiving jobs.`)) {
      return
    }

    const reason = prompt('Reason for suspension:')
    if (!reason) return

    try {
      setSuspending(true)
      const response = await fetch('/api/admin/workshops/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: workshop.organization_id,
          reason,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to suspend workshop')
      }

      alert('Workshop suspended successfully')
      onUpdate()
    } catch (err) {
      alert('Error suspending workshop: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSuspending(false)
    }
  }

  const handleActivate = async () => {
    if (!workshop.is_compliant) {
      alert('Cannot activate: Workshop is not compliant (missing active agreement or valid insurance)')
      return
    }

    if (!confirm(`Activate ${workshop.organization_name}?`)) {
      return
    }

    try {
      setActivating(true)
      const response = await fetch('/api/admin/workshops/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: workshop.organization_id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to activate workshop')
      }

      alert('Workshop activated successfully')
      onUpdate()
    } catch (err) {
      alert('Error activating workshop: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setActivating(false)
    }
  }

  return (
    <tr className="hover:bg-slate-700/30 transition-colors">
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-white">{workshop.organization_name}</div>
          <div className="text-xs text-slate-400">{workshop.contact_email}</div>
        </div>
      </td>
      <td className="px-4 py-3">
        {getWorkshopStatusBadge(workshop.workshop_status)}
      </td>
      <td className="px-4 py-3">
        {getInsuranceStatusBadge(workshop.insurance_status)}
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-white">
          {formatDate(workshop.insurance_expiry_date)}
        </div>
        {workshop.days_until_insurance_expiry !== null && (
          <div className="text-xs text-slate-400">
            {workshop.days_until_insurance_expiry > 0
              ? `${workshop.days_until_insurance_expiry} days`
              : 'Expired'}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {workshop.agreement_status ? (
          <span className="text-sm text-slate-300">{workshop.agreement_status}</span>
        ) : (
          <span className="text-xs text-slate-500">No Agreement</span>
        )}
      </td>
      <td className="px-4 py-3">
        {getComplianceBadge(workshop.is_compliant)}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          {workshop.workshop_status === 'active' ? (
            <button
              onClick={handleSuspend}
              disabled={suspending}
              className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 disabled:opacity-50"
            >
              {suspending ? 'Suspending...' : 'Suspend'}
            </button>
          ) : workshop.workshop_status === 'suspended' ? (
            <button
              onClick={handleActivate}
              disabled={activating || !workshop.is_compliant}
              className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 disabled:opacity-50"
            >
              {activating ? 'Activating...' : 'Activate'}
            </button>
          ) : null}
          <Link
            href={`/admin/workshops/${workshop.organization_id}`}
            className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
          >
            View
          </Link>
        </div>
      </td>
    </tr>
  )
}
