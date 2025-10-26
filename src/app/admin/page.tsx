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
  Archive
} from 'lucide-react'

export default function AdminPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Comprehensive platform management and monitoring
        </p>
      </div>

      {/* Core Operations */}
      <Section title="Core Operations" description="Primary admin functions">
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
      <Section title="User Management" description="Manage all platform users">
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
      <Section title="Analytics & Monitoring" description="Platform insights and performance">
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
      <Section title="System Tools" description="Advanced admin utilities">
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

      {/* Quick Stats (Placeholder - will be populated with real data) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value="Loading..." color="blue" />
        <StatCard label="Active Sessions" value="Loading..." color="green" />
        <StatCard label="Pending Claims" value="Loading..." color="red" />
        <StatCard label="Revenue Today" value="Loading..." color="purple" />
      </div>
    </div>
  )
}

interface SectionProps {
  title: string
  description: string
  children: React.ReactNode
}

function Section({ title, description, children }: SectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{description}</p>
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
    blue: 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    green: 'bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white',
    purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
    orange: 'bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white',
    red: 'bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white',
    slate: 'bg-slate-100 text-slate-600 group-hover:bg-slate-600 group-hover:text-white',
    indigo: 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
    yellow: 'bg-yellow-100 text-yellow-600 group-hover:bg-yellow-600 group-hover:text-white'
  }

  return (
    <Link
      href={href}
      className="group relative rounded-lg border border-slate-200 bg-white p-4 transition hover:border-orange-500 hover:shadow-md"
    >
      {badge && (
        <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded">
          {badge}
        </span>
      )}
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg transition ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 group-hover:text-orange-600 mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-600">
        {description}
      </p>
    </Link>
  )
}

interface StatCardProps {
  label: string
  value: string
  color: string
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  )
}