'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ServicePlan {
  id: string
  slug: string
  name: string
  price: number
  duration_minutes: number | null
  description: string
  perks: any[]
  recommended_for: string | null
  display_order: number
  is_active: boolean
  plan_category: string | null
  features: any
  routing_preference: string
  // Subscription fields
  plan_type: 'payg' | 'subscription'
  credit_allocation: number
  billing_cycle: string | null
  discount_percent: number
  max_rollover_credits: number
  show_on_homepage: boolean
  marketing_badge: string | null
  stripe_subscription_price_id: string | null
  created_at: string
  updated_at: string
}

export default function AdminPlansPage() {
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [filter, setFilter] = useState<'all' | 'payg' | 'subscription'>('all')
  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadPlans()
  }, [])

  async function loadPlans() {
    try {
      const response = await fetch('/api/admin/plans')
      if (response.ok) {
        const data = await response.json()
        setPlans(data.plans || [])
      }
    } catch (error) {
      console.error('Error loading plans:', error)
    } finally {
      setLoading(false)
    }
  }

  async function togglePlan(planId: string, currentActive: boolean) {
    try {
      const response = await fetch(`/api/admin/plans/${planId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive })
      })

      if (response.ok) {
        loadPlans()
      } else {
        alert('Failed to toggle plan')
      }
    } catch (error) {
      console.error('Error toggling plan:', error)
      alert('Failed to toggle plan')
    }
  }

  async function toggleHomepage(planId: string, currentShow: boolean) {
    try {
      const response = await fetch(`/api/admin/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_on_homepage: !currentShow })
      })

      if (response.ok) {
        loadPlans()
      } else {
        alert('Failed to update plan')
      }
    } catch (error) {
      console.error('Error updating plan:', error)
      alert('Failed to update plan')
    }
  }

  async function updatePlan(planId: string, updates: any) {
    try {
      const response = await fetch(`/api/admin/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        loadPlans()
        setShowEditModal(false)
        setEditingPlan(null)
      } else {
        const data = await response.json()
        alert(`Failed to update plan: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating plan:', error)
      alert('Failed to update plan')
    }
  }

  async function deletePlan(planId: string, planName: string) {
    if (!confirm(`Are you sure you want to delete "${planName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/plans/${planId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert(`Plan "${planName}" deleted successfully`)
        loadPlans()
      } else {
        const data = await response.json()
        alert(`Failed to delete plan: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting plan:', error)
      alert('Failed to delete plan')
    }
  }

  async function createPlan(planData: any) {
    try {
      const response = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData)
      })

      if (response.ok) {
        alert('Plan created successfully!')
        loadPlans()
        setShowCreateModal(false)
      } else {
        const data = await response.json()
        alert(`Failed to create plan: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating plan:', error)
      alert('Failed to create plan')
    }
  }

  const filteredPlans = plans.filter(plan => {
    if (filter === 'payg') return plan.plan_type === 'payg'
    if (filter === 'subscription') return plan.plan_type === 'subscription'
    return true
  }).sort((a, b) => a.display_order - b.display_order)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading service plans...</p>
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
              <h1 className="text-3xl font-bold text-white mb-2">Service Plans Manager</h1>
              <p className="text-slate-400">Manage PAYG session plans and subscription packages</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
              >
                + Create New Plan
              </button>
              <Link
                href="/admin"
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            All Plans ({plans.length})
          </button>
          <button
            onClick={() => setFilter('payg')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'payg'
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Pay As You Go ({plans.filter(p => p.plan_type === 'payg').length})
          </button>
          <button
            onClick={() => setFilter('subscription')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'subscription'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Subscriptions ({plans.filter(p => p.plan_type === 'subscription').length})
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-slate-800/50 backdrop-blur-sm border rounded-lg p-6 transition relative ${
                plan.is_active ? 'border-slate-700' : 'border-slate-800 opacity-60'
              } ${plan.plan_type === 'subscription' ? 'border-l-4 border-l-purple-500' : ''}`}
            >
              {/* Marketing Badge */}
              {plan.marketing_badge && (
                <div className="absolute -top-2 -right-2 px-3 py-1 bg-yellow-500 text-yellow-900 text-xs font-bold rounded-full shadow-lg">
                  {plan.marketing_badge}
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <code className="text-xs text-slate-400">#{plan.display_order}</code>
                </div>
                <p className="text-slate-400 text-sm mb-3">{plan.description}</p>

                {/* Price */}
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-white">${plan.price.toFixed(2)}</span>
                  {plan.plan_type === 'subscription' && plan.billing_cycle && (
                    <span className="text-slate-400 text-sm">/{plan.billing_cycle}</span>
                  )}
                </div>

                {/* Type Badge */}
                <div className="flex gap-2 items-center flex-wrap">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      plan.plan_type === 'subscription'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}
                  >
                    {plan.plan_type === 'subscription' ? 'SUBSCRIPTION' : 'PAY AS YOU GO'}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      plan.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {plan.is_active ? 'ACTIVE' : 'DISABLED'}
                  </span>
                  {plan.show_on_homepage && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                      ON HOMEPAGE
                    </span>
                  )}
                </div>
              </div>

              {/* Subscription Details */}
              {plan.plan_type === 'subscription' && (
                <div className="mb-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-purple-400 text-xs">Credits/Month</div>
                      <div className="text-white font-semibold">{plan.credit_allocation}</div>
                    </div>
                    <div>
                      <div className="text-purple-400 text-xs">Discount</div>
                      <div className="text-white font-semibold">{plan.discount_percent}%</div>
                    </div>
                    <div>
                      <div className="text-purple-400 text-xs">Max Rollover</div>
                      <div className="text-white font-semibold">{plan.max_rollover_credits}</div>
                    </div>
                    <div>
                      <div className="text-purple-400 text-xs">Billing</div>
                      <div className="text-white font-semibold capitalize">{plan.billing_cycle}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAYG Details */}
              {plan.plan_type === 'payg' && plan.duration_minutes && (
                <div className="mb-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="text-green-400 text-xs">Session Duration</div>
                  <div className="text-white font-semibold">{plan.duration_minutes} minutes</div>
                </div>
              )}

              {/* Perks */}
              {plan.perks && plan.perks.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-slate-400 mb-2">Included:</div>
                  <ul className="space-y-1">
                    {plan.perks.slice(0, 3).map((perk, idx) => (
                      <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-green-400">✓</span>
                        <span className="flex-1">{perk}</span>
                      </li>
                    ))}
                    {plan.perks.length > 3 && (
                      <li className="text-xs text-slate-500">+{plan.perks.length - 3} more...</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-slate-700">
                <button
                  onClick={() => {
                    setEditingPlan(plan)
                    setShowEditModal(true)
                  }}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Edit Plan
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => togglePlan(plan.id, plan.is_active)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      plan.is_active
                        ? 'bg-orange-600 hover:bg-orange-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {plan.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => toggleHomepage(plan.id, plan.show_on_homepage)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      plan.show_on_homepage
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                  >
                    {plan.show_on_homepage ? 'On Home' : 'Add to Home'}
                  </button>
                </div>
                <button
                  onClick={() => deletePlan(plan.id, plan.name)}
                  className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Delete Plan
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredPlans.length === 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8 text-center">
            <p className="text-slate-400">No plans found</p>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-blue-400 font-semibold mb-2">💡 Plan Management Tips</h3>
          <ul className="text-blue-300/80 text-sm space-y-1 list-disc list-inside">
            <li>PAYG plans are one-time session purchases</li>
            <li>Subscription plans give customers monthly credits at a discounted rate</li>
            <li>Enable "Subscriptions" feature flag to show subscription plans to customers</li>
            <li>Toggle "Show on Homepage" to feature specific plans</li>
            <li>Marketing badges like "POPULAR" or "BEST VALUE" attract attention</li>
          </ul>
        </div>

        {/* Edit Plan Modal */}
        {showEditModal && editingPlan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full border border-slate-700 my-8">
              <h3 className="text-2xl font-semibold text-white mb-6">
                Edit Plan: {editingPlan.name}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Basic Information</h4>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Plan Name</label>
                    <input
                      type="text"
                      id="edit-name"
                      defaultValue={editingPlan.name}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      id="edit-price"
                      defaultValue={editingPlan.price}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Description</label>
                    <textarea
                      id="edit-description"
                      defaultValue={editingPlan.description}
                      rows={3}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Recommended For</label>
                    <input
                      type="text"
                      id="edit-recommended"
                      defaultValue={editingPlan.recommended_for || ''}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Marketing Badge</label>
                    <input
                      type="text"
                      id="edit-badge"
                      defaultValue={editingPlan.marketing_badge || ''}
                      placeholder="e.g., POPULAR, BEST VALUE"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Display Order</label>
                    <input
                      type="number"
                      id="edit-order"
                      defaultValue={editingPlan.display_order}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Stripe & Type-Specific Settings */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Stripe & Settings</h4>

                  {editingPlan.plan_type === 'payg' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Stripe Price ID (One-time)</label>
                        <input
                          type="text"
                          id="edit-stripe-price"
                          defaultValue={(editingPlan as any).stripe_price_id || ''}
                          placeholder="price_xxx"
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Session Duration (minutes)</label>
                        <input
                          type="number"
                          id="edit-duration"
                          defaultValue={editingPlan.duration_minutes || 0}
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {editingPlan.plan_type === 'subscription' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Stripe Subscription Price ID</label>
                        <input
                          type="text"
                          id="edit-stripe-sub-price"
                          defaultValue={editingPlan.stripe_subscription_price_id || ''}
                          placeholder="price_xxx"
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Monthly Credits</label>
                        <input
                          type="number"
                          id="edit-credits"
                          defaultValue={editingPlan.credit_allocation}
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Discount Percent (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          id="edit-discount"
                          defaultValue={editingPlan.discount_percent}
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Max Rollover Credits</label>
                        <input
                          type="number"
                          id="edit-rollover"
                          defaultValue={editingPlan.max_rollover_credits}
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Billing Cycle</label>
                        <select
                          id="edit-billing"
                          defaultValue={editingPlan.billing_cycle || 'monthly'}
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="annual">Annual</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* Perks */}
                <div className="md:col-span-2">
                  <h4 className="text-lg font-semibold text-white border-b border-slate-700 pb-2 mb-4">Perks (JSON Array)</h4>
                  <textarea
                    id="edit-perks"
                    defaultValue={JSON.stringify(editingPlan.perks, null, 2)}
                    rows={6}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
                    placeholder='["Perk 1", "Perk 2", "Perk 3"]'
                  />
                  <p className="mt-2 text-xs text-slate-500">JSON array of strings</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 mt-6 border-t border-slate-700">
                <button
                  onClick={() => {
                    try {
                      const updates: any = {
                        name: (document.getElementById('edit-name') as HTMLInputElement).value,
                        price: parseFloat((document.getElementById('edit-price') as HTMLInputElement).value),
                        description: (document.getElementById('edit-description') as HTMLTextAreaElement).value,
                        recommended_for: (document.getElementById('edit-recommended') as HTMLInputElement).value || null,
                        marketing_badge: (document.getElementById('edit-badge') as HTMLInputElement).value || null,
                        display_order: parseInt((document.getElementById('edit-order') as HTMLInputElement).value),
                        perks: JSON.parse((document.getElementById('edit-perks') as HTMLTextAreaElement).value)
                      }

                      if (editingPlan.plan_type === 'payg') {
                        updates.stripe_price_id = (document.getElementById('edit-stripe-price') as HTMLInputElement)?.value || null
                        updates.duration_minutes = parseInt((document.getElementById('edit-duration') as HTMLInputElement)?.value || '0')
                      }

                      if (editingPlan.plan_type === 'subscription') {
                        updates.stripe_subscription_price_id = (document.getElementById('edit-stripe-sub-price') as HTMLInputElement)?.value || null
                        updates.credit_allocation = parseInt((document.getElementById('edit-credits') as HTMLInputElement).value)
                        updates.discount_percent = parseFloat((document.getElementById('edit-discount') as HTMLInputElement).value)
                        updates.max_rollover_credits = parseInt((document.getElementById('edit-rollover') as HTMLInputElement).value)
                        updates.billing_cycle = (document.getElementById('edit-billing') as HTMLSelectElement).value
                      }

                      updatePlan(editingPlan.id, updates)
                    } catch (error) {
                      alert('Invalid JSON in perks field or other validation error')
                      console.error(error)
                    }
                  }}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingPlan(null)
                  }}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create New Plan Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full border border-slate-700 my-8">
              <h3 className="text-2xl font-semibold text-white mb-6">
                Create New Service Plan
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Basic Information</h4>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Plan Slug (URL-friendly ID)</label>
                    <input
                      type="text"
                      id="create-slug"
                      placeholder="e.g., premium-care"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">Lowercase, hyphens only. Cannot be changed later.</p>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Plan Name</label>
                    <input
                      type="text"
                      id="create-name"
                      placeholder="e.g., Premium Care"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      id="create-price"
                      placeholder="0.00"
                      defaultValue="0"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Description</label>
                    <textarea
                      id="create-description"
                      rows={3}
                      placeholder="Brief description of this plan"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Display Order</label>
                    <input
                      type="number"
                      id="create-order"
                      defaultValue="0"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Plan Type & Settings */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">Plan Type & Settings</h4>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Plan Type</label>
                    <select
                      id="create-plan-type"
                      defaultValue="payg"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="payg">Pay As You Go (One-time)</option>
                      <option value="subscription">Subscription (Recurring)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Session Duration (minutes) - For PAYG</label>
                    <input
                      type="number"
                      id="create-duration"
                      defaultValue="30"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Stripe Price ID (Optional)</label>
                    <input
                      type="text"
                      id="create-stripe-price"
                      placeholder="price_xxx"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">Add now or edit later. Will be validated against Stripe.</p>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="create-active"
                        defaultChecked
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-300">Make plan active immediately</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="create-homepage"
                        defaultChecked
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-300">Show on homepage</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-slate-700">
                <button
                  onClick={() => {
                    const slug = (document.getElementById('create-slug') as HTMLInputElement).value
                    const name = (document.getElementById('create-name') as HTMLInputElement).value
                    const price = parseFloat((document.getElementById('create-price') as HTMLInputElement).value)
                    const description = (document.getElementById('create-description') as HTMLTextAreaElement).value
                    const duration_minutes = parseInt((document.getElementById('create-duration') as HTMLInputElement).value)
                    const display_order = parseInt((document.getElementById('create-order') as HTMLInputElement).value)
                    const plan_type = (document.getElementById('create-plan-type') as HTMLSelectElement).value
                    const stripe_price_id = (document.getElementById('create-stripe-price') as HTMLInputElement).value || null
                    const is_active = (document.getElementById('create-active') as HTMLInputElement).checked
                    const show_on_homepage = (document.getElementById('create-homepage') as HTMLInputElement).checked

                    if (!slug || !name || !description) {
                      alert('Please fill in all required fields (slug, name, description)')
                      return
                    }

                    createPlan({
                      slug,
                      name,
                      price,
                      description,
                      duration_minutes,
                      display_order,
                      plan_type,
                      stripe_price_id,
                      is_active,
                      show_on_homepage,
                      perks: [],
                      recommended_for: '',
                    })
                  }}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
                >
                  Create Plan
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
