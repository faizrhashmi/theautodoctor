// @ts-nocheck
// src/app/admin/(shell)/workshops/WorkshopManagement.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Filter,
  MoreVertical,
  Check,
  X,
  DollarSign,
  Users,
  Building2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  CreditCard,
} from 'lucide-react'

interface Workshop {
  id: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  status: 'pending' | 'approved' | 'suspended' | 'rejected'
  stripe_connect_account_id: string | null
  stripe_onboarding_completed: boolean
  stripe_charges_enabled: boolean
  stripe_payouts_enabled: boolean
  platform_fee_percentage: number
  custom_fee_agreement: boolean
  created_at: string
  updated_at: string
  mechanics_count: number
  total_sessions: number
  total_revenue: number
  pending_payouts: number
}

interface Mechanic {
  id: string
  name: string
  email: string
  rating: number
  completed_sessions: number
}

interface WorkshopManagementProps {
  initialWorkshops: Workshop[]
  pendingApplications: any[]
  availableMechanics: Mechanic[]
}

export default function WorkshopManagement({
  initialWorkshops,
  pendingApplications,
  availableMechanics,
}: WorkshopManagementProps) {
  const router = useRouter()
  const [workshops, setWorkshops] = useState(initialWorkshops)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showAssignMechanics, setShowAssignMechanics] = useState(false)
  const [selectedMechanics, setSelectedMechanics] = useState<string[]>([])
  const [isUpdating, setIsUpdating] = useState(false)

  // Filter workshops based on search and status
  const filteredWorkshops = workshops.filter((workshop) => {
    const matchesSearch =
      workshop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workshop.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workshop.city.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || workshop.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleApproveWorkshop = async (workshopId: string) => {
    if (!confirm('Are you sure you want to approve this workshop?')) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/workshops/${workshopId}/approve`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to approve workshop')

      // Update local state
      setWorkshops((prev) =>
        prev.map((w) => (w.id === workshopId ? { ...w, status: 'approved' } : w))
      )

      // Refresh data
      router.refresh()
    } catch (error) {
      console.error('Error approving workshop:', error)
      alert('Failed to approve workshop. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRejectWorkshop = async (workshopId: string) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/workshops/${workshopId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) throw new Error('Failed to reject workshop')

      // Update local state
      setWorkshops((prev) =>
        prev.map((w) => (w.id === workshopId ? { ...w, status: 'rejected' } : w))
      )

      // Refresh data
      router.refresh()
    } catch (error) {
      console.error('Error rejecting workshop:', error)
      alert('Failed to reject workshop. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSuspendWorkshop = async (workshopId: string) => {
    const reason = prompt('Please provide a reason for suspension:')
    if (!reason) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/workshops/${workshopId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) throw new Error('Failed to suspend workshop')

      // Update local state
      setWorkshops((prev) =>
        prev.map((w) => (w.id === workshopId ? { ...w, status: 'suspended' } : w))
      )

      // Refresh data
      router.refresh()
    } catch (error) {
      console.error('Error suspending workshop:', error)
      alert('Failed to suspend workshop. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateFeePercentage = async (workshopId: string, newPercentage: number) => {
    if (newPercentage < 0 || newPercentage > 100) {
      alert('Fee percentage must be between 0 and 100')
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/workshops/${workshopId}/update-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform_fee_percentage: newPercentage }),
      })

      if (!response.ok) throw new Error('Failed to update fee percentage')

      // Update local state
      setWorkshops((prev) =>
        prev.map((w) =>
          w.id === workshopId ? { ...w, platform_fee_percentage: newPercentage } : w
        )
      )

      alert('Fee percentage updated successfully')
    } catch (error) {
      console.error('Error updating fee percentage:', error)
      alert('Failed to update fee percentage. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAssignMechanics = async () => {
    if (!selectedWorkshop || selectedMechanics.length === 0) return

    setIsUpdating(true)
    try {
      const response = await fetch(
        `/api/admin/workshops/${selectedWorkshop.id}/assign-mechanics`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mechanic_ids: selectedMechanics }),
        }
      )

      if (!response.ok) throw new Error('Failed to assign mechanics')

      alert(`Successfully assigned ${selectedMechanics.length} mechanics to ${selectedWorkshop.name}`)
      setShowAssignMechanics(false)
      setSelectedMechanics([])
      router.refresh()
    } catch (error) {
      console.error('Error assigning mechanics:', error)
      alert('Failed to assign mechanics. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-emerald-100 text-emerald-800',
      suspended: 'bg-red-100 text-red-800',
      rejected: 'bg-slate-100 text-slate-800',
    }
    return badges[status] || badges.pending
  }

  const getStripeStatus = (workshop: Workshop) => {
    if (!workshop.stripe_connect_account_id) return 'Not Connected'
    if (!workshop.stripe_onboarding_completed) return 'Onboarding Incomplete'
    if (!workshop.stripe_charges_enabled) return 'Charges Disabled'
    if (!workshop.stripe_payouts_enabled) return 'Payouts Disabled'
    return 'Fully Connected'
  }

  return (
    <>
      {/* Search and Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pending Applications Alert */}
      {pendingApplications.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-sm font-medium text-amber-800">
              {pendingApplications.length} workshop application{pendingApplications.length > 1 ? 's' : ''} pending review
            </p>
          </div>
        </div>
      )}

      {/* Workshops Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  Workshop
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  Stripe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  Mechanics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  Fee %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredWorkshops.map((workshop) => (
                <tr key={workshop.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-900">{workshop.name}</p>
                      <p className="text-sm text-slate-600">{workshop.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-900">
                      {workshop.city}, {workshop.state}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(
                        workshop.status
                      )}`}
                    >
                      {workshop.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-900">{getStripeStatus(workshop)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-900">{workshop.mechanics_count}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        ${workshop.total_revenue.toFixed(2)}
                      </p>
                      {workshop.pending_payouts > 0 && (
                        <p className="text-xs text-amber-600">
                          ${workshop.pending_payouts.toFixed(2)} pending
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-900">{workshop.platform_fee_percentage}%</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {workshop.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveWorkshop(workshop.id)}
                            disabled={isUpdating}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectWorkshop(workshop.id)}
                            disabled={isUpdating}
                            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {workshop.status === 'approved' && (
                        <button
                          onClick={() => handleSuspendWorkshop(workshop.id)}
                          disabled={isUpdating}
                          className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          Suspend
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedWorkshop(workshop)
                          setShowDetails(true)
                        }}
                        className="rounded-lg bg-slate-600 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700"
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredWorkshops.length === 0 && (
            <div className="py-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-600">No workshops found</p>
            </div>
          )}
        </div>
      </div>

      {/* Workshop Details Modal */}
      {showDetails && selectedWorkshop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Workshop Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Basic Information</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-600">Name</p>
                    <p className="text-sm font-medium text-slate-900">{selectedWorkshop.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Status</p>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(
                        selectedWorkshop.status
                      )}`}
                    >
                      {selectedWorkshop.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Email</p>
                    <p className="text-sm font-medium text-slate-900">{selectedWorkshop.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Phone</p>
                    <p className="text-sm font-medium text-slate-900">{selectedWorkshop.phone}</p>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Address</h4>
                <p className="text-sm text-slate-900">
                  {selectedWorkshop.address}<br />
                  {selectedWorkshop.city}, {selectedWorkshop.state} {selectedWorkshop.zip}
                </p>
              </div>

              {/* Financial */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Financial Details</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-600">Total Revenue</p>
                    <p className="text-sm font-medium text-slate-900">
                      ${selectedWorkshop.total_revenue.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Pending Payouts</p>
                    <p className="text-sm font-medium text-slate-900">
                      ${selectedWorkshop.pending_payouts.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Platform Fee</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={selectedWorkshop.platform_fee_percentage}
                        onChange={(e) => {
                          const newValue = parseFloat(e.target.value)
                          setSelectedWorkshop({
                            ...selectedWorkshop,
                            platform_fee_percentage: newValue,
                          })
                        }}
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <span className="text-sm text-slate-900">%</span>
                      <button
                        onClick={() =>
                          handleUpdateFeePercentage(
                            selectedWorkshop.id,
                            selectedWorkshop.platform_fee_percentage
                          )
                        }
                        disabled={isUpdating}
                        className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Stripe Status</p>
                    <p className="text-sm font-medium text-slate-900">
                      {getStripeStatus(selectedWorkshop)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowDetails(false)
                    setShowAssignMechanics(true)
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Assign Mechanics
                </button>
                {selectedWorkshop.status === 'approved' && (
                  <button
                    onClick={() => {
                      handleSuspendWorkshop(selectedWorkshop.id)
                      setShowDetails(false)
                    }}
                    disabled={isUpdating}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    Suspend Workshop
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Mechanics Modal */}
      {showAssignMechanics && selectedWorkshop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Assign Mechanics to {selectedWorkshop.name}
              </h3>
              <button
                onClick={() => {
                  setShowAssignMechanics(false)
                  setSelectedMechanics([])
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {availableMechanics.length > 0 ? (
                <div className="space-y-2">
                  {availableMechanics.map((mechanic) => (
                    <label
                      key={mechanic.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMechanics.includes(mechanic.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMechanics([...selectedMechanics, mechanic.id])
                          } else {
                            setSelectedMechanics(
                              selectedMechanics.filter((id) => id !== mechanic.id)
                            )
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{mechanic.name}</p>
                        <p className="text-xs text-slate-600">{mechanic.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-900">⭐ {mechanic.rating.toFixed(1)}</p>
                        <p className="text-xs text-slate-600">{mechanic.completed_sessions} sessions</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-600">No available mechanics</p>
                  <p className="text-xs text-slate-500">All approved mechanics are already assigned</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAssignMechanics(false)
                  setSelectedMechanics([])
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignMechanics}
                disabled={isUpdating || selectedMechanics.length === 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Assign {selectedMechanics.length} Mechanic{selectedMechanics.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}