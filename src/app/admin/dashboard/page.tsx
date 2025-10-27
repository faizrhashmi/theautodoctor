'use client'

import Link from 'next/link'
import { DashboardStats as DashboardOverview } from '@/components/admin/DashboardStats'

export default function AdminDashboardPage() {
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
