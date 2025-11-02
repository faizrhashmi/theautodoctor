// @ts-nocheck
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { LogLevel, LogSource, LogEntry } from '@/lib/adminLogger'

const LOG_LEVELS: LogLevel[] = ['error', 'warn', 'info', 'debug']
const LOG_SOURCES: LogSource[] = ['api', 'auth', 'session', 'payment', 'database', 'system', 'cleanup', 'livekit', 'email']

const LEVEL_BADGES = {
  error: 'bg-red-100 text-red-800 border-red-200',
  warn: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  debug: 'bg-gray-100 text-gray-800 border-gray-200',
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>(['error', 'warn', 'info'])
  const [selectedSources, setSelectedSources] = useState<LogSource[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [stats, setStats] = useState<any>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedLevels.length > 0) params.set('level', selectedLevels.join(','))
      if (selectedSources.length > 0) params.set('source', selectedSources.join(','))
      if (searchQuery) params.set('search', searchQuery)
      params.set('limit', '200')

      const response = await fetch(`/api/admin/logs?${params}`)
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedLevels, selectedSources, searchQuery])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/logs/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  useEffect(() => {
    fetchLogs()
    fetchStats()
    const interval = setInterval(() => {
      fetchLogs()
      fetchStats()
    }, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [selectedLevels, selectedSources, searchQuery, fetchLogs])

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const toggleLevel = (level: LogLevel) => {
    setSelectedLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    )
  }

  const toggleSource = (source: LogSource) => {
    setSelectedSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    )
  }

  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `logs-${new Date().toISOString()}.json`
    link.click()
  }

  const clearFilters = () => {
    setSelectedLevels(['error', 'warn', 'info'])
    setSelectedSources([])
    setSearchQuery('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Logs</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time system logging and monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportLogs}
            className="px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg hover:bg-slate-900/50"
          >
            Export Logs
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/25 rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4">
            <div className="text-sm font-medium text-slate-400">Total Logs (24h)</div>
            <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <div className="text-sm font-medium text-red-600">Errors</div>
            <div className="text-2xl font-bold text-red-900 mt-1">{stats.byLevel?.error || 0}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
            <div className="text-sm font-medium text-yellow-600">Warnings</div>
            <div className="text-2xl font-bold text-yellow-900 mt-1">{stats.byLevel?.warn || 0}</div>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="text-sm font-medium text-blue-600">Info</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{stats.byLevel?.info || 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 space-y-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Search Logs</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search message..."
            className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Level Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Filter by Level</label>
          <div className="flex flex-wrap gap-2">
            {LOG_LEVELS.map(level => (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                className={`px-3 py-1 text-sm font-medium rounded-lg border transition-colors ${
                  selectedLevels.includes(level)
                    ? LEVEL_BADGES[level]
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {level.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Source Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Filter by Source</label>
          <div className="flex flex-wrap gap-2">
            {LOG_SOURCES.map(source => (
              <button
                key={source}
                onClick={() => toggleSource(source)}
                className={`px-3 py-1 text-sm font-medium rounded-lg border transition-colors ${
                  selectedSources.includes(source)
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {source}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoScroll"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="autoScroll" className="text-sm text-slate-200">
              Auto-scroll to latest
            </label>
          </div>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Logs Display (Terminal-like) */}
      <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="text-xs text-gray-400 font-mono">
            {logs.length} logs displayed
          </div>
        </div>
        <div className="p-4 h-[600px] overflow-y-auto font-mono text-sm">
          {loading && logs.length === 0 ? (
            <div className="text-slate-500">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-slate-500">No logs found</div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div
                  key={log.id || index}
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-gray-800 cursor-pointer p-1 rounded transition-colors"
                >
                  <span className="text-slate-500">
                    {new Date(log.created_at || log.timestamp || '').toLocaleTimeString()}
                  </span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                    log.level === 'error' ? 'bg-red-900 text-red-200' :
                    log.level === 'warn' ? 'bg-yellow-900 text-yellow-200' :
                    log.level === 'info' ? 'bg-blue-900 text-blue-200' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {log.level?.toUpperCase()}
                  </span>
                  <span className="ml-2 text-purple-400">[{log.source}]</span>
                  <span className="ml-2 text-gray-300">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-slate-400"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-400">Timestamp</label>
                  <div className="mt-1 text-white">
                    {new Date(selectedLog.created_at || selectedLog.timestamp || '').toLocaleString('en-CA')}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Level</label>
                  <div className="mt-1">
                    <span className={`px-2 py-1 rounded text-sm font-semibold ${LEVEL_BADGES[selectedLog.level]}`}>
                      {selectedLog.level?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Source</label>
                  <div className="mt-1 text-white">{selectedLog.source}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Message</label>
                  <div className="mt-1 text-white">{selectedLog.message}</div>
                </div>
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-slate-400">Metadata</label>
                    <pre className="mt-1 bg-slate-900/50 p-4 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
