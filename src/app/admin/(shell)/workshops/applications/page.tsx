// @ts-nocheck
'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  Search,
  Building2,
  MapPin,
  Users,
  DollarSign,
  Mail,
  Phone,
  Globe,
  FileText,
  Shield,
  Briefcase,
} from 'lucide-react'

interface WorkshopApplication {
  id: string
  created_at: string
  name: string
  slug: string
  email: string
  phone: string
  status: string
  verification_status: string

  // Business Details
  business_registration_number: string
  tax_id: string
  website: string
  industry: string

  // Address
  address: string
  city: string
  province: string
  postal_code: string

  // Coverage
  coverage_postal_codes: string[]
  service_radius_km: number

  // Settings
  mechanic_capacity: number
  commission_rate: number

  // Stripe
  stripe_account_id: string | null
  stripe_account_status: string | null

  // Created by
  created_by: string
  contact_name: string
}

export default function WorkshopApplicationsPage() {
  const [applications, setApplications] = useState<WorkshopApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedApp, setSelectedApp] = useState<WorkshopApplication | null>(null)

  const loadApplications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/workshops/applications?status=${filter}`)
      const data = await res.json()
      if (res.ok) {
        setApplications(data.applications || [])
      }
    } catch (e) {
      console.error('Failed to load applications:', e)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadApplications()
  }, [loadApplications])

  const handleAction = async (
    id: string,
    action: 'approve' | 'reject',
    notes?: string
  ) => {
    try {
      const res = await fetch(`/api/admin/workshops/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      if (res.ok) {
        await loadApplications()
        setSelectedApp(null)
        alert(`Application ${action}d successfully`)
      } else {
        const data = await res.json()
        alert(data.error || 'Action failed')
      }
    } catch (e) {
      console.error('Action failed:', e)
      alert('Action failed')
    }
  }

  const filteredApplications = applications.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.city.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    pending: applications.filter((a) => a.status === 'pending').length,
    active: applications.filter((a) => a.status === 'active').length,
    suspended: applications.filter((a) => a.status === 'suspended').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Workshop Applications</h1>
        <p className="mt-1 text-sm text-slate-400">Review and approve workshop applications</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          color="orange"
          active={filter === 'pending'}
          onClick={() => setFilter('pending')}
        />
        <StatCard
          label="Active"
          value={stats.active}
          icon={CheckCircle2}
          color="green"
          active={filter === 'active'}
          onClick={() => setFilter('active')}
        />
        <StatCard
          label="Suspended"
          value={stats.suspended}
          icon={AlertCircle}
          color="yellow"
          active={filter === 'suspended'}
          onClick={() => setFilter('suspended')}
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={XCircle}
          color="red"
          active={filter === 'rejected'}
          onClick={() => setFilter('rejected')}
        />
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by workshop name, email, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm py-2 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-2 text-sm text-slate-400">Loading applications...</p>
          </div>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-sm font-medium text-white">No applications found</p>
          <p className="mt-1 text-sm text-slate-400">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onView={() => setSelectedApp(app)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <ApplicationDetailModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onAction={handleAction}
        />
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  active,
  onClick,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  active: boolean
  onClick: () => void
}) {
  const colors = {
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <button
      onClick={onClick}
      className={`rounded-lg border-2 p-4 text-left transition ${
        active ? colors[color as keyof typeof colors] : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${active ? '' : 'text-slate-400'}`} />
      </div>
    </button>
  )
}

function ApplicationCard({
  application,
  onView,
}: {
  application: WorkshopApplication
  onView: () => void
}) {
  const statusColors = {
    pending: 'bg-orange-100 text-orange-700',
    active: 'bg-green-100 text-green-700',
    suspended: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-white">{application.name}</h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                statusColors[application.status as keyof typeof statusColors]
              }`}
            >
              {application.status.toUpperCase()}
            </span>
          </div>

          <div className="mt-2 space-y-1 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{application.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{application.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>
                {application.city}, {application.province}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400">Capacity: {application.mechanic_capacity}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400">Commission: {application.commission_rate}%</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400">Radius: {application.service_radius_km} km</span>
            </div>
            {application.stripe_account_id && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-slate-400">Stripe Connected</span>
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Submitted: {new Date(application.created_at).toLocaleDateString()}
          </div>
        </div>

        <button
          onClick={onView}
          className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-700"
        >
          <Eye className="h-4 w-4" />
          Review
        </button>
      </div>
    </div>
  )
}

function ApplicationDetailModal({
  application,
  onClose,
  onAction,
}: {
  application: WorkshopApplication
  onClose: () => void
  onAction: (id: string, action: 'approve' | 'reject', notes?: string) => void
}) {
  const [notes, setNotes] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{application.name}</h2>
              <p className="mt-1 text-sm text-slate-400">{application.email}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-400"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Contact Information */}
          <Section icon={Mail} title="Contact Information">
            <InfoRow label="Workshop Name" value={application.name} />
            <InfoRow label="Contact Person" value={application.contact_name || 'N/A'} />
            <InfoRow label="Email" value={application.email} />
            <InfoRow label="Phone" value={application.phone} />
            {application.website && <InfoRow label="Website" value={application.website} />}
          </Section>

          {/* Business Details */}
          <Section icon={Briefcase} title="Business Details">
            <InfoRow label="Industry" value={application.industry || 'N/A'} />
            <InfoRow label="Business Registration" value={application.business_registration_number} />
            <InfoRow label="Tax ID" value={application.tax_id} />
            <InfoRow label="Slug" value={application.slug} />
          </Section>

          {/* Location & Coverage */}
          <Section icon={MapPin} title="Location & Coverage">
            <InfoRow label="Address" value={application.address} />
            <InfoRow label="City" value={application.city} />
            <InfoRow label="Province" value={application.province} />
            <InfoRow label="Postal Code" value={application.postal_code} />
            <InfoRow label="Service Radius" value={`${application.service_radius_km} km`} />
            <div className="mt-3">
              <p className="mb-2 text-sm font-medium text-slate-400">Coverage Postal Codes:</p>
              <div className="flex flex-wrap gap-2">
                {application.coverage_postal_codes.map((code, idx) => (
                  <span
                    key={idx}
                    className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          </Section>

          {/* Workshop Settings */}
          <Section icon={Users} title="Workshop Settings">
            <InfoRow label="Mechanic Capacity" value={application.mechanic_capacity.toString()} />
            <InfoRow label="Commission Rate" value={`${application.commission_rate}%`} />
          </Section>

          {/* Stripe Integration */}
          <Section icon={DollarSign} title="Payment Integration">
            <InfoRow
              label="Stripe Account"
              value={application.stripe_account_id || 'Not Connected'}
            />
            <InfoRow
              label="Stripe Status"
              value={application.stripe_account_status || 'N/A'}
            />
          </Section>

          {/* Verification Status */}
          <div className="rounded-lg border border-slate-700 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
            <h3 className="font-semibold text-white">Verification Status</h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Application Status:</span>
                <span className="font-medium text-white">{application.status}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Verification Status:</span>
                <span className="font-medium text-white">
                  {application.verification_status}
                </span>
              </div>
            </div>
          </div>

          {/* Action Section */}
          {application.status === 'pending' ? (
            <div className="rounded-lg border border-slate-700 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
              <h3 className="font-semibold text-white">Take Action</h3>
              <p className="mt-1 text-sm text-slate-400">
                Review the application and take appropriate action
              </p>

              <div className="mt-4 space-y-4">
                <textarea
                  placeholder="Add notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 p-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  rows={3}
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => onAction(application.id, 'approve', notes)}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve Workshop
                  </button>
                  <button
                    onClick={() => onAction(application.id, 'reject', notes)}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Application
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-700 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-center">
              <p className="text-sm text-slate-400">
                This application has been {application.status}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-slate-700 p-6">
      <div className="mb-4 flex items-center gap-3">
        <Icon className="h-5 w-5 text-orange-600" />
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}:</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  )
}
