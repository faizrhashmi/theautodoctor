'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, GripVertical } from 'lucide-react'

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
}

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
    display_order: plans.length + 1
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

      if (!res.ok) throw new Error('Failed to save plan')

      setEditingPlan(null)
      setIsCreating(false)
      fetchPlans()
    } catch (err) {
      alert('Failed to save plan')
    }
  }

  async function deletePlan(planId: string) {
    if (!confirm('Are you sure you want to delete this plan?')) return

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
      <div className="flex h-screen items-center justify-center">
        <div className="text-slate-600">Loading plans...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Service Plans Management</h1>
            <p className="mt-2 text-slate-600">
              Add, modify, or delete service plans. Changes appear instantly on customer dashboards.
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
          >
            <Plus className="h-5 w-5" />
            Add New Plan
          </button>
        </div>

        {/* Create New Plan Modal */}
        {isCreating && (
          <PlanEditor
            plan={newPlanTemplate}
            onSave={(plan) => savePlan(plan)}
            onCancel={() => setIsCreating(false)}
          />
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

        {plans.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-slate-500">No plans yet. Create your first plan!</p>
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
  return (
    <div className={`rounded-xl border bg-white p-6 ${plan.is_active ? 'border-slate-200' : 'border-slate-300 bg-slate-50 opacity-60'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
            <span className="text-2xl font-bold text-orange-600">${plan.price.toFixed(2)}</span>
            <span className="text-sm text-slate-500">{plan.duration_minutes} min</span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
              {plan.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-slate-600 mb-3">{plan.description}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {plan.perks.map((perk, idx) => (
              <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                ✓ {perk}
              </span>
            ))}
          </div>
          <p className="text-sm text-slate-500 italic">{plan.recommended_for}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={plan.is_active}
              onChange={onToggle}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
          </label>
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            title="Edit"
          >
            <Edit2 className="h-5 w-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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

  return (
    <div className="rounded-xl border-2 border-orange-500 bg-white p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4">
        {'id' in plan ? 'Edit Plan' : 'Create New Plan'}
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Plan Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="e.g., Quick Chat"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL-safe)</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="e.g., quick"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
          <input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
          <input
            type="number"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          rows={2}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Perks</label>
        {formData.perks.map((perk, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input
              type="text"
              value={perk}
              onChange={(e) => updatePerk(idx, e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
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

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Recommended For</label>
        <input
          type="text"
          value={formData.recommended_for}
          onChange={(e) => setFormData({ ...formData, recommended_for: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="e.g., Ideal when you need quick reassurance"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onSave(formData)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          <Save className="h-5 w-5" />
          Save Plan
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
