// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'

interface CleanupPreview {
  expiredRequests: { count: number; items: any[] }
  oldWaitingSessions: { count: number; items: any[] }
  potentialOrphans: { count: number; items: any[] }
  total: number
}

interface CleanupHistory {
  id: string
  cleanup_type: string
  items_cleaned: number
  preview_mode: boolean
  triggered_by?: string
  summary: any
  created_at: string
}

export default function CleanupPage() {
  const [preview, setPreview] = useState<CleanupPreview | null>(null)
  const [history, setHistory] = useState<CleanupHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [dryRun, setDryRun] = useState(true)

  const fetchPreview = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/cleanup/preview')
      const data = await response.json()
      setPreview(data)
    } catch (error) {
      console.error('Failed to fetch cleanup preview:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/admin/cleanup/history')
      const data = await response.json()
      setHistory(data)
    } catch (error) {
      console.error('Failed to fetch cleanup history:', error)
    }
  }

  useEffect(() => {
    fetchPreview()
    fetchHistory()
    const interval = setInterval(() => {
      fetchPreview()
      fetchHistory()
    }, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const executeCleanup = async () => {
    if (!dryRun) {
      if (!confirm('Are you sure you want to run cleanup? This will permanently cancel/delete stale items.')) {
        return
      }
    }

    setExecuting(true)
    try {
      const response = await fetch('/api/admin/cleanup/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(
          dryRun
            ? `Dry run complete. Would clean ${data.summary.totalCleaned} items.`
            : `Cleanup complete! Cleaned ${data.summary.totalCleaned} items.`
        )
        fetchPreview()
        fetchHistory()
      } else {
        alert('Cleanup failed: ' + data.error)
      }
    } catch (error: unknown) {
      alert('Cleanup failed: ' + error.message)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cleanup Tools</h1>
          <p className="text-sm text-slate-400 mt-1">
            Clean up stale sessions, expired requests, and orphaned data
          </p>
        </div>
        <button
          onClick={fetchPreview}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/25 rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {/* Safety Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800">Safety Features</h3>
            <p className="text-sm text-yellow-700 mt-1">
              This tool uses built-in safety checks. Preview mode lets you see what would be cleaned before executing.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {preview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border-2 border-slate-700 p-4">
            <div className="text-sm font-medium text-slate-400">Expired Requests</div>
            <div className="text-3xl font-bold text-white mt-2">
              {preview.expiredRequests.count}
            </div>
            <div className="text-xs text-slate-500 mt-1">Pending for 15+ minutes</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border-2 border-slate-700 p-4">
            <div className="text-sm font-medium text-slate-400">Old Waiting Sessions</div>
            <div className="text-3xl font-bold text-white mt-2">
              {preview.oldWaitingSessions.count}
            </div>
            <div className="text-xs text-slate-500 mt-1">Waiting for 1+ hours</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border-2 border-slate-700 p-4">
            <div className="text-sm font-medium text-slate-400">Potential Orphans</div>
            <div className="text-3xl font-bold text-white mt-2">
              {preview.potentialOrphans.count}
            </div>
            <div className="text-xs text-slate-500 mt-1">Active 2+ hours</div>
          </div>
          <div className={`rounded-lg border-2 p-4 ${
            preview.total > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
          }`}>
            <div className={`text-sm font-medium ${preview.total > 0 ? 'text-red-600' : 'text-green-600'}`}>
              Total to Clean
            </div>
            <div className={`text-3xl font-bold mt-2 ${preview.total > 0 ? 'text-red-900' : 'text-green-900'}`}>
              {preview.total}
            </div>
            <div className={`text-xs mt-1 ${preview.total > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {preview.total > 0 ? 'Action required' : 'All systems clean'}
            </div>
          </div>
        </div>
      )}

      {/* Preview Details */}
      {preview && preview.total > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 overflow-hidden">
          <div className="bg-slate-900/50 px-6 py-3 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Cleanup Preview</h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
          {showDetails && (
            <div className="p-6 space-y-6">
              {/* Expired Requests */}
              {preview.expiredRequests.count > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">
                    Expired Requests ({preview.expiredRequests.count})
                  </h4>
                  <div className="space-y-2">
                    {preview.expiredRequests.items.slice(0, 5).map((item, index) => (
                      <div key={index} className="bg-slate-900/50 rounded p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-slate-400">ID: {item.id?.substring(0, 8)}...</span>
                          <span className="text-red-600 font-medium">{item.age_minutes} min old</span>
                        </div>
                      </div>
                    ))}
                    {preview.expiredRequests.items.length > 5 && (
                      <div className="text-sm text-slate-500 text-center pt-2">
                        ...and {preview.expiredRequests.items.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Old Waiting Sessions */}
              {preview.oldWaitingSessions.count > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">
                    Old Waiting Sessions ({preview.oldWaitingSessions.count})
                  </h4>
                  <div className="space-y-2">
                    {preview.oldWaitingSessions.items.slice(0, 5).map((item, index) => (
                      <div key={index} className="bg-slate-900/50 rounded p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-slate-400">ID: {item.id?.substring(0, 8)}...</span>
                          <span className="text-yellow-600 font-medium">{item.age_hours} hours old</span>
                        </div>
                      </div>
                    ))}
                    {preview.oldWaitingSessions.items.length > 5 && (
                      <div className="text-sm text-slate-500 text-center pt-2">
                        ...and {preview.oldWaitingSessions.items.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Potential Orphans */}
              {preview.potentialOrphans.count > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">
                    Potential Orphaned Sessions ({preview.potentialOrphans.count})
                  </h4>
                  <div className="space-y-2">
                    {preview.potentialOrphans.items.slice(0, 5).map((item, index) => (
                      <div key={index} className="bg-slate-900/50 rounded p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-slate-400">ID: {item.id?.substring(0, 8)}...</span>
                          <span className="text-orange-600 font-medium">{item.age_hours} hours active</span>
                        </div>
                      </div>
                    ))}
                    {preview.potentialOrphans.items.length > 5 && (
                      <div className="text-sm text-slate-500 text-center pt-2">
                        ...and {preview.potentialOrphans.items.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cleanup Actions */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Cleanup Actions</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="dryRun"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="dryRun" className="text-sm text-slate-200">
              <span className="font-medium">Dry Run Mode</span> - Preview what would be cleaned without making changes
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={executeCleanup}
              disabled={executing || !preview || preview.total === 0}
              className={`px-6 py-3 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                dryRun ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {executing ? 'Running...' : dryRun ? 'Preview Cleanup (Dry Run)' : 'Execute Cleanup'}
            </button>
            {preview && preview.total === 0 && (
              <span className="text-sm text-green-600 font-medium">
                No cleanup needed - all systems clean!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cleanup History */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 overflow-hidden">
        <div className="bg-slate-900/50 px-6 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">Cleanup History</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {history.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No cleanup history</div>
          ) : (
            history.slice(0, 10).map((item) => (
              <div key={item.id} className="p-4 hover:bg-slate-900/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        item.preview_mode
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.preview_mode ? 'DRY RUN' : 'EXECUTED'}
                      </span>
                      <span className="text-sm font-medium text-white capitalize">
                        {item.cleanup_type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      Cleaned {item.items_cleaned} items
                    </div>
                    {item.summary && (
                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                        {item.summary.expiredRequests > 0 && (
                          <span>Expired: {item.summary.expiredRequests}</span>
                        )}
                        {item.summary.oldWaitingSessions > 0 && (
                          <span>Waiting: {item.summary.oldWaitingSessions}</span>
                        )}
                        {item.summary.orphanedSessions > 0 && (
                          <span>Orphaned: {item.summary.orphanedSessions}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleString('en-CA')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
