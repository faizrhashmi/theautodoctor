'use client'

import { useState } from 'react'

interface AuditLogEntry {
  id: string
  customer_id: string | null
  customer_email: string | null
  event_type: string
  event_timestamp: string
  user_id: string | null
  user_role: string | null
  ip_address: string | null
  user_agent: string | null
  event_details: Record<string, unknown>
  legal_basis: string | null
  data_categories_accessed: string[] | null
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search filters
  const [searchEmail, setSearchEmail] = useState('')
  const [eventType, setEventType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [limit, setLimit] = useState(100)

  const eventTypes = [
    'consent_granted',
    'consent_withdrawn',
    'data_access_requested',
    'data_download_generated',
    'account_deletion_requested',
    'account_anonymized',
    'marketing_email_sent',
    'marketing_unsubscribed',
    'admin_viewed_customer_data',
    'admin_modified_customer_data',
    'data_exported',
    'data_breach_detected',
    'privacy_policy_viewed',
  ]

  const searchAuditLog = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (searchEmail) params.append('email', searchEmail)
      if (eventType) params.append('event_type', eventType)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      params.append('limit', limit.toString())

      const response = await fetch(`/api/admin/privacy/audit-log?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to search audit log')
      }

      const data = await response.json()
      setEntries(data.entries || [])
    } catch (err) {
      console.error('Error searching audit log:', err)
      setError(err instanceof Error ? err.message : 'Failed to search audit log')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchAuditLog()
  }

  const clearFilters = () => {
    setSearchEmail('')
    setEventType('')
    setDateFrom('')
    setDateTo('')
    setLimit(100)
    setEntries([])
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Privacy Audit Log</h1>
        <p className="text-slate-400 mt-1">Search and review privacy-related events</p>
      </div>

      {/* PIPEDA Notice */}
      <div className="bg-blue-500/10 border border-blue-500 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📜</span>
          <div>
            <h3 className="font-semibold text-blue-400 mb-1">Audit Trail Compliance</h3>
            <p className="text-sm text-slate-300">
              PIPEDA requires organizations to maintain comprehensive logs of data access and processing activities.
              This audit log tracks all privacy-related events for compliance and investigation purposes.
            </p>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Search Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Customer Email</label>
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="customer@example.com"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Events</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {formatEventType(type)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Result Limit</label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value={50}>50 results</option>
              <option value={100}>100 results</option>
              <option value={500}>500 results</option>
              <option value={1000}>1000 results</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Searching...' : 'Search Audit Log'}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <h3 className="text-red-500 font-semibold">Error</h3>
          <p className="text-slate-300 mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {entries.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Audit Log Entries ({entries.length} results)
            </h2>
          </div>

          <div className="space-y-3">
            {entries.map((entry) => (
              <AuditLogEntry key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {!loading && entries.length === 0 && (searchEmail || eventType || dateFrom || dateTo) && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
          <p className="text-slate-400">Try adjusting your search filters</p>
        </div>
      )}
    </div>
  )
}

// Audit Log Entry Component
function AuditLogEntry({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false)

  const getEventIcon = (eventType: string) => {
    const icons: Record<string, string> = {
      consent_granted: '✅',
      consent_withdrawn: '❌',
      data_access_requested: '📋',
      data_download_generated: '📥',
      account_deletion_requested: '🗑️',
      account_anonymized: '👻',
      marketing_email_sent: '📧',
      marketing_unsubscribed: '🚫',
      admin_viewed_customer_data: '👁️',
      admin_modified_customer_data: '✏️',
      data_exported: '📤',
      data_breach_detected: '🚨',
      privacy_policy_viewed: '📄',
    }
    return icons[eventType] || '📌'
  }

  const getEventColor = (eventType: string) => {
    if (eventType.includes('breach') || eventType.includes('deletion')) return 'border-red-500/30 bg-red-500/5'
    if (eventType.includes('admin')) return 'border-orange-500/30 bg-orange-500/5'
    if (eventType.includes('consent_withdrawn') || eventType.includes('unsubscribed'))
      return 'border-yellow-500/30 bg-yellow-500/5'
    return 'border-slate-700 bg-slate-900/50'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className={`border rounded-lg p-4 ${getEventColor(entry.event_type)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{getEventIcon(entry.event_type)}</span>
            <div>
              <h3 className="font-semibold text-white">{formatEventType(entry.event_type)}</h3>
              <p className="text-xs text-slate-400">{formatDate(entry.event_timestamp)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {entry.customer_email && (
              <div>
                <div className="text-slate-500 text-xs">Customer</div>
                <div className="text-slate-300">{entry.customer_email}</div>
              </div>
            )}
            {entry.user_role && (
              <div>
                <div className="text-slate-500 text-xs">User Role</div>
                <div className="text-slate-300">{entry.user_role}</div>
              </div>
            )}
            {entry.ip_address && (
              <div>
                <div className="text-slate-500 text-xs">IP Address</div>
                <div className="text-slate-300 font-mono text-xs">{entry.ip_address}</div>
              </div>
            )}
            {entry.legal_basis && (
              <div>
                <div className="text-slate-500 text-xs">Legal Basis</div>
                <div className="text-slate-300">{formatLegalBasis(entry.legal_basis)}</div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-4 px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
        >
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-500 text-xs mb-1">Event ID</div>
              <div className="text-slate-300 font-mono text-xs">{entry.id}</div>
            </div>
            {entry.customer_id && (
              <div>
                <div className="text-slate-500 text-xs mb-1">Customer ID</div>
                <div className="text-slate-300 font-mono text-xs">{entry.customer_id}</div>
              </div>
            )}
            {entry.user_agent && (
              <div className="col-span-2">
                <div className="text-slate-500 text-xs mb-1">User Agent</div>
                <div className="text-slate-300 text-xs break-all">{entry.user_agent}</div>
              </div>
            )}
            {entry.data_categories_accessed && entry.data_categories_accessed.length > 0 && (
              <div className="col-span-2">
                <div className="text-slate-500 text-xs mb-2">Data Categories Accessed</div>
                <div className="flex flex-wrap gap-2">
                  {entry.data_categories_accessed.map((category) => (
                    <span key={category} className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {entry.event_details && Object.keys(entry.event_details).length > 0 && (
              <div className="col-span-2">
                <div className="text-slate-500 text-xs mb-2">Event Details</div>
                <pre className="bg-slate-950 p-3 rounded text-xs text-slate-300 overflow-x-auto">
                  {JSON.stringify(entry.event_details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper functions
function formatEventType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatLegalBasis(basis: string): string {
  const basisMap: Record<string, string> = {
    consent: 'Consent',
    contract: 'Contract',
    legal_obligation: 'Legal Obligation',
    legitimate_interest: 'Legitimate Interest',
  }
  return basisMap[basis] || basis
}
