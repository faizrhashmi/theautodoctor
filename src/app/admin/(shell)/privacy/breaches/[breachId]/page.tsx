// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface DataBreach {
  id: string
  breach_title: string
  breach_description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  discovered_at: string
  contained_at: string | null
  remediated_at: string | null
  affected_customer_count: number
  data_types_affected: string[]
  breach_cause: string | null
  response_status: 'discovered' | 'investigating' | 'contained' | 'notifying' | 'remediated' | 'closed'
  privacy_commissioner_notified: boolean
  privacy_commissioner_notified_at: string | null
  customers_notified: boolean
  customers_notified_at: string | null
  notification_method: string | null
  remediation_steps: string | null
  discovered_by: string | null
  handled_by: string | null
  created_at: string
  updated_at: string
}

export default function BreachDetailPage({ params }: { params: { breachId: string } }) {
  const router = useRouter()
  const [breach, setBreach] = useState<DataBreach | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  // Edit mode states
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<DataBreach>>({})

  const fetchBreach = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/privacy/breaches/${params.breachId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch breach details')
      }

      const data = await response.json()
      setBreach(data.breach)
      setFormData(data.breach)
      setError(null)
    } catch (err) {
      console.error('Error fetching breach:', err)
      setError(err instanceof Error ? err.message : 'Failed to load breach')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBreach()
  }, [params.breachId])

  const updateBreach = async (updates: Partial<DataBreach>) => {
    try {
      setUpdating(true)
      const response = await fetch(`/api/admin/privacy/breaches/${params.breachId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update breach')
      }

      await fetchBreach()
      setEditMode(false)
      alert('Breach updated successfully')
    } catch (err) {
      alert('Error updating breach: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setUpdating(false)
    }
  }

  const notifyPrivacyCommissioner = async () => {
    if (!confirm('Send notification to Privacy Commissioner of Canada?')) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/admin/privacy/breaches/${params.breachId}/notify-commissioner`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to notify Privacy Commissioner')
      }

      await fetchBreach()
      alert('Privacy Commissioner notification sent successfully')
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setUpdating(false)
    }
  }

  const notifyCustomers = async () => {
    if (!confirm(`Send breach notification to ${breach?.affected_customer_count} affected customers?`)) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/admin/privacy/breaches/${params.breachId}/notify-customers`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to notify customers')
      }

      await fetchBreach()
      alert('Customer notifications sent successfully')
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading breach details...</p>
        </div>
      </div>
    )
  }

  if (error || !breach) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <h2 className="text-red-500 font-semibold">Error Loading Breach</h2>
          <p className="text-slate-300 mt-2">{error}</p>
          <Link href="/admin/privacy/breaches" className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded">
            Back to Breaches
          </Link>
        </div>
      </div>
    )
  }

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500',
    }
    return colors[severity] || colors.medium
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set'
    return new Date(dateStr).toLocaleString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const daysSince = (dateStr: string) => {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/privacy/breaches"
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            ← Back
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{breach.breach_title}</h1>
            <p className="text-slate-400 mt-1">Breach ID: {breach.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Edit Details
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  updateBreach(formData)
                }}
                disabled={updating}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setEditMode(false)
                  setFormData(breach)
                }}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Severity Badge */}
      <div className="flex items-center gap-4">
        <span className={`px-4 py-2 rounded-full text-white font-bold ${getSeverityColor(breach.severity)}`}>
          {breach.severity.toUpperCase()} SEVERITY
        </span>
        <span className="px-4 py-2 rounded bg-slate-800 text-slate-300">
          Status: {breach.response_status.replace('_', ' ').toUpperCase()}
        </span>
        <span className="text-slate-400">
          Discovered {daysSince(breach.discovered_at)} days ago
        </span>
      </div>

      {/* Timeline */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Breach Timeline</h2>
        <div className="space-y-3">
          <TimelineItem
            date={breach.discovered_at}
            label="Discovered"
            completed={true}
          />
          <TimelineItem
            date={breach.contained_at}
            label="Contained"
            completed={!!breach.contained_at}
          />
          <TimelineItem
            date={breach.privacy_commissioner_notified_at}
            label="Privacy Commissioner Notified"
            completed={breach.privacy_commissioner_notified}
          />
          <TimelineItem
            date={breach.customers_notified_at}
            label="Customers Notified"
            completed={breach.customers_notified}
          />
          <TimelineItem
            date={breach.remediated_at}
            label="Remediated"
            completed={!!breach.remediated_at}
          />
        </div>
      </div>

      {/* Breach Details */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Breach Details</h2>
        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
              <textarea
                value={formData.breach_description || ''}
                onChange={(e) => setFormData({ ...formData, breach_description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Breach Cause</label>
              <input
                type="text"
                value={formData.breach_cause || ''}
                onChange={(e) => setFormData({ ...formData, breach_cause: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Affected Customer Count</label>
              <input
                type="number"
                value={formData.affected_customer_count || 0}
                onChange={(e) => setFormData({ ...formData, affected_customer_count: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Response Status</label>
              <select
                value={formData.response_status || breach.response_status}
                onChange={(e) => setFormData({ ...formData, response_status: e.target.value as any })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="discovered">Discovered</option>
                <option value="investigating">Investigating</option>
                <option value="contained">Contained</option>
                <option value="notifying">Notifying</option>
                <option value="remediated">Remediated</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Remediation Steps</label>
              <textarea
                value={formData.remediation_steps || ''}
                onChange={(e) => setFormData({ ...formData, remediation_steps: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder="Describe the steps taken to remediate this breach..."
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DetailItem label="Description" value={breach.breach_description} />
            <DetailItem label="Breach Cause" value={breach.breach_cause || 'Not specified'} />
            <DetailItem label="Affected Customers" value={breach.affected_customer_count.toLocaleString('en-CA')} />
            <DetailItem label="Discovered By" value={breach.discovered_by || 'Not specified'} />
            <DetailItem label="Handled By" value={breach.handled_by || 'Not assigned'} />
            <div className="col-span-2">
              <DetailItem label="Remediation Steps" value={breach.remediation_steps || 'Not documented yet'} />
            </div>
          </div>
        )}
      </div>

      {/* Data Types Affected */}
      {breach.data_types_affected && breach.data_types_affected.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Data Types Affected</h2>
          <div className="flex flex-wrap gap-2">
            {breach.data_types_affected.map((dataType) => (
              <span key={dataType} className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium">
                {dataType}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notification Actions */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">PIPEDA Notifications</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900/50 rounded-lg">
            <h3 className="font-semibold text-white mb-2">Privacy Commissioner of Canada</h3>
            {breach.privacy_commissioner_notified ? (
              <div className="text-green-400">
                ✓ Notified on {formatDate(breach.privacy_commissioner_notified_at)}
              </div>
            ) : (
              <>
                <div className="text-red-400 mb-3">✗ Not yet notified</div>
                <button
                  onClick={notifyPrivacyCommissioner}
                  disabled={updating}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {updating ? 'Sending...' : 'Notify Commissioner'}
                </button>
              </>
            )}
          </div>

          <div className="p-4 bg-slate-900/50 rounded-lg">
            <h3 className="font-semibold text-white mb-2">Affected Customers</h3>
            {breach.customers_notified ? (
              <div className="text-green-400">
                ✓ Notified on {formatDate(breach.customers_notified_at)}
                <div className="text-xs text-slate-400 mt-1">Method: {breach.notification_method || 'Email'}</div>
              </div>
            ) : (
              <>
                <div className="text-red-400 mb-3">✗ Not yet notified ({breach.affected_customer_count} customers)</div>
                <button
                  onClick={notifyCustomers}
                  disabled={updating}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {updating ? 'Sending...' : 'Notify Customers'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineItem({ date, label, completed }: { date: string | null; label: string; completed: boolean }) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleString('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`w-4 h-4 rounded-full ${completed ? 'bg-green-500' : 'bg-slate-600'}`} />
      <div className="flex-1">
        <span className={`font-medium ${completed ? 'text-white' : 'text-slate-500'}`}>{label}</span>
        {date && <span className="text-sm text-slate-400 ml-2">{formatDate(date)}</span>}
      </div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-sm text-slate-500 mb-1">{label}</div>
      <div className="text-white">{value}</div>
    </div>
  )
}
