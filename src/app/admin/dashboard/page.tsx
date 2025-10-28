'use client'

import Link from 'next/link'
import { DashboardStats as DashboardOverview } from '@/components/admin/DashboardStats'
import { useAuthGuard } from '@/hooks/useAuthGuard'

export default function AdminDashboardPage() {
  // ✅ Auth guard - requires admin role
  const { isLoading: authLoading, user } = useAuthGuard({ requiredRole: 'admin' })

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-900/50 py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-10">
        <header>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">Real-time platform performance and management tools</p>
        </header>

        <section>
          <DashboardOverview />
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link
            href="/admin/fees"
            className="bg-slate-800/50 backdrop-blur-sm rounded-lg shadow p-6 transition hover:border-orange-500 hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-white mb-2">Fee Rules Management</h2>
            <p className="text-slate-400 text-sm">
              Configure platform fee structures and track applied rules in real time.
            </p>
          </Link>

          <Link
            href="/admin/analytics/overview"
            className="bg-slate-800/50 backdrop-blur-sm rounded-lg shadow p-6 transition hover:border-orange-500 hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-white mb-2">Analytics & Reports</h2>
            <p className="text-slate-400 text-sm">
              Dive deeper into growth, revenue, and workshop performance analytics.
            </p>
          </Link>
        </section>
      </div>
    </div>
  )
}
