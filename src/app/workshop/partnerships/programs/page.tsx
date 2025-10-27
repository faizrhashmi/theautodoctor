'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Handshake,
  Plus,
  ArrowLeft,
  Loader2,
  Building2,
  DollarSign,
  Users,
  Calendar,
  Wrench,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Program {
  id: string
  program_name: string
  program_type: 'bay_rental' | 'revenue_share' | 'membership'
  description: string
  daily_rate?: number
  hourly_rate?: number
  mechanic_percentage?: number
  workshop_percentage?: number
  monthly_fee?: number
  included_bay_days?: number
  requirements: string[]
  benefits: string[]
  max_mechanics?: number
  is_active: boolean
  application_count: number
  active_mechanics: number
  created_at: string
}

export default function WorkshopPartnershipProgramsPage() {
  const [loading, setLoading] = useState(true)
  const [programs, setPrograms] = useState<Program[]>([])
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    program_name: '',
    program_type: 'bay_rental' as 'bay_rental' | 'revenue_share' | 'membership',
    description: '',
    daily_rate: '',
    hourly_rate: '',
    mechanic_percentage: '',
    workshop_percentage: '',
    monthly_fee: '',
    included_bay_days: '',
    max_mechanics: '',
    requirements: '',
    benefits: ''
  })

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/workshops/programs?include_inactive=true')
      if (!response.ok) throw new Error('Failed to fetch programs')
      const data = await response.json()
      setPrograms(data.programs || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload: any = {
        program_name: formData.program_name,
        program_type: formData.program_type,
        description: formData.description,
        max_mechanics: formData.max_mechanics ? parseInt(formData.max_mechanics) : undefined,
        requirements: formData.requirements ? formData.requirements.split('\n').filter(r => r.trim()) : [],
        benefits: formData.benefits ? formData.benefits.split('\n').filter(b => b.trim()) : [],
        is_active: true
      }

      if (formData.program_type === 'bay_rental') {
        if (formData.daily_rate) payload.daily_rate = parseFloat(formData.daily_rate)
        if (formData.hourly_rate) payload.hourly_rate = parseFloat(formData.hourly_rate)
      } else if (formData.program_type === 'revenue_share') {
        payload.mechanic_percentage = parseFloat(formData.mechanic_percentage)
        payload.workshop_percentage = parseFloat(formData.workshop_percentage)
      } else if (formData.program_type === 'membership') {
        payload.monthly_fee = parseFloat(formData.monthly_fee)
        if (formData.included_bay_days) payload.included_bay_days = parseInt(formData.included_bay_days)
      }

      const response = await fetch('/api/workshops/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create program')
      }

      setSuccessMessage('Partnership program created successfully!')
      setShowForm(false)
      setFormData({
        program_name: '',
        program_type: 'bay_rental',
        description: '',
        daily_rate: '',
        hourly_rate: '',
        mechanic_percentage: '',
        workshop_percentage: '',
        monthly_fee: '',
        included_bay_days: '',
        max_mechanics: '',
        requirements: '',
        benefits: ''
      })
      fetchPrograms()

      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getProgramTypeLabel = (type: string) => {
    switch (type) {
      case 'bay_rental': return 'Bay Rental'
      case 'revenue_share': return 'Revenue Share'
      case 'membership': return 'Membership'
      default: return type
    }
  }

  const getProgramTypeColor = (type: string) => {
    switch (type) {
      case 'bay_rental': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      case 'revenue_share': return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'membership': return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/workshop/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Handshake className="w-8 h-8 text-orange-500" />
                Partnership Programs
              </h1>
              <p className="text-slate-400 mt-1">Create and manage mechanic partnership programs</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              Create Program
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-300">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Create Program Form */}
        {showForm && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Create New Partnership Program</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Program Name</label>
                  <input
                    type="text"
                    required
                    value={formData.program_name}
                    onChange={(e) => setFormData({ ...formData, program_name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                    placeholder="e.g., Standard Bay Rental, Pro Revenue Share"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Program Type</label>
                  <select
                    required
                    value={formData.program_type}
                    onChange={(e) => setFormData({ ...formData, program_type: e.target.value as any })}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="bay_rental">Bay Rental</option>
                    <option value="revenue_share">Revenue Share</option>
                    <option value="membership">Membership</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Max Mechanics (optional)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_mechanics}
                    onChange={(e) => setFormData({ ...formData, max_mechanics: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Bay Rental Fields */}
                {formData.program_type === 'bay_rental' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Daily Rate ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.daily_rate}
                        onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Hourly Rate ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {/* Revenue Share Fields */}
                {formData.program_type === 'revenue_share' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Mechanic Percentage (%)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="100"
                        value={formData.mechanic_percentage}
                        onChange={(e) => setFormData({ ...formData, mechanic_percentage: e.target.value, workshop_percentage: (100 - parseFloat(e.target.value || '0')).toString() })}
                        className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Workshop Percentage (%)</label>
                      <input
                        type="number"
                        required
                        readOnly
                        value={formData.workshop_percentage}
                        className="w-full px-4 py-2 bg-slate-900 text-slate-400 rounded-lg border border-slate-700 cursor-not-allowed"
                      />
                    </div>
                  </>
                )}

                {/* Membership Fields */}
                {formData.program_type === 'membership' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Monthly Fee ($)</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.monthly_fee}
                        onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Included Bay Days</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.included_bay_days}
                        onChange={(e) => setFormData({ ...formData, included_bay_days: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Requirements (one per line)</label>
                  <textarea
                    rows={4}
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                    placeholder="Red Seal Certification&#10;Minimum 5 years experience&#10;Own tools"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Benefits (one per line)</label>
                  <textarea
                    rows={4}
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                    placeholder="Access to premium tools&#10;Customer referrals&#10;Marketing support"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Program'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Programs List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {programs.map((program) => (
            <div
              key={program.id}
              className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">{program.program_name}</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm border ${getProgramTypeColor(program.program_type)}`}>
                    {getProgramTypeLabel(program.program_type)}
                  </span>
                </div>
                {program.is_active ? (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
              </div>

              {program.description && (
                <p className="text-slate-400 text-sm mb-4">{program.description}</p>
              )}

              {/* Program Details */}
              <div className="space-y-2 mb-4">
                {program.program_type === 'bay_rental' && (
                  <>
                    {program.daily_rate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Daily Rate:</span>
                        <span className="text-white font-semibold">${program.daily_rate}/day</span>
                      </div>
                    )}
                    {program.hourly_rate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Hourly Rate:</span>
                        <span className="text-white font-semibold">${program.hourly_rate}/hour</span>
                      </div>
                    )}
                  </>
                )}

                {program.program_type === 'revenue_share' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Split:</span>
                    <span className="text-white font-semibold">
                      {program.mechanic_percentage}% mechanic / {program.workshop_percentage}% workshop
                    </span>
                  </div>
                )}

                {program.program_type === 'membership' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Monthly Fee:</span>
                      <span className="text-white font-semibold">${program.monthly_fee}/month</span>
                    </div>
                    {program.included_bay_days && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Included Bay Days:</span>
                        <span className="text-white font-semibold">{program.included_bay_days} days</span>
                      </div>
                    )}
                  </>
                )}

                {program.max_mechanics && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Max Mechanics:</span>
                    <span className="text-white font-semibold">{program.max_mechanics}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-4 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-400">{program.active_mechanics} Active</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Handshake className="w-4 h-4 text-orange-400" />
                  <span className="text-slate-400">{program.application_count} Applications</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {programs.length === 0 && !showForm && (
          <div className="text-center py-12 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700">
            <Handshake className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No partnership programs yet</p>
            <p className="text-sm text-slate-500 mt-2">Create your first program to start partnering with mechanics</p>
          </div>
        )}
      </div>
    </div>
  )
}
