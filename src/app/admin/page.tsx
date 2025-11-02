// src/app/admin/page.tsx
'use client'

import Link from 'next/link'
import {
  FileText,
  Video,
  Users,
  Settings,
  Clock,
  Trash2,
  Building2,
  Briefcase,
  AlertCircle,
  DollarSign,
  Database,
  Activity,
  Zap,
  FileSearch,
  BarChart3,
  Shield,
  Flag,
  Bell,
  HelpCircle,
  Archive,
  AlertTriangle
} from 'lucide-react'
import { DashboardStats } from '@/components/admin/DashboardStats'
import QuickNav from '@/components/admin/QuickNav'

export default function AdminPage() {
  return (
    <div className="pb-6">
      {/* Header */}
      <div className="mx-auto max-w-7xl px-4 pt-20 pb-6 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-slate-400">
            Comprehensive platform management and monitoring
          </p>
        </div>
      </div>

      {/* Quick Navigation */}
      <QuickNav />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="space-y-8">

      {/* Core Operations */}
      <Section id="core-operations" title="Core Operations" description="Primary admin functions">
        <AdminCard
          href="/admin/intakes"
          icon={<FileText className="h-6 w-6" />}
          title="Intakes"
          description="View and manage customer intake requests"
          color="blue"
        />
        <AdminCard
          href="/admin/sessions"
          icon={<Video className="h-6 w-6" />}
          title="Sessions"
          description="Monitor active and past video sessions"
          color="green"
        />
        <AdminCard
          href="/admin/claims"
          icon={<AlertCircle className="h-6 w-6" />}
          title="Claims"
          description="Handle satisfaction claims and refunds"
          color="red"
          badge="NEW"
        />
        <AdminCard
          href="/admin/requests"
          icon={<Bell className="h-6 w-6" />}
          title="Requests Queue"
          description="Manage unassigned service requests"
          color="yellow"
          badge="NEW"
        />
        <AdminCard
          href="/admin/unattended"
          icon={<Clock className="h-6 w-6" />}
          title="Unattended"
          description="Monitor unattended session requests"
          color="orange"
        />
      </Section>

      {/* User Management */}
      <Section id="user-management" title="User Management" description="Manage all platform users">
        <AdminCard
          href="/admin/customers"
          icon={<Users className="h-6 w-6" />}
          title="Customers"
          description="Manage customer accounts and activity"
          color="purple"
        />
        <AdminCard
          href="/admin/mechanics"
          icon={<Settings className="h-6 w-6" />}
          title="Mechanics"
          description="Manage mechanic accounts and approvals"
          color="orange"
        />
        <AdminCard
          href="/admin/mechanics/applications"
          icon={<FileSearch className="h-6 w-6" />}
          title="Mechanic Applications"
          description="Review pending mechanic applications"
          color="blue"
        />
        <AdminCard
          href="/admin/workshops"
          icon={<Building2 className="h-6 w-6" />}
          title="Workshops"
          description="Manage workshop registrations and approvals"
          color="indigo"
        />
        <AdminCard
          href="/admin/workshops/applications"
          icon={<FileSearch className="h-6 w-6" />}
          title="Workshop Applications"
          description="Review pending workshop applications"
          color="indigo"
        />
        <AdminCard
          href="/admin/corporate"
          icon={<Briefcase className="h-6 w-6" />}
          title="Corporate Accounts"
          description="Manage corporate accounts and invoicing"
          color="slate"
        />
      </Section>

      {/* Analytics & Monitoring */}
      <Section id="analytics" title="Analytics & Monitoring" description="Platform insights and performance">
        <AdminCard
          href="/admin/analytics/overview"
          icon={<BarChart3 className="h-6 w-6" />}
          title="Analytics Overview"
          description="Platform-wide metrics and insights"
          color="blue"
          badge="NEW"
        />
        <AdminCard
          href="/admin/analytics/workshop"
          icon={<Building2 className="h-6 w-6" />}
          title="Workshop Analytics"
          description="Workshop performance and health metrics"
          color="indigo"
        />
        <AdminCard
          href="/admin/logs"
          icon={<FileText className="h-6 w-6" />}
          title="System Logs"
          description="View platform activity and audit logs"
          color="slate"
        />
        <AdminCard
          href="/admin/errors"
          icon={<AlertCircle className="h-6 w-6" />}
          title="Error Tracking"
          description="Monitor and resolve system errors"
          color="red"
        />
        <AdminCard
          href="/admin/health"
          icon={<Activity className="h-6 w-6" />}
          title="System Health"
          description="Monitor platform health and uptime"
          color="green"
        />
        <AdminCard
          href="/admin/profile-completion"
          icon={<Users className="h-6 w-6" />}
          title="Profile Completion"
          description="Track mechanic profile completion rates"
          color="purple"
        />
      </Section>

      {/* System Tools */}
      <Section id="system-tools" title="System Tools" description="Advanced admin utilities">
        <AdminCard
          href="/admin/database"
          icon={<Database className="h-6 w-6" />}
          title="Database Tools"
          description="Execute SQL queries and manage data"
          color="slate"
        />
        <AdminCard
          href="/admin/cleanup"
          icon={<Zap className="h-6 w-6" />}
          title="Data Cleanup"
          description="Clean up old data and optimize storage"
          color="orange"
        />
        <AdminCard
          href="/admin/feature-flags"
          icon={<Flag className="h-6 w-6" />}
          title="Feature Flags"
          description="Manage feature toggles and experiments"
          color="blue"
        />
        <AdminCard
          href="/admin/plans"
          icon={<DollarSign className="h-6 w-6" />}
          title="Service Plans"
          description="Manage PAYG and subscription pricing tiers"
          color="green"
        />
        <AdminCard
          href="/admin/brands"
          icon={<Shield className="h-6 w-6" />}
          title="Brands Management"
          description="Manage vehicle brand specializations"
          color="indigo"
        />
        <AdminCard
          href="/admin/intakes/deletions"
          icon={<Trash2 className="h-6 w-6" />}
          title="Deletion Log"
          description="View audit log of deleted intake records"
          color="red"
        />
      </Section>

      {/* Emergency Tools */}
      <Section id="emergency-tools" title="Emergency Tools" description="Destructive operations - use with extreme caution">
        <AdminCard
          href="/admin/emergency"
          icon={<AlertTriangle className="h-6 w-6 animate-pulse" />}
          title="Nuclear Cleanup"
          description="Delete all sessions and requests from the database"
          color="red"
          badge="DANGER"
        />
      </Section>

      {/* Real-Time Stats */}
      <Section id="platform-overview" title="Platform Overview" description="Real-time platform metrics">
        <div className="col-span-full">
          <DashboardStats />
        </div>
      </Section>
        </div>
      </div>
    </div>
  )
}

interface SectionProps {
  id?: string
  title: string
  description: string
  children: React.ReactNode
}

function Section({ id, title, description, children }: SectionProps) {
  return (
    <div id={id} className="space-y-4 scroll-mt-32">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
    </div>
  )
}

interface AdminCardProps {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'slate' | 'indigo' | 'yellow'
  badge?: string
}

function AdminCard({ href, icon, title, description, color, badge }: AdminCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 group-hover:bg-green-500 group-hover:text-white border-green-500/30',
    purple: 'bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-400 group-hover:bg-orange-500 group-hover:text-white border-orange-500/30',
    red: 'bg-red-500/20 text-red-400 group-hover:bg-red-500 group-hover:text-white border-red-500/30',
    slate: 'bg-slate-500/20 text-slate-400 group-hover:bg-slate-500 group-hover:text-white border-slate-500/30',
    indigo: 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white border-indigo-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 group-hover:bg-yellow-500 group-hover:text-white border-yellow-500/30'
  }

  return (
    <Link
      href={href}
      className="group relative rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-4 transition hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20"
    >
      {badge && (
        <span className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow-lg">
          {badge}
        </span>
      )}
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg border transition ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="font-semibold text-white group-hover:text-orange-400 mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-400">
        {description}
      </p>
    </Link>
  )
}
