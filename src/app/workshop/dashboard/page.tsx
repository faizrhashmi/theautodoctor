// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Users,
  MapPin,
  DollarSign,
  UserPlus,
  Settings,
  LogOut,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  Calendar,
  AlertCircle,
  TrendingUp,
  Briefcase,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import InviteMechanicModal from '@/components/workshop/InviteMechanicModal'

interface WorkshopData {
  organization: {
    id: string
    name: string
    slug: string
    email: string
    phone: string
    address: string
    city: string
    province: string
    postal_code: string
    coverage_postal_codes: string[]
    service_radius_km: number
    mechanic_capacity: number
    commission_rate: number
    status: string
    verification_status: string
    stripe_account_id: string | null
    stripe_account_status: string | null
  }
  mechanics: Array<{
    id: string
    name: string
    email: string
    phone: string
    years_of_experience: number
    specializations: string[]
    red_seal_certified: boolean
    application_status: string
    created_at: string
  }>
  pendingInvites: Array<{
    id: string
    invite_code: string
    invite_email: string
    invited_at: string
    invite_expires_at: string
    status: string
  }>
  stats: {
    totalMechanics: number
    activeMechanics: number
    pendingInvites: number
    totalSessions: number
    totalRevenue: number
    workshopRevenue: number
  }
}

export default function WorkshopDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<WorkshopData | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'mechanics' | 'invites' | 'settings'>('overview')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/workshop/dashboard')
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login?redirect=/workshop/dashboard')
          return
        }
        setError(result.error || 'Failed to load dashboard')
        return
      }

      setData(result.data)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyInviteCode = (code: string) => {
    const inviteUrl = `${window.location.origin}/mechanic/signup/${code}`
    navigator.clipboard.writeText(inviteUrl)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h2 className="mt-4 text-xl font-semibold text-white">Error Loading Dashboard</h2>
          <p className="mt-2 text-sm text-red-200">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-6 rounded-lg bg-red-500 px-6 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  const { organization, mechanics, pendingInvites, stats } = data

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{organization.name}</h1>
                <p className="text-sm text-slate-400">Workshop Dashboard</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-800/60 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700/60"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {organization.status === 'pending' && (
        <div className="border-b border-yellow-400/30 bg-yellow-500/10 px-4 py-3">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <Clock className="h-5 w-5 flex-shrink-0 text-yellow-400" />
            <p className="text-sm font-medium text-yellow-200">
              Your workshop application is pending approval. You'll be notified once approved.
            </p>
          </div>
        </div>
      )}

      {organization.status === 'active' && !organization.stripe_account_id && (
        <div className="border-b border-blue-400/30 bg-blue-500/10 px-4 py-3">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-400" />
              <p className="text-sm font-medium text-blue-200">
                Connect your Stripe account to receive payouts
              </p>
            </div>
            <button className="rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-600">
              Connect Stripe
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-8 flex gap-2 overflow-x-auto border-b border-white/10">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'mechanics', label: 'Mechanics', icon: Users },
            { id: 'invites', label: 'Invitations', icon: Mail },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Stats Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={Users}
                  label="Total Mechanics"
                  value={stats.totalMechanics}
                  subtext={`${stats.activeMechanics} active`}
                  color="blue"
                />
                <StatCard
                  icon={Mail}
                  label="Pending Invites"
                  value={stats.pendingInvites}
                  subtext="Awaiting response"
                  color="yellow"
                />
                <StatCard
                  icon={Briefcase}
                  label="Total Sessions"
                  value={stats.totalSessions}
                  subtext="All-time"
                  color="green"
                />
                <StatCard
                  icon={DollarSign}
                  label="Workshop Revenue"
                  value={`$${stats.workshopRevenue.toFixed(2)}`}
                  subtext={`$${stats.totalRevenue.toFixed(2)} total platform`}
                  color="orange"
                />
              </div>

              {/* Quick Actions */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">Quick Actions</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-left transition hover:bg-orange-500/20"
                  >
                    <UserPlus className="h-6 w-6 text-orange-400" />
                    <div>
                      <p className="font-semibold text-white">Invite Mechanic</p>
                      <p className="text-sm text-slate-400">Send invitation code</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-800/40 p-4 text-left transition hover:bg-slate-700/40"
                  >
                    <Settings className="h-6 w-6 text-slate-400" />
                    <div>
                      <p className="font-semibold text-white">Update Settings</p>
                      <p className="text-sm text-slate-400">Manage your workshop</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Mechanics */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Recent Mechanics</h3>
                  <button
                    onClick={() => setActiveTab('mechanics')}
                    className="text-sm font-medium text-orange-400 hover:underline"
                  >
                    View All
                  </button>
                </div>
                {mechanics.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="mx-auto h-12 w-12 text-slate-600" />
                    <p className="mt-2 text-sm text-slate-400">No mechanics yet</p>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                    >
                      Invite Your First Mechanic
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mechanics.slice(0, 5).map((mech) => (
                      <div
                        key={mech.id}
                        className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-800/40 p-4"
                      >
                        <div>
                          <p className="font-medium text-white">{mech.name}</p>
                          <p className="text-sm text-slate-400">{mech.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-400">
                            {mech.years_of_experience} years exp.
                          </span>
                          <StatusBadge status={mech.application_status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'mechanics' && (
            <motion.div
              key="mechanics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    All Mechanics ({mechanics.length})
                  </h3>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite Mechanic
                  </button>
                </div>

                {mechanics.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="mx-auto h-16 w-16 text-slate-600" />
                    <p className="mt-4 text-slate-400">No mechanics in your workshop yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mechanics.map((mech) => (
                      <div
                        key={mech.id}
                        className="rounded-lg border border-white/5 bg-slate-800/40 p-5"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold text-white">{mech.name}</h4>
                              <StatusBadge status={mech.application_status} />
                              {mech.red_seal_certified && (
                                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-300">
                                  Red Seal
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-400">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5" />
                                {mech.email}
                              </span>
                              <span>{mech.years_of_experience} years experience</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Joined {new Date(mech.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {mech.specializations.map((spec, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-full bg-slate-700/50 px-3 py-1 text-xs font-medium text-slate-300"
                                >
                                  {spec}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'invites' && (
            <motion.div
              key="invites"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    Pending Invitations ({pendingInvites.length})
                  </h3>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                  >
                    <UserPlus className="h-4 w-4" />
                    New Invite
                  </button>
                </div>

                {pendingInvites.length === 0 ? (
                  <div className="py-12 text-center">
                    <Mail className="mx-auto h-16 w-16 text-slate-600" />
                    <p className="mt-4 text-slate-400">No pending invitations</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingInvites.map((invite) => {
                      const isExpired = new Date(invite.invite_expires_at) < new Date()
                      return (
                        <div
                          key={invite.id}
                          className="rounded-lg border border-white/5 bg-slate-800/40 p-5"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-white">
                                {invite.invite_email || 'General Invite'}
                              </p>
                              <p className="mt-1 text-sm text-slate-400">
                                Invited {new Date(invite.invited_at).toLocaleDateString()} •{' '}
                                {isExpired ? (
                                  <span className="text-red-400">Expired</span>
                                ) : (
                                  `Expires ${new Date(invite.invite_expires_at).toLocaleDateString()}`
                                )}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <code className="rounded bg-slate-900 px-2 py-1 text-xs font-mono text-slate-300">
                                  {invite.invite_code}
                                </code>
                                <button
                                  onClick={() => handleCopyInviteCode(invite.invite_code)}
                                  className="rounded bg-slate-700 p-1.5 text-slate-300 hover:bg-slate-600"
                                  title="Copy invite link"
                                >
                                  {copiedCode === invite.invite_code ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                            {isExpired && (
                              <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300">
                                Expired
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="space-y-6">
                {/* Organization Info */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-white">Organization Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoField label="Workshop Name" value={organization.name} />
                    <InfoField label="Slug" value={organization.slug} />
                    <InfoField label="Email" value={organization.email} />
                    <InfoField label="Phone" value={organization.phone} />
                    <InfoField
                      label="Address"
                      value={`${organization.address}, ${organization.city}, ${organization.province} ${organization.postal_code}`}
                      fullWidth
                    />
                  </div>
                </div>

                {/* Coverage */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-white">Coverage Area</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoField
                      label="Service Radius"
                      value={`${organization.service_radius_km} km`}
                    />
                    <InfoField
                      label="Mechanic Capacity"
                      value={`${mechanics.length} / ${organization.mechanic_capacity}`}
                    />
                  </div>
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-slate-400">Coverage Postal Codes</p>
                    <div className="flex flex-wrap gap-2">
                      {organization.coverage_postal_codes.map((code, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-orange-500/20 px-3 py-1 text-sm font-medium text-orange-300"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Financial */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-white">Financial Settings</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoField
                      label="Commission Rate"
                      value={`${organization.commission_rate}%`}
                    />
                    <InfoField
                      label="Stripe Status"
                      value={organization.stripe_account_status || 'Not Connected'}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteMechanicModal
          organizationId={organization.id}
          onClose={() => setShowInviteModal(false)}
          onSuccess={fetchDashboardData}
        />
      )}
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
  color: 'blue' | 'yellow' | 'green' | 'orange'
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    yellow: 'from-yellow-500 to-yellow-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
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

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    approved: { label: 'Active', color: 'bg-green-500/20 text-green-300' },
    pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-300' },
    rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-300' },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}

function InfoField({
  label,
  value,
  fullWidth = false,
}: {
  label: string
  value: string
  fullWidth?: boolean
}) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-white">{value}</p>
    </div>
  )
}
