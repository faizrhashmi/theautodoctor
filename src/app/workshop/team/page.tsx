'use client'

import { useState, useEffect } from 'react'
import { Users, Star, Shield, Edit2, Trash2, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { BrandSelector } from '@/components/mechanic/BrandSelector'

interface TeamMechanic {
  id: string
  name: string
  email: string
  phone: string
  years_of_experience: number
  is_brand_specialist: boolean
  brand_specializations: string[]
  specialist_tier: 'general' | 'brand' | 'master'
  red_seal_certified: boolean
  account_status: string
  account_type: string
}

export default function WorkshopTeamPage() {
  const [mechanics, setMechanics] = useState<TeamMechanic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingMechanic, setEditingMechanic] = useState<string | null>(null)
  const [editData, setEditData] = useState<{
    is_brand_specialist: boolean
    brand_specializations: string[]
    specialist_tier: string
  } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTeamMechanics()
  }, [])

  const fetchTeamMechanics = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/workshop/team/mechanics')

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch mechanics')
      }

      const data = await response.json()
      setMechanics(data.mechanics || [])
    } catch (err: any) {
      console.error('Failed to fetch mechanics:', err)
      setError(err.message || 'Failed to load team members')
    } finally {
      setLoading(false)
    }
  }

  const handleEditSpecialist = (mechanic: TeamMechanic) => {
    setEditingMechanic(mechanic.id)
    setEditData({
      is_brand_specialist: mechanic.is_brand_specialist,
      brand_specializations: mechanic.brand_specializations || [],
      specialist_tier: mechanic.specialist_tier || 'general'
    })
  }

  const handleSaveSpecialist = async (mechanicId: string) => {
    if (!editData) return

    try {
      setSaving(true)
      const response = await fetch(`/api/workshop/team/mechanics/${mechanicId}/specialist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update specialist status')
      }

      await fetchTeamMechanics() // Refresh list
      setEditingMechanic(null)
      setEditData(null)
    } catch (err: any) {
      console.error('Failed to update specialist status:', err)
      alert(`Failed to update: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveSpecialist = async (mechanicId: string) => {
    if (!confirm('Remove specialist designation from this mechanic?')) return

    try {
      setSaving(true)
      const response = await fetch(`/api/workshop/team/mechanics/${mechanicId}/specialist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_brand_specialist: false,
          brand_specializations: [],
          specialist_tier: 'general'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove specialist')
      }

      await fetchTeamMechanics()
    } catch (err: any) {
      console.error('Failed to remove specialist:', err)
      alert(`Failed to remove: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading team...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">Error Loading Team</h3>
              <p className="text-red-300 text-sm mb-4">{error}</p>
              <button
                onClick={fetchTeamMechanics}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const specialists = mechanics.filter(m => m.is_brand_specialist)
  const generalMechanics = mechanics.filter(m => !m.is_brand_specialist)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-orange-400" />
            <h1 className="text-3xl font-bold text-white">Team Management</h1>
          </div>
          <p className="text-slate-400">
            Manage your mechanics and designate brand specialists
          </p>
        </div>

        {/* Specialists Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-orange-400" />
            Brand Specialists ({specialists.length})
          </h2>

          {specialists.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
              <Star className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No specialists designated yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Designate mechanics as specialists below to enable premium bookings
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {specialists.map(mechanic => (
                <div
                  key={mechanic.id}
                  className="bg-slate-800/50 border border-orange-500/30 rounded-xl p-6"
                >
                  {editingMechanic === mechanic.id ? (
                    // EDIT MODE
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{mechanic.name}</h3>
                          {mechanic.account_type === 'individual_mechanic' && (
                            <span className="text-xs text-orange-400">Owner/Operator</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveSpecialist(mechanic.id)}
                            disabled={saving}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white rounded-lg font-medium transition flex items-center gap-2"
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingMechanic(null)
                              setEditData(null)
                            }}
                            disabled={saving}
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-600/50 text-white rounded-lg font-medium transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Specialist Tier
                        </label>
                        <select
                          value={editData?.specialist_tier}
                          onChange={(e) => setEditData({ ...editData!, specialist_tier: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-900 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="general">General Mechanic</option>
                          <option value="brand">Brand Specialist</option>
                          <option value="master">Master Technician</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Certified Brands
                        </label>
                        <BrandSelector
                          value={editData?.brand_specializations || []}
                          onChange={(brands) => setEditData({ ...editData!, brand_specializations: brands })}
                        />
                      </div>
                    </div>
                  ) : (
                    // VIEW MODE
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{mechanic.name}</h3>
                          <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs font-semibold rounded-full">
                            {mechanic.specialist_tier === 'master' ? 'Master' : 'Brand Specialist'}
                          </span>
                          {mechanic.account_type === 'individual_mechanic' && (
                            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-semibold rounded-full">
                              Owner
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mb-1">{mechanic.email}</p>
                        <p className="text-sm text-slate-400 mb-3">
                          {mechanic.years_of_experience} years experience
                          {mechanic.red_seal_certified && ' • Red Seal Certified'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {mechanic.brand_specializations?.map(brand => (
                            <span
                              key={brand}
                              className="px-3 py-1 bg-slate-700 text-slate-200 text-xs rounded-lg"
                            >
                              {brand}
                            </span>
                          ))}
                          {(!mechanic.brand_specializations || mechanic.brand_specializations.length === 0) && (
                            <span className="text-xs text-slate-500">No brands specified</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSpecialist(mechanic)}
                          className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                          title="Edit specialist details"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveSpecialist(mechanic.id)}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition"
                          title="Remove specialist designation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* General Mechanics Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-400" />
            General Mechanics ({generalMechanics.length})
          </h2>

          {generalMechanics.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
              <p className="text-slate-400">All team members are designated as specialists</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {generalMechanics.map(mechanic => (
                <div
                  key={mechanic.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
                >
                  {editingMechanic === mechanic.id ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{mechanic.name}</h3>
                          {mechanic.account_type === 'individual_mechanic' && (
                            <span className="text-xs text-orange-400">Owner/Operator</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Certified Brands
                        </label>
                        <BrandSelector
                          value={editData?.brand_specializations || []}
                          onChange={(brands) => setEditData({
                            is_brand_specialist: true,
                            brand_specializations: brands,
                            specialist_tier: 'brand'
                          })}
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveSpecialist(mechanic.id)}
                          disabled={saving || !editData?.brand_specializations?.length}
                          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-orange-500/50 disabled:to-orange-600/50 text-white rounded-lg font-medium transition flex items-center gap-2"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                          Save as Specialist
                        </button>
                        <button
                          onClick={() => {
                            setEditingMechanic(null)
                            setEditData(null)
                          }}
                          disabled={saving}
                          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-600/50 text-white rounded-lg font-medium transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{mechanic.name}</h3>
                          {mechanic.account_type === 'individual_mechanic' && (
                            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-semibold rounded-full">
                              Owner
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mb-1">{mechanic.email}</p>
                        <p className="text-sm text-slate-400">
                          {mechanic.years_of_experience} years experience
                          {mechanic.red_seal_certified && ' • Red Seal Certified'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingMechanic(mechanic.id)
                          setEditData({
                            is_brand_specialist: true,
                            brand_specializations: [],
                            specialist_tier: 'brand'
                          })
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                      >
                        <Star className="h-4 w-4" />
                        Designate as Specialist
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
