'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Save, AlertCircle, CheckCircle, Clock, TrendingUp, Shield } from 'lucide-react'

interface PlatformFees {
  sessionMechanicPercent: number
  sessionPlatformPercent: number
  referralFeePercent: number
  workshopQuotePlatformFee: number
  escrowHoldDays: number
  highValueThresholdCents: number
  highValueEscrowHoldDays: number
  enableAutoRelease: boolean
  requireManualApprovalOverThreshold: boolean
}

export default function AdminFeeSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fees, setFees] = useState<PlatformFees>({
    sessionMechanicPercent: 70,
    sessionPlatformPercent: 30,
    referralFeePercent: 2,
    workshopQuotePlatformFee: 15,
    escrowHoldDays: 7,
    highValueThresholdCents: 100000,
    highValueEscrowHoldDays: 14,
    enableAutoRelease: true,
    requireManualApprovalOverThreshold: true,
  })

  useEffect(() => {
    loadFees()
  }, [])

  async function loadFees() {
    try {
      const response = await fetch('/api/admin/fee-settings')
      if (response.ok) {
        const data = await response.json()
        setFees(data.fees)
      } else {
        setError('Failed to load fee settings')
      }
    } catch (err) {
      console.error('Error loading fees:', err)
      setError('Failed to load fee settings')
    } finally {
      setLoading(false)
    }
  }

  async function saveFees() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/admin/fee-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fees),
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
        loadFees() // Reload to confirm
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save fee settings')
      }
    } catch (err) {
      console.error('Error saving fees:', err)
      setError('Failed to save fee settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="ml-4 text-slate-400">Loading fee settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-orange-500" />
          Platform Fee Settings
        </h1>
        <p className="text-slate-400 mt-2">
          Configure global fee structure for sessions, referrals, and workshop quotes.
          Changes affect all future transactions immediately.
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
            <p className="text-sm text-green-200">Fee settings saved successfully</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Session Payment Splits */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-semibold text-white">Session Payment Splits</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Revenue split for virtual diagnostic sessions (must total 100%)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Mechanic Share (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={fees.sessionMechanicPercent}
                onChange={(e) => setFees({
                  ...fees,
                  sessionMechanicPercent: parseFloat(e.target.value),
                  sessionPlatformPercent: 100 - parseFloat(e.target.value),
                })}
                className="w-full px-4 py-2 border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Platform Share (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={fees.sessionPlatformPercent}
                disabled
                className="w-full px-4 py-2 border border-slate-700 rounded-lg bg-slate-900/70 text-slate-400"
              />
              <p className="text-xs text-slate-500 mt-1">Auto-calculated (100 - Mechanic Share)</p>
            </div>
          </div>
        </div>

        {/* Referral Fees */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-green-400" />
            <h2 className="text-xl font-semibold text-white">Referral Fees</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Percentage earned by virtual mechanics when referred customers approve workshop quotes
          </p>

          <div className="max-w-xs">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Default Referral Fee (%)
            </label>
            <input
              type="number"
              min="0"
              max="20"
              step="0.01"
              value={fees.referralFeePercent}
              onChange={(e) => setFees({ ...fees, referralFeePercent: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">Can be overridden per mechanic</p>
          </div>
        </div>

        {/* Workshop Quote Platform Fee */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Workshop Quote Platform Fee</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Platform fee on workshop repair quotes (can be overridden per workshop)
          </p>

          <div className="max-w-xs">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Default Workshop Fee (%)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.01"
              value={fees.workshopQuotePlatformFee}
              onChange={(e) => setFees({ ...fees, workshopQuotePlatformFee: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">Adjustable per workshop in Workshop Overrides</p>
          </div>
        </div>

        {/* Escrow Settings */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-semibold text-white">Escrow & Auto-Release Settings</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Payment hold periods before automatic release to service providers
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Standard Escrow Hold (days)
              </label>
              <input
                type="number"
                min="0"
                max="90"
                value={fees.escrowHoldDays}
                onChange={(e) => setFees({ ...fees, escrowHoldDays: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                High-Value Escrow Hold (days)
              </label>
              <input
                type="number"
                min="0"
                max="90"
                value={fees.highValueEscrowHoldDays}
                onChange={(e) => setFees({ ...fees, highValueEscrowHoldDays: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              High-Value Threshold ($)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={fees.highValueThresholdCents / 100}
              onChange={(e) => setFees({ ...fees, highValueThresholdCents: parseFloat(e.target.value) * 100 })}
              className="w-full max-w-xs px-4 py-2 border border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">Payments above this amount use extended escrow hold</p>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-700">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={fees.enableAutoRelease}
                onChange={(e) => setFees({ ...fees, enableAutoRelease: e.target.checked })}
                className="w-5 h-5 text-orange-600 border-slate-600 rounded focus:ring-2 focus:ring-orange-500 bg-slate-800/50"
              />
              <div>
                <div className="font-medium text-white">Enable Auto-Release</div>
                <div className="text-sm text-slate-400">Automatically release payments after escrow period</div>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={fees.requireManualApprovalOverThreshold}
                onChange={(e) => setFees({ ...fees, requireManualApprovalOverThreshold: e.target.checked })}
                className="w-5 h-5 text-orange-600 border-slate-600 rounded focus:ring-2 focus:ring-orange-500 bg-slate-800/50"
              />
              <div>
                <div className="font-medium text-white">Require Manual Approval for High-Value</div>
                <div className="text-sm text-slate-400">High-value payments require admin approval before release</div>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-4">
          <p className="text-sm text-slate-400">
            Changes will affect all future transactions immediately after saving
          </p>
          <button
            onClick={saveFees}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
