'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, Check, AlertCircle } from 'lucide-react'

interface ServicePlan {
  id: string
  slug: string
  name: string
  price: number
  duration_minutes: number
  description: string
  perks: string[]
  recommended_for: string
  is_active: boolean
  display_order: number
  stripe_price_id: string | null
  plan_category: string
  features: Record<string, boolean>
  routing_preference: string
  restricted_brands: string[]
  requires_certification: boolean
}

// Available feature flags organized by category
const FEATURE_CATEGORIES = {
  'Communication': [
    { key: 'chat', label: 'Text Chat', description: 'Enable text-based communication' },
    { key: 'video_sessions', label: 'Video Sessions', description: 'Enable live video calls' },
    { key: 'screen_sharing', label: 'Screen Sharing', description: 'Share screens during video' },
    { key: 'photo_sharing', label: 'Photo Sharing', description: 'Share photos and videos' },
  ],
  'Support Features': [
    { key: 'priority_support', label: 'Priority Support', description: 'Jump the queue' },
    { key: 'emergency_help', label: '24/7 Emergency Help', description: 'Emergency assistance button' },
    { key: 'dedicated_mechanic', label: 'Dedicated Mechanic', description: 'Same mechanic every session' },
  ],
  'Content & Reports': [
    { key: 'session_recordings', label: 'Session Recordings', description: 'Video playback after session' },
    { key: 'custom_reports', label: 'Custom Reports', description: 'Detailed PDF reports' },
    { key: 'diagnostic_history', label: 'Full Diagnostic History', description: 'Access to all past diagnostics' },
    { key: 'diagnostic_codes', label: 'OBD Code Analysis', description: 'Scan tool code interpretation' },
  ],
  'Perks & Limits': [
    { key: 'unlimited_sessions', label: 'Unlimited Sessions', description: 'No session count limits' },
    { key: 'parts_discount', label: 'Parts Discount', description: '10% off parts purchases' },
    { key: 'free_inspections', label: 'Free Annual Inspection', description: 'One free inspection per year' },
  ],
}

// Available car brands for specialist routing
const CAR_BRANDS = [
  'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Volkswagen',
  'Toyota', 'Honda', 'Nissan', 'Mazda', 'Subaru',
  'Ford', 'Chevrolet', 'Dodge', 'Ram', 'GMC',
  'Lexus', 'Acura', 'Infiniti', 'Tesla', 'Volvo',
  'Jeep', 'Hyundai', 'Kia', 'Genesis', 'Land Rover'
]

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // New plan template
  const newPlanTemplate: Omit<ServicePlan, 'id'> = {
    slug: '',
    name: '',
    price: 0,
    duration_minutes: 30,
    description: '',
    perks: [''],
    recommended_for: '',
    is_active: true,
    display_order: plans.length + 1,
    stripe_price_id: null,
    plan_category: 'basic',
    features: {},
    routing_preference: 'any',
    restricted_brands: [],
    requires_certification: false
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  async function fetchPlans() {
    try {
      const res = await fetch('/api/admin/plans')
      if (!res.ok) throw new Error('Failed to fetch plans')
      const data = await res.json()
      setPlans(data.plans)
    } catch (err) {
      console.error('Error fetching plans:', err)
      alert('Failed to load plans')
    } finally {
      setLoading(false)
    }
  }

  async function togglePlanStatus(planId: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/admin/plans/${planId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      })
      if (!res.ok) throw new Error('Failed to toggle plan')
      fetchPlans()
    } catch (err) {
      alert('Failed to toggle plan status')
    }
  }

  async function savePlan(plan: ServicePlan | Omit<ServicePlan, 'id'>) {
    try {
      const isNew = !('id' in plan)
      const url = isNew ? '/api/admin/plans' : `/api/admin/plans/${(plan as ServicePlan).id}`
      const method = isNew ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save plan')
      }

      setEditingPlan(null)
      setIsCreating(false)
      fetchPlans()
    } catch (err: any) {
      alert(err.message || 'Failed to save plan')
    }
  }

  async function deletePlan(planId: string) {
    if (!confirm('Are you sure you want to delete this plan? This cannot be undone.')) return

    try {
      const res = await fetch(`/api/admin/plans/${planId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete plan')
      fetchPlans()
    } catch (err) {
      alert('Failed to delete plan')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Service Plans Management</h1>
              <p className="mt-2 text-slate-400">
                Create, modify, or delete service plans. Changes appear instantly on customer dashboards.
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add New Plan
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Create Stripe Price first, then paste the Price ID here</li>
                <li>Toggle plans ON/OFF to show/hide on customer dashboard</li>
                <li>Use features to control what customers can access</li>
                <li>Brand routing sends customers to specialized mechanics</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Create New Plan Modal */}
        {isCreating && (
          <div className="mb-6">
            <PlanEditor
              plan={newPlanTemplate}
              onSave={(plan) => savePlan(plan)}
              onCancel={() => setIsCreating(false)}
            />
          </div>
        )}

        {/* Plans List */}
        <div className="space-y-4">
          {plans.map((plan) => (
            <div key={plan.id}>
              {editingPlan?.id === plan.id ? (
                <PlanEditor
                  plan={editingPlan}
                  onSave={(updatedPlan) => savePlan(updatedPlan)}
                  onCancel={() => setEditingPlan(null)}
                />
              ) : (
                <PlanCard
                  plan={plan}
                  onToggle={() => togglePlanStatus(plan.id, plan.is_active)}
                  onEdit={() => setEditingPlan(plan)}
                  onDelete={() => deletePlan(plan.id)}
                />
              )}
            </div>
          ))}
        </div>

        {plans.length === 0 && !isCreating && (
          <div className="rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/50 backdrop-blur-sm p-12 text-center">
            <p className="text-slate-500 mb-4">No plans yet. Create your first plan to get started!</p>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
            >
              <Plus className="h-5 w-5" />
              Create First Plan
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Plan Card Component
function PlanCard({
  plan,
  onToggle,
  onEdit,
  onDelete
}: {
  plan: ServicePlan
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const enabledFeatures = Object.entries(plan.features || {}).filter(([_, enabled]) => enabled)
  const routingBadge = plan.routing_preference === 'brand_specialist' ? '🏆 Brand Specialist' :
                       plan.routing_preference === 'general' ? '👔 General' : '⚡ Any'

  return (
    <div className={`rounded-xl border bg-white p-6 transition-all ${plan.is_active ? 'border-slate-200' : 'border-slate-300 bg-slate-50 opacity-60'}`}>
      <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
        <div className="flex-1 w-full">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
            <span className="text-2xl font-bold text-orange-600">${plan.price.toFixed(2)}</span>
            <span className="text-sm text-slate-500">{plan.duration_minutes} min</span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
              {plan.is_active ? 'Active' : 'Inactive'}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
              {plan.plan_category}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {routingBadge}
            </span>
          </div>

          <p className="text-slate-400 mb-3">{plan.description}</p>

          <div className="flex flex-wrap gap-2 mb-3">
            {plan.perks.map((perk, idx) => (
              <span key={idx} className="text-xs bg-slate-100 text-slate-200 px-2 py-1 rounded">
                ✓ {perk}
              </span>
            ))}
          </div>

          {enabledFeatures.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">Enabled Features:</p>
              <div className="flex flex-wrap gap-1">
                {enabledFeatures.map(([key, _]) => (
                  <span key={key} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    {key.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {plan.restricted_brands.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">Brand Specialists:</p>
              <div className="flex flex-wrap gap-1">
                {plan.restricted_brands.map((brand) => (
                  <span key={brand} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded font-semibold">
                    {brand}
                  </span>
                ))}
              </div>
            </div>
          )}

          {plan.stripe_price_id && (
            <p className="text-xs text-slate-500">Stripe: {plan.stripe_price_id}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex lg:flex-col items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={plan.is_active}
              onChange={onToggle}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-800/50 backdrop-blur-sm after:border-slate-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
          </label>
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 className="h-5 w-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Plan Editor Component
function PlanEditor({
  plan,
  onSave,
  onCancel
}: {
  plan: ServicePlan | Omit<ServicePlan, 'id'>
  onSave: (plan: ServicePlan | Omit<ServicePlan, 'id'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState(plan)

  function addPerk() {
    setFormData({ ...formData, perks: [...formData.perks, ''] })
  }

  function updatePerk(index: number, value: string) {
    const newPerks = [...formData.perks]
    newPerks[index] = value
    setFormData({ ...formData, perks: newPerks })
  }

  function removePerk(index: number) {
    setFormData({ ...formData, perks: formData.perks.filter((_, i) => i !== index) })
  }

  function toggleFeature(featureKey: string) {
    setFormData({
      ...formData,
      features: {
        ...formData.features,
        [featureKey]: !formData.features[featureKey]
      }
    })
  }

  function toggleBrand(brand: string) {
    const brands = formData.restricted_brands || []
    if (brands.includes(brand)) {
      setFormData({ ...formData, restricted_brands: brands.filter(b => b !== brand) })
    } else {
      setFormData({ ...formData, restricted_brands: [...brands, brand] })
    }
  }

  return (
    <div className="rounded-xl border-2 border-orange-500 bg-slate-800/50 backdrop-blur-sm p-6 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4">
        {'id' in plan ? 'Edit Plan' : 'Create New Plan'}
      </h3>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">Plan Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded-lg border border-slate-700 px-3 py-2"
            placeholder="e.g., BMW Premium Care"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">Slug (URL-safe) *</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            className="w-full rounded-lg border border-slate-700 px-3 py-2"
            placeholder="e.g., bmw-premium"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">Price ($) *</label>
          <input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            className="w-full rounded-lg border border-slate-700 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">Duration (minutes) *</label>
          <input
            type="number"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
            className="w-full rounded-lg border border-slate-700 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">Plan Category</label>
          <select
            value={formData.plan_category}
            onChange={(e) => setFormData({ ...formData, plan_category: e.target.value })}
            className="w-full rounded-lg border border-slate-700 px-3 py-2"
          >
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">Stripe Price ID</label>
          <input
            type="text"
            value={formData.stripe_price_id || ''}
            onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
            className="w-full rounded-lg border border-slate-700 px-3 py-2"
            placeholder="price_1ABC123..."
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-200 mb-1">Description *</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full rounded-lg border border-slate-700 px-3 py-2"
          rows={2}
          placeholder="What makes this plan special?"
        />
      </div>

      {/* Perks */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-200 mb-2">Display Perks (shown on cards)</label>
        {formData.perks.map((perk, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input
              type="text"
              value={perk}
              onChange={(e) => updatePerk(idx, e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 px-3 py-2"
              placeholder="Enter perk"
            />
            <button
              onClick={() => removePerk(idx)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ))}
        <button
          onClick={addPerk}
          className="text-sm text-blue-600 hover:underline"
        >
          + Add Perk
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-200 mb-1">Recommended For</label>
        <input
          type="text"
          value={formData.recommended_for}
          onChange={(e) => setFormData({ ...formData, recommended_for: e.target.value })}
          className="w-full rounded-lg border border-slate-700 px-3 py-2"
          placeholder="e.g., Ideal when you need quick reassurance"
        />
      </div>

      {/* Routing Preferences */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-white mb-3">🎯 Mechanic Routing Preferences</h4>
        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={formData.routing_preference === 'any'}
              onChange={() => setFormData({ ...formData, routing_preference: 'any', restricted_brands: [] })}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Any Available Mechanic (Fastest)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={formData.routing_preference === 'general'}
              onChange={() => setFormData({ ...formData, routing_preference: 'general', restricted_brands: [] })}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">General Mechanics Only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={formData.routing_preference === 'brand_specialist'}
              onChange={() => setFormData({ ...formData, routing_preference: 'brand_specialist' })}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">🏆 Brand Specialists Only</span>
          </label>
        </div>

        {formData.routing_preference === 'brand_specialist' && (
          <div>
            <p className="text-sm font-medium text-slate-200 mb-2">Select Brands:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-800/50 backdrop-blur-sm rounded border border-slate-700">
              {CAR_BRANDS.map(brand => (
                <label key={brand} className="flex items-center gap-2 cursor-pointer hover:bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={(formData.restricted_brands || []).includes(brand)}
                    onChange={() => toggleBrand(brand)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{brand}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer mt-3">
          <input
            type="checkbox"
            checked={formData.requires_certification}
            onChange={(e) => setFormData({ ...formData, requires_certification: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Require Red Seal Certification</span>
        </label>
      </div>

      {/* Features */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <h4 className="font-semibold text-white mb-3">✨ Plan Features (Controls customer access)</h4>
        <div className="space-y-4">
          {Object.entries(FEATURE_CATEGORIES).map(([category, features]) => (
            <div key={category}>
              <p className="text-sm font-semibold text-slate-200 mb-2">{category}:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {features.map(feature => (
                  <label key={feature.key} className="flex items-start gap-2 cursor-pointer hover:bg-slate-800/50 backdrop-blur-sm p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.features[feature.key] || false}
                      onChange={() => toggleFeature(feature.key)}
                      className="w-4 h-4 mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium block">{feature.label}</span>
                      <span className="text-xs text-slate-500">{feature.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onSave(formData)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700 font-semibold transition-colors"
        >
          <Save className="h-5 w-5" />
          Save Plan
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-6 py-3 text-slate-200 hover:bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 font-semibold transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
