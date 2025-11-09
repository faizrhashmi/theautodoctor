'use client'

/**
 * Admin Workshop Detail Page
 * View detailed information about a specific workshop
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  Ban,
  ArrowLeft,
  Users,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Settings,
  ShieldCheck,
  FileText
} from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'

interface Workshop {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  city: string | null
  province: string | null
  country: string | null
  postal_code: string | null
  status: 'pending' | 'approved' | 'suspended'
  stripe_account_id: string | null
  stripe_payouts_enabled: boolean
  stripe_charges_enabled: boolean
  created_at: string
  updated_at: string
  mechanic_count?: number
  total_sessions?: number
  total_revenue?: number
}

interface WorkshopDetailPageProps {
  params: Promise<{ id: string }>
}

export default function WorkshopDetailPage({ params }: WorkshopDetailPageProps) {
  const router = useRouter()

  // ✅ Auth guard - requires admin role
  useAuthGuard({ requiredRole: 'admin' })

  const [workshopId, setWorkshopId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Unwrap params Promise
  useEffect(() => {
    params.then(({ id }) => {
      setWorkshopId(id)
    })
  }, [params])

  useEffect(() => {
    async function fetchWorkshopDetails() {
      if (!workshopId) return

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/admin/workshops/${workshopId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch workshop details')
        }

        const data = await response.json()
        setWorkshop(data.workshop)
      } catch (err: any) {
        console.error('Error fetching workshop details:', err)
        setError(err.message || 'Failed to load workshop')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkshopDetails()
  }, [workshopId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="ml-4 text-slate-400">Loading workshop details...</p>
        </div>
      </div>
    )
  }

  if (error || !workshop) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-300 mb-2">Failed to Load Workshop</h3>
            <p className="text-sm text-slate-400 mb-4">{error || 'Workshop not found'}</p>
            <button
              onClick={() => router.push('/admin/workshops')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Workshops
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/workshops')}
            className="p-2 hover:bg-slate-800 rounded-lg transition"
          >
            <ArrowLeft className="h-5 w-5 text-slate-400" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-white">{workshop.name}</h1>
              <StatusBadge status={workshop.status} />
            </div>
            <p className="text-sm text-slate-400">Workshop ID: {workshop.id}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-blue-400" />}
          label="Mechanics"
          value={workshop.mechanic_count || 0}
          color="blue"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-green-400" />}
          label="Total Sessions"
          value={workshop.total_sessions || 0}
          color="green"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-purple-400" />}
          label="Revenue"
          value={`$${(workshop.total_revenue || 0).toFixed(2)}`}
          color="purple"
        />
        <StatCard
          icon={<ShieldCheck className="h-5 w-5 text-orange-400" />}
          label="Stripe Status"
          value={workshop.stripe_payouts_enabled ? 'Active' : 'Pending'}
          color={workshop.stripe_payouts_enabled ? 'green' : 'orange'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Section title="Contact Information" icon={<Mail className="h-5 w-5" />}>
          <InfoRow label="Email" value={workshop.email} icon={<Mail className="h-4 w-4" />} />
          {workshop.phone && (
            <InfoRow label="Phone" value={workshop.phone} icon={<Phone className="h-4 w-4" />} />
          )}
        </Section>

        {/* Location */}
        <Section title="Location" icon={<MapPin className="h-5 w-5" />}>
          {workshop.address && (
            <InfoRow label="Address" value={workshop.address} icon={<MapPin className="h-4 w-4" />} />
          )}
          {workshop.city && (
            <InfoRow
              label="City / Province"
              value={[workshop.city, workshop.province].filter(Boolean).join(', ')}
              icon={<MapPin className="h-4 w-4" />}
            />
          )}
          {workshop.country && (
            <InfoRow label="Country" value={workshop.country} icon={<MapPin className="h-4 w-4" />} />
          )}
          {workshop.postal_code && (
            <InfoRow label="Postal Code" value={workshop.postal_code} icon={<MapPin className="h-4 w-4" />} />
          )}
        </Section>

        {/* System Information */}
        <Section title="System Information" icon={<Settings className="h-5 w-5" />}>
          <InfoRow
            label="Created"
            value={new Date(workshop.created_at).toLocaleString()}
            icon={<Calendar className="h-4 w-4" />}
          />
          <InfoRow
            label="Last Updated"
            value={new Date(workshop.updated_at).toLocaleString()}
            icon={<Calendar className="h-4 w-4" />}
          />
        </Section>

        {/* Stripe Integration */}
        <Section title="Stripe Integration" icon={<DollarSign className="h-5 w-5" />}>
          <InfoRow
            label="Account ID"
            value={workshop.stripe_account_id || 'Not connected'}
            icon={<FileText className="h-4 w-4" />}
          />
          <InfoRow
            label="Charges Enabled"
            value={workshop.stripe_charges_enabled ? 'Yes' : 'No'}
            icon={<CheckCircle className="h-4 w-4" />}
            valueColor={workshop.stripe_charges_enabled ? 'text-green-400' : 'text-slate-400'}
          />
          <InfoRow
            label="Payouts Enabled"
            value={workshop.stripe_payouts_enabled ? 'Yes' : 'No'}
            icon={<CheckCircle className="h-4 w-4" />}
            valueColor={workshop.stripe_payouts_enabled ? 'text-green-400' : 'text-slate-400'}
          />
        </Section>
      </div>

      {/* Actions */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Workshop Actions</h3>
        <div className="flex flex-wrap gap-3">
          {workshop.status === 'pending' && (
            <ActionButton
              label="Approve Workshop"
              icon={<CheckCircle className="h-4 w-4" />}
              onClick={() => {/* TODO: Implement approve */}}
              color="green"
            />
          )}
          {workshop.status === 'approved' && (
            <ActionButton
              label="Suspend Workshop"
              icon={<Ban className="h-4 w-4" />}
              onClick={() => {/* TODO: Implement suspend */}}
              color="red"
            />
          )}
          {workshop.status === 'suspended' && (
            <ActionButton
              label="Reactivate Workshop"
              icon={<CheckCircle className="h-4 w-4" />}
              onClick={() => {/* TODO: Implement reactivate */}}
              color="green"
            />
          )}
          <ActionButton
            label="View Mechanics"
            icon={<Users className="h-4 w-4" />}
            onClick={() => router.push(`/admin/mechanics?workshop=${workshop.id}`)}
            color="blue"
          />
          <ActionButton
            label="Fee Override Settings"
            icon={<DollarSign className="h-4 w-4" />}
            onClick={() => router.push(`/admin/workshop-rates?workshop=${workshop.id}`)}
            color="purple"
          />
        </div>
      </div>
    </div>
  )
}

// Helper Components
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  color: 'blue' | 'green' | 'purple' | 'orange'
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
      <div className={`inline-flex p-2 rounded-lg border mb-3 ${colorClasses[color]}`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}

function Section({ title, icon, children }: SectionProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-slate-400">{icon}</div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

interface InfoRowProps {
  label: string
  value: string
  icon: React.ReactNode
  valueColor?: string
}

function InfoRow({ label, value, icon, valueColor = 'text-white' }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-700 last:border-0">
      <div className="text-slate-500 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        <p className={`text-sm font-medium ${valueColor} break-words`}>{value}</p>
      </div>
    </div>
  )
}

interface ActionButtonProps {
  label: string
  icon: React.ReactNode
  onClick: () => void
  color: 'blue' | 'green' | 'red' | 'purple'
}

function ActionButton({ label, icon, onClick, color }: ActionButtonProps) {
  const colorClasses = {
    blue: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30',
    red: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30',
    purple: 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border-purple-500/30',
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition ${colorClasses[color]}`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  )
}

function StatusBadge({ status }: { status: Workshop['status'] }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-3 py-1 text-sm font-semibold text-green-300 border border-green-400/40">
        <CheckCircle className="h-4 w-4" />
        Approved
      </span>
    )
  }

  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-3 py-1 text-sm font-semibold text-yellow-300 border border-yellow-400/40">
        <Clock className="h-4 w-4" />
        Pending
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-sm font-semibold text-red-300 border border-red-400/40">
      <Ban className="h-4 w-4" />
      Suspended
    </span>
  )
}
