'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { Search, Filter, CheckCircle, XCircle, Edit2, AlertCircle, Sparkles } from 'lucide-react'

type SpecialistMechanic = {
  id: string
  name: string
  email: string
  account_type: 'individual_mechanic' | 'workshop_mechanic'
  is_brand_specialist: boolean
  brand_specializations: string[]
  specialist_tier: 'general' | 'brand' | 'master'
  workshop_id: string | null
  workshop_name: string | null
  rating: number
  completed_sessions: number
  created_at: string
  specialist_approved_at: string | null
  specialist_approved_by: string | null
}

type FilterState = {
  search: string
  tier: string
  accountType: string
  approvalStatus: string
  workshop: string
}

const TIER_OPTIONS = [
  { value: '', label: 'All Tiers' },
  { value: 'brand', label: 'Brand Specialist' },
  { value: 'master', label: 'Master Technician' }
]

const ACCOUNT_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'individual_mechanic', label: 'Independent' },
  { value: 'workshop_mechanic', label: 'Workshop Employee' }
]

const APPROVAL_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending Approval' }
]

function TierBadge({ tier }: { tier: string }) {
  const colors = {
    master: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30',
    brand: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/30',
    general: 'bg-slate-700/50 text-slate-400 border-slate-600'
  }

  const labels = {
    master: 'Master Technician',
    brand: 'Brand Specialist',
    general: 'General'
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold ${colors[tier as keyof typeof colors] || colors.general}`}>
      {tier === 'master' && <Sparkles className="h-3 w-3" />}
      {labels[tier as keyof typeof labels] || tier}
    </span>
  )
}

function AccountTypeBadge({ type }: { type: string }) {
  const colors = {
    individual_mechanic: 'bg-green-500/20 text-green-300 border-green-500/30',
    workshop_mechanic: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
  }

  const labels = {
    individual_mechanic: 'Independent',
    workshop_mechanic: 'Workshop Employee'
  }

  return (
    <span className={`inline-flex rounded-lg border px-2 py-1 text-xs font-medium ${colors[type as keyof typeof colors] || 'bg-slate-700/50 text-slate-400 border-slate-600'}`}>
      {labels[type as keyof typeof labels] || type}
    </span>
  )
}

function ApprovalStatusIndicator({ approved }: { approved: boolean }) {
  if (approved) {
    return (
      <div className="flex items-center gap-1 text-green-400">
        <CheckCircle className="h-4 w-4" />
        <span className="text-xs font-medium">Approved</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 text-yellow-400">
      <AlertCircle className="h-4 w-4" />
      <span className="text-xs font-medium">Pending</span>
    </div>
  )
}

export default function SpecialistsManagementPage() {
  const { isLoading: authLoading, user } = useAuthGuard({ requiredRole: 'admin' })

  const [specialists, setSpecialists] = useState<SpecialistMechanic[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tier: '',
    accountType: '',
    approvalStatus: '',
    workshop: ''
  })
  const [selectedMechanic, setSelectedMechanic] = useState<SpecialistMechanic | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchSpecialists()
  }, [filters])

  async function fetchSpecialists() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.tier) params.set('tier', filters.tier)
      if (filters.accountType) params.set('accountType', filters.accountType)
      if (filters.approvalStatus) params.set('approvalStatus', filters.approvalStatus)
      if (filters.workshop) params.set('workshop', filters.workshop)

      const response = await fetch(`/api/admin/mechanics/specialists?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch specialists')

      const data = await response.json()
      setSpecialists(data.specialists || [])
    } catch (error) {
      console.error('Failed to fetch specialists:', error)
      setActionMessage({ type: 'error', text: 'Failed to load specialists' })
    } finally {
      setLoading(false)
    }
  }

  async function handleApproveSpecialist(mechanicId: string) {
    setActionLoading(true)
    setActionMessage(null)
    try {
      const response = await fetch(`/api/admin/mechanics/${mechanicId}/specialist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          specialist_approved_at: new Date().toISOString(),
          specialist_approved_by: user?.id
        })
      })

      if (!response.ok) throw new Error('Failed to approve specialist')

      setActionMessage({ type: 'success', text: 'Specialist approved successfully' })
      await fetchSpecialists()
      setSelectedMechanic(null)
    } catch (error) {
      setActionMessage({ type: 'error', text: 'Failed to approve specialist' })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRevokeSpecialist(mechanicId: string) {
    if (!confirm('Are you sure you want to revoke specialist status? This action cannot be undone.')) {
      return
    }

    setActionLoading(true)
    setActionMessage(null)
    try {
      const response = await fetch(`/api/admin/mechanics/${mechanicId}/specialist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke',
          is_brand_specialist: false,
          brand_specializations: [],
          specialist_tier: 'general'
        })
      })

      if (!response.ok) throw new Error('Failed to revoke specialist status')

      setActionMessage({ type: 'success', text: 'Specialist status revoked successfully' })
      await fetchSpecialists()
      setSelectedMechanic(null)
    } catch (error) {
      setActionMessage({ type: 'error', text: 'Failed to revoke specialist status' })
    } finally {
      setActionLoading(false)
    }
  }

  function resetFilters() {
    setFilters({
      search: '',
      tier: '',
      accountType: '',
      approvalStatus: '',
      workshop: ''
    })
  }

  const filteredSpecialists = specialists.filter(s => {
    if (filters.approvalStatus === 'approved' && !s.specialist_approved_at) return false
    if (filters.approvalStatus === 'pending' && s.specialist_approved_at) return false
    return true
  })

  const stats = {
    total: filteredSpecialists.length,
    brand: filteredSpecialists.filter(s => s.specialist_tier === 'brand').length,
    master: filteredSpecialists.filter(s => s.specialist_tier === 'master').length,
    independent: filteredSpecialists.filter(s => s.account_type === 'individual_mechanic').length,
    workshop: filteredSpecialists.filter(s => s.account_type === 'workshop_mechanic').length,
    pending: filteredSpecialists.filter(s => !s.specialist_approved_at).length
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Specialist Management</h1>
              <p className="mt-1 text-sm text-slate-400">
                Manage brand specialists and master technicians across all workshops
              </p>
            </div>
            <Link
              href="/admin/mechanics"
              className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              ← Back to Mechanics
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-slate-400">Total Specialists</div>
            </div>
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="text-2xl font-bold text-blue-300">{stats.brand}</div>
              <div className="text-xs text-blue-400">Brand Specialists</div>
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
              <div className="text-2xl font-bold text-purple-300">{stats.master}</div>
              <div className="text-xs text-purple-400">Master Techs</div>
            </div>
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
              <div className="text-2xl font-bold text-green-300">{stats.independent}</div>
              <div className="text-xs text-green-400">Independent</div>
            </div>
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
              <div className="text-2xl font-bold text-orange-300">{stats.workshop}</div>
              <div className="text-xs text-orange-400">Workshop</div>
            </div>
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
              <div className="text-2xl font-bold text-yellow-300">{stats.pending}</div>
              <div className="text-xs text-yellow-400">Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-400">
                <Search className="inline h-3 w-3 mr-1" />
                Search (name, email, brand)
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search specialists..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Tier</label>
              <select
                value={filters.tier}
                onChange={(e) => setFilters({ ...filters, tier: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500"
              >
                {TIER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Account Type</label>
              <select
                value={filters.accountType}
                onChange={(e) => setFilters({ ...filters, accountType: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500"
              >
                {ACCOUNT_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Approval</label>
              <select
                value={filters.approvalStatus}
                onChange={(e) => setFilters({ ...filters, approvalStatus: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500"
              >
                {APPROVAL_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <button
              onClick={resetFilters}
              className="text-sm text-slate-400 underline underline-offset-4 hover:text-slate-200"
            >
              Reset filters
            </button>
          </div>
        </div>

        {/* Action Message */}
        {actionMessage && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            actionMessage.type === 'success'
              ? 'border-green-500/30 bg-green-500/10 text-green-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}>
            {actionMessage.text}
          </div>
        )}

        {/* Specialists Table */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-700 bg-slate-800/30">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900/60 text-slate-200">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
                  <th>Mechanic</th>
                  <th>Type</th>
                  <th>Tier</th>
                  <th>Brands</th>
                  <th>Workshop</th>
                  <th>Performance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      Loading specialists...
                    </td>
                  </tr>
                )}
                {!loading && filteredSpecialists.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No specialists found
                    </td>
                  </tr>
                )}
                {filteredSpecialists.map((specialist) => (
                  <tr key={specialist.id} className="[&>td]:px-4 [&>td]:py-3 hover:bg-slate-800/50">
                    <td>
                      <div className="font-medium text-white">{specialist.name}</div>
                      <div className="text-xs text-slate-400">{specialist.email}</div>
                    </td>
                    <td>
                      <AccountTypeBadge type={specialist.account_type} />
                    </td>
                    <td>
                      <TierBadge tier={specialist.specialist_tier} />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {specialist.brand_specializations.slice(0, 3).map((brand, idx) => (
                          <span key={idx} className="inline-flex rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                            {brand}
                          </span>
                        ))}
                        {specialist.brand_specializations.length > 3 && (
                          <span className="text-xs text-slate-500">+{specialist.brand_specializations.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {specialist.workshop_name ? (
                        <div className="text-xs text-slate-300">{specialist.workshop_name}</div>
                      ) : (
                        <span className="text-xs text-slate-500">Independent</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-xs font-medium text-white">{specialist.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-400">{specialist.completed_sessions} sessions</span>
                      </div>
                    </td>
                    <td>
                      <ApprovalStatusIndicator approved={!!specialist.specialist_approved_at} />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {!specialist.specialist_approved_at && (
                          <button
                            onClick={() => handleApproveSpecialist(specialist.id)}
                            disabled={actionLoading}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleRevokeSpecialist(specialist.id)}
                          disabled={actionLoading}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Revoke
                        </button>
                        <Link
                          href={`/admin/mechanics/${specialist.id}`}
                          className="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
