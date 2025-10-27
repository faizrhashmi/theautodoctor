'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => setLoading(false), 500)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Platform analytics and management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Quotes</div>
            <div className="text-3xl font-bold text-blue-600">0</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Pending Quotes</div>
            <div className="text-3xl font-bold text-orange-600">0</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Approved Quotes</div>
            <div className="text-3xl font-bold text-green-600">0</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <div className="text-sm opacity-90">Total Revenue</div>
            <div className="text-3xl font-bold mt-1">$0.00</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
            <div className="text-sm opacity-90">Platform Fees</div>
            <div className="text-3xl font-bold mt-1">$0.00</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <div className="text-sm opacity-90">Provider Earnings</div>
            <div className="text-3xl font-bold mt-1">$0.00</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/admin/fees"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow block"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Fee Rules Management</h2>
            <p className="text-gray-600 text-sm">Configure platform fee calculation rules</p>
          </Link>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Analytics & Reports</h2>
            <p className="text-gray-600 text-sm">View detailed platform metrics and reports</p>
          </div>
        </div>
      </div>
    </div>
  )
}
