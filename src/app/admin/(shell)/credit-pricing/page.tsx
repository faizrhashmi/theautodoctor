'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface CreditPricing {
  id: string
  session_type: 'quick' | 'video' | 'diagnostic'
  is_specialist: boolean
  credit_cost: number
  effective_from: string
  effective_until: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by_profile?: {
    full_name: string
    email: string
  }
}

export default function AdminCreditPricingPage() {
  const [loading, setLoading] = useState(true)
  const [pricing, setPricing] = useState<CreditPricing[]>([])
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPricing, setEditingPricing] = useState<CreditPricing | null>(null)

  useEffect(() => {
    loadPricing()
  }, [showActiveOnly])

  async function loadPricing() {
    try {
      const url = showActiveOnly ? '/api/admin/credit-pricing?active=true' : '/api/admin/credit-pricing'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setPricing(data.pricing || [])
      }
    } catch (error) {
      console.error('Error loading credit pricing:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updatePricing(id: string, updates: Partial<CreditPricing>) {
    try {
      const response = await fetch(`/api/admin/credit-pricing/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        loadPricing()
        setShowEditModal(false)
        setEditingPricing(null)
      } else {
        alert('Failed to update pricing')
      }
    } catch (error) {
      console.error('Error updating pricing:', error)
      alert('Failed to update pricing')
    }
  }

  const sessionTypeLabels = {
    quick: 'Quick Chat',
    video: 'Video Session',
    diagnostic: 'Full Diagnostic'
  }

  const groupedPricing = pricing.reduce((acc, p) => {
    const key = p.session_type
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {} as Record<string, CreditPricing[]>)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading credit pricing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900/50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Credit Pricing Configuration</h1>
              <p className="text-slate-400">Manage credit costs for different session types and specialist tiers</p>
            </div>
            <Link
              href="/admin/dashboard"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            className={`px-4 py-2 rounded-lg transition ${
              showActiveOnly
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {showActiveOnly ? 'Showing Active Only' : 'Showing All (Including Expired)'}
          </button>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {(['quick', 'video', 'diagnostic'] as const).map((sessionType) => {
            const items = groupedPricing[sessionType] || []
            const standardPricing = items.find(p => !p.is_specialist)
            const specialistPricing = items.find(p => p.is_specialist)

            return (
              <div
                key={sessionType}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6"
              >
                <h3 className="text-xl font-semibold text-white mb-4">
                  {sessionTypeLabels[sessionType]}
                </h3>

                {/* Standard Pricing */}
                <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Standard Mechanic</span>
                    {standardPricing && (
                      <button
                        onClick={() => {
                          setEditingPricing(standardPricing)
                          setShowEditModal(true)
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {standardPricing ? (
                    <div className="text-2xl font-bold text-white">
                      {standardPricing.credit_cost} credits
                    </div>
                  ) : (
                    <div className="text-slate-500">Not configured</div>
                  )}
                  {standardPricing?.notes && (
                    <p className="mt-2 text-xs text-slate-500">{standardPricing.notes}</p>
                  )}
                </div>

                {/* Specialist Pricing */}
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-blue-400 font-medium">Brand Specialist</span>
                    {specialistPricing && (
                      <button
                        onClick={() => {
                          setEditingPricing(specialistPricing)
                          setShowEditModal(true)
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {specialistPricing ? (
                    <>
                      <div className="text-2xl font-bold text-white">
                        {specialistPricing.credit_cost} credits
                      </div>
                      <div className="mt-1 text-xs text-blue-400">
                        +{specialistPricing.credit_cost - (standardPricing?.credit_cost || 0)} premium
                      </div>
                    </>
                  ) : (
                    <div className="text-blue-400/50">Not configured</div>
                  )}
                  {specialistPricing?.notes && (
                    <p className="mt-2 text-xs text-blue-400/70">{specialistPricing.notes}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* All Pricing History */}
        {!showActiveOnly && pricing.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-white mb-4">Pricing History</h2>
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Session Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Tier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Credits</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Effective From</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Effective Until</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {pricing.map((p) => {
                    const isActive = !p.effective_until || new Date(p.effective_until) > new Date()
                    return (
                      <tr key={p.id} className={isActive ? '' : 'opacity-50'}>
                        <td className="px-4 py-3 text-sm text-white">{sessionTypeLabels[p.session_type]}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={p.is_specialist ? 'text-blue-400' : 'text-slate-300'}>
                            {p.is_specialist ? 'Specialist' : 'Standard'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-white">{p.credit_cost}</td>
                        <td className="px-4 py-3 text-sm text-slate-400">
                          {new Date(p.effective_from).toLocaleDateString('en-CA')}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">
                          {p.effective_until ? new Date(p.effective_until).toLocaleDateString('en-CA') : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            isActive
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-slate-700 text-slate-400'
                          }`}>
                            {isActive ? 'Active' : 'Expired'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-blue-400 font-semibold mb-2">💡 Credit Pricing Guidelines</h3>
          <ul className="text-blue-300/80 text-sm space-y-1 list-disc list-inside">
            <li>These are the base credit costs charged to subscription users</li>
            <li>Brand specialists typically charge 7-10 credits more than standard mechanics</li>
            <li>Changes take effect immediately for new sessions</li>
            <li>You can set future pricing by specifying effective_from and effective_until dates</li>
          </ul>
        </div>

        {/* Edit Modal */}
        {showEditModal && editingPricing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                Edit {sessionTypeLabels[editingPricing.session_type]} - {editingPricing.is_specialist ? 'Specialist' : 'Standard'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Credit Cost</label>
                  <input
                    type="number"
                    min="1"
                    defaultValue={editingPricing.credit_cost}
                    id="edit-credit-cost"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Notes (optional)</label>
                  <textarea
                    defaultValue={editingPricing.notes || ''}
                    id="edit-notes"
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      const creditCost = parseInt((document.getElementById('edit-credit-cost') as HTMLInputElement).value)
                      const notes = (document.getElementById('edit-notes') as HTMLTextAreaElement).value
                      updatePricing(editingPricing.id, { credit_cost: creditCost, notes })
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingPricing(null)
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
