'use client'

import { useState, useEffect } from 'react'
import { Building2, DollarSign, Save, AlertCircle, CheckCircle, Plus, X, Calendar } from 'lucide-react'

interface Workshop {
  id: string
  name: string
  city: string | null
  province: string | null
}

interface WorkshopFeeOverride {
  id?: string
  workshop_id: string
  workshopName?: string
  workshopLocation?: string
  custom_session_platform_fee: number | null
  custom_quote_platform_fee: number | null
  custom_escrow_hold_days: number | null
  agreement_type: 'volume_discount' | 'promotional' | 'partnership' | 'custom' | 'trial' | null
  agreement_notes: string | null
  agreement_start_date: string | null
  agreement_end_date: string | null
  is_active: boolean
}

export default function AdminWorkshopRatesPage() {
  const [loading, setLoading] = useState(true)
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [overrides, setOverrides] = useState<WorkshopFeeOverride[]>([])
  const [defaultQuoteFee, setDefaultQuoteFee] = useState(15)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingOverride, setEditingOverride] = useState<WorkshopFeeOverride | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Load workshops and overrides
      const [workshopsRes, overridesRes, feesRes] = await Promise.all([
        fetch('/api/admin/workshops'),
        fetch('/api/admin/workshop-fee-overrides'),
        fetch('/api/admin/fee-settings'),
      ])

      if (workshopsRes.ok) {
        const data = await workshopsRes.json()
        setWorkshops(data.workshops || [])
      }

      if (overridesRes.ok) {
        const data = await overridesRes.json()
        setOverrides(data.overrides || [])
      }

      if (feesRes.ok) {
        const data = await feesRes.json()
        setDefaultQuoteFee(data.fees.workshopQuotePlatformFee)
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load workshop rates')
    } finally {
      setLoading(false)
    }
  }

  async function saveOverride(override: WorkshopFeeOverride) {
    setError(null)
    setSuccess(false)

    try {
      const method = override.id ? 'PUT' : 'POST'
      const url = override.id
        ? `/api/admin/workshop-fee-overrides/${override.id}`
        : '/api/admin/workshop-fee-overrides'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(override),
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
        setShowAddModal(false)
        setEditingOverride(null)
        loadData()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save workshop rate')
      }
    } catch (err) {
      console.error('Error saving override:', err)
      setError('Failed to save workshop rate')
    }
  }

  async function deleteOverride(id: string) {
    if (!confirm('Remove custom rate for this workshop?')) return

    try {
      const response = await fetch(`/api/admin/workshop-fee-overrides/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
        loadData()
      } else {
        setError('Failed to delete workshop rate')
      }
    } catch (err) {
      console.error('Error deleting override:', err)
      setError('Failed to delete workshop rate')
    }
  }

  const availableWorkshops = workshops.filter(
    (w) => !overrides.some((o) => o.workshop_id === w.id && o.is_active)
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="ml-4 text-slate-400">Loading workshop rates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Building2 className="h-8 w-8 text-orange-500" />
          Workshop Fee Overrides
        </h1>
        <p className="text-slate-400 mt-2">
          Configure custom platform fees for specific workshops. Default: <strong className="text-white">{defaultQuoteFee}%</strong> on quotes.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-400/40 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-300 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-300">Error</p>
            <p className="text-sm text-red-200">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/20 border border-green-400/40 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-300">Success</p>
            <p className="text-sm text-green-200">Workshop rate updated successfully</p>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <p className="text-sm text-slate-400">
          {overrides.filter((o) => o.is_active).length} workshop(s) with custom rates
        </p>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Custom Rate
        </button>
      </div>

      {/* Workshop Overrides Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/70 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Workshop
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Quote Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Escrow Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Agreement Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Valid Until
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {overrides.filter((o) => o.is_active).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No custom workshop rates configured. All workshops use default {defaultQuoteFee}% platform fee.
                  </td>
                </tr>
              ) : (
                overrides
                  .filter((o) => o.is_active)
                  .map((override) => (
                    <tr key={override.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{override.workshopName}</div>
                        <div className="text-sm text-slate-400">{override.workshopLocation}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-400" />
                          <span className="font-medium text-white">
                            {override.custom_quote_platform_fee ?? defaultQuoteFee}%
                          </span>
                          {override.custom_quote_platform_fee !== null && (
                            <span className="text-xs text-green-400">(custom)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {override.custom_escrow_hold_days ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40">
                          {override.agreement_type || 'Custom'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {override.agreement_end_date
                          ? new Date(override.agreement_end_date).toLocaleDateString()
                          : 'No expiry'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingOverride(override)}
                            className="text-orange-400 hover:text-orange-300 text-sm font-medium transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => override.id && deleteOverride(override.id)}
                            className="text-red-400 hover:text-red-300 text-sm font-medium transition"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingOverride) && (
        <WorkshopRateModal
          workshops={availableWorkshops}
          defaultQuoteFee={defaultQuoteFee}
          override={editingOverride}
          onSave={saveOverride}
          onClose={() => {
            setShowAddModal(false)
            setEditingOverride(null)
          }}
        />
      )}
    </div>
  )
}

// Modal Component
function WorkshopRateModal({
  workshops,
  defaultQuoteFee,
  override,
  onSave,
  onClose,
}: {
  workshops: Workshop[]
  defaultQuoteFee: number
  override: WorkshopFeeOverride | null
  onSave: (override: WorkshopFeeOverride) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState<WorkshopFeeOverride>(
    override || {
      workshop_id: '',
      custom_session_platform_fee: null,
      custom_quote_platform_fee: null,
      custom_escrow_hold_days: null,
      agreement_type: 'custom',
      agreement_notes: null,
      agreement_start_date: new Date().toISOString().split('T')[0],
      agreement_end_date: null,
      is_active: true,
    }
  )

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {override ? 'Edit Workshop Rate' : 'Add Custom Workshop Rate'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-300 transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {!override && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Workshop</label>
              <select
                value={formData.workshop_id}
                onChange={(e) => setFormData({ ...formData, workshop_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">Select a workshop...</option>
                {workshops.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.city && `(${w.city}, ${w.province})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Custom Quote Platform Fee (%)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.01"
              value={formData.custom_quote_platform_fee ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  custom_quote_platform_fee: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              placeholder={`Default: ${defaultQuoteFee}%`}
              className="w-full px-4 py-2 border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">Leave empty to use global default ({defaultQuoteFee}%)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Custom Escrow Hold Days
            </label>
            <input
              type="number"
              min="0"
              max="90"
              value={formData.custom_escrow_hold_days ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  custom_escrow_hold_days: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              placeholder="Default: 7 days"
              className="w-full px-4 py-2 border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Agreement Type</label>
            <select
              value={formData.agreement_type || ''}
              onChange={(e) => setFormData({ ...formData, agreement_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="custom">Custom</option>
              <option value="volume_discount">Volume Discount</option>
              <option value="promotional">Promotional</option>
              <option value="partnership">Partnership</option>
              <option value="trial">Trial Period</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
              <input
                type="date"
                value={formData.agreement_start_date || ''}
                onChange={(e) => setFormData({ ...formData, agreement_start_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={formData.agreement_end_date || ''}
                onChange={(e) => setFormData({ ...formData, agreement_end_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Notes (Optional)</label>
            <textarea
              value={formData.agreement_notes || ''}
              onChange={(e) => setFormData({ ...formData, agreement_notes: e.target.value })}
              rows={3}
              placeholder="Internal notes about this agreement..."
              className="w-full px-4 py-2 border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-white font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.workshop_id}
            className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            <Save className="h-4 w-4" />
            Save Rate
          </button>
        </div>
      </div>
    </div>
  )
}
