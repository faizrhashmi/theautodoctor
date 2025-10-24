// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'

interface AdminError {
  id: string
  error_type: string
  error_message: string
  error_stack?: string
  source: string
  occurrence_count: number
  first_seen: string
  last_seen: string
  affected_users: string[]
  status: 'open' | 'investigating' | 'resolved' | 'ignored'
  resolution_notes?: string
  metadata?: any
}

const STATUS_COLORS = {
  open: 'bg-red-100 text-red-800 border-red-200',
  investigating: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  ignored: 'bg-gray-100 text-gray-800 border-gray-200',
}

export default function ErrorsPage() {
  const [errors, setErrors] = useState<AdminError[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedError, setSelectedError] = useState<AdminError | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const [sourceFilter, setSourceFilter] = useState<string>('')

  const fetchErrors = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (sourceFilter) params.set('source', sourceFilter)

      const response = await fetch(`/api/admin/errors?${params}`)
      const data = await response.json()
      setErrors(data.errors || [])
    } catch (error) {
      console.error('Failed to fetch errors:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, sourceFilter])

  useEffect(() => {
    fetchErrors()
    const interval = setInterval(fetchErrors, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [statusFilter, sourceFilter, fetchErrors])

  const updateErrorStatus = async (errorId: string, status: string, notes?: string) => {
    try {
      const response = await fetch(`/api/admin/errors/${errorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolution_notes: notes }),
      })

      if (response.ok) {
        fetchErrors()
        if (selectedError?.id === errorId) {
          setSelectedError(null)
        }
      }
    } catch (error) {
      console.error('Failed to update error:', error)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Error Tracking</h1>
          <p className="text-sm text-gray-600 mt-1">Monitor and manage system errors</p>
        </div>
        <button
          onClick={fetchErrors}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="text-sm font-medium text-red-600">Open Errors</div>
          <div className="text-2xl font-bold text-red-900 mt-1">
            {errors.filter(e => e.status === 'open').length}
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <div className="text-sm font-medium text-yellow-600">Investigating</div>
          <div className="text-2xl font-bold text-yellow-900 mt-1">
            {errors.filter(e => e.status === 'investigating').length}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="text-sm font-medium text-green-600">Resolved</div>
          <div className="text-2xl font-bold text-green-900 mt-1">
            {errors.filter(e => e.status === 'resolved').length}
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="text-sm font-medium text-blue-600">Total Occurrences</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">
            {errors.reduce((sum, e) => sum + e.occurrence_count, 0)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="ignored">Ignored</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sources</option>
              <option value="api">API</option>
              <option value="auth">Auth</option>
              <option value="session">Session</option>
              <option value="payment">Payment</option>
              <option value="database">Database</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </div>

      {/* Errors List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Occurrences
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Seen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && errors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Loading errors...
                  </td>
                </tr>
              ) : errors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No errors found
                  </td>
                </tr>
              ) : (
                errors.map((error) => (
                  <tr key={error.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{error.error_type}</div>
                      <div className="text-sm text-gray-500 truncate max-w-md">
                        {error.error_message}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        {error.source}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">{error.occurrence_count}</span>
                        {error.occurrence_count > 10 && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                            High
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatTimeAgo(error.last_seen)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${STATUS_COLORS[error.status]}`}>
                        {error.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedError(error)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Details Modal */}
      {selectedError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Error Details</h3>
              <button
                onClick={() => setSelectedError(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-600">Error Type</label>
                  <div className="mt-1 text-lg font-semibold text-gray-900">{selectedError.error_type}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Error Message</label>
                  <div className="mt-1 text-gray-900">{selectedError.error_message}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Source</label>
                    <div className="mt-1 text-gray-900">{selectedError.source}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${STATUS_COLORS[selectedError.status]}`}>
                        {selectedError.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Occurrences</label>
                    <div className="mt-1 text-gray-900">{selectedError.occurrence_count}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Affected Users</label>
                    <div className="mt-1 text-gray-900">{selectedError.affected_users?.length || 0}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">First Seen</label>
                    <div className="mt-1 text-gray-900">{new Date(selectedError.first_seen).toLocaleString()}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Seen</label>
                    <div className="mt-1 text-gray-900">{new Date(selectedError.last_seen).toLocaleString()}</div>
                  </div>
                </div>
                {selectedError.error_stack && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Stack Trace</label>
                    <pre className="mt-1 bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                      {selectedError.error_stack}
                    </pre>
                  </div>
                )}
                {selectedError.resolution_notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Resolution Notes</label>
                    <div className="mt-1 bg-green-50 p-4 rounded-lg text-sm text-gray-900">
                      {selectedError.resolution_notes}
                    </div>
                  </div>
                )}
                {selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Metadata</label>
                    <pre className="mt-1 bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedError.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => updateErrorStatus(selectedError.id, 'ignored')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Ignore
              </button>
              <button
                onClick={() => updateErrorStatus(selectedError.id, 'investigating')}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700"
              >
                Mark Investigating
              </button>
              <button
                onClick={() => {
                  const notes = prompt('Resolution notes (optional):')
                  updateErrorStatus(selectedError.id, 'resolved', notes || undefined)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
