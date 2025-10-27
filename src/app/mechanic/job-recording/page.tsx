'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Wrench,
  Plus,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Building2,
  Calendar,
  DollarSign
} from 'lucide-react'

interface Job {
  id: string
  total_revenue: number
  mechanic_share: number
  workshop_share: number
  platform_fee: number
  completed_at: string
  job_details: {
    customer_name: string
    vehicle_info: string
    job_description: string
  }
  organizations: {
    name: string
    city: string
    province: string
  }
  workshop_partnership_programs: {
    program_name: string
    program_type: string
  }
}

interface Agreement {
  id: string
  workshop_id: string
  program_id: string
  status: string
  organizations: {
    name: string
  }
  workshop_partnership_programs: {
    program_name: string
    program_type: string
  }
}

export default function JobRecordingPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [showForm, setShowForm] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    agreement_id: '',
    customer_name: '',
    vehicle_info: '',
    job_description: '',
    parts_cost: '',
    labor_cost: '',
    total_revenue: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [jobsRes, agreementsRes] = await Promise.all([
        fetch('/api/mechanics/jobs?limit=20'),
        fetch('/api/mechanics/agreements')
      ])

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        setJobs(jobsData.jobs || [])
      }

      if (agreementsRes.ok) {
        const agreementsData = await agreementsRes.json()
        setAgreements(agreementsData.agreements || [])
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/mechanics/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreement_id: formData.agreement_id,
          customer_name: formData.customer_name,
          vehicle_info: formData.vehicle_info,
          job_description: formData.job_description,
          parts_cost: parseFloat(formData.parts_cost) || 0,
          labor_cost: parseFloat(formData.labor_cost) || 0,
          total_revenue: parseFloat(formData.total_revenue)
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to record job')
      }

      const result = await response.json()
      setSuccessMessage(`Job recorded successfully! Your earnings: $${result.breakdown.mechanic_share.toFixed(2)}`)

      // Reset form and refresh jobs list
      setFormData({
        agreement_id: '',
        customer_name: '',
        vehicle_info: '',
        job_description: '',
        parts_cost: '',
        labor_cost: '',
        total_revenue: ''
      })
      setShowForm(false)
      fetchData()

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/mechanic/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Wrench className="w-8 h-8 text-orange-500" />
                Job Recording
              </h1>
              <p className="text-slate-400 mt-1">Record physical jobs completed at partner workshops</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              Record New Job
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-300">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Record Job Form */}
        {showForm && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Record New Job</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Workshop Partnership
                  </label>
                  <select
                    required
                    value={formData.agreement_id}
                    onChange={(e) => setFormData({ ...formData, agreement_id: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Select workshop...</option>
                    {agreements.filter(a => a.status === 'active').map((agreement) => (
                      <option key={agreement.id} value={agreement.id}>
                        {agreement.organizations.name} - {agreement.workshop_partnership_programs.program_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Vehicle Info
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.vehicle_info}
                    onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                    placeholder="2020 Toyota Camry"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Total Revenue
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.total_revenue}
                    onChange={(e) => setFormData({ ...formData, total_revenue: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                    placeholder="500.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Parts Cost (optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.parts_cost}
                    onChange={(e) => setFormData({ ...formData, parts_cost: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                    placeholder="200.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Labor Cost (optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.labor_cost}
                    onChange={(e) => setFormData({ ...formData, labor_cost: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                    placeholder="300.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Job Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.job_description}
                  onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
                  placeholder="Brake pad replacement, rotor resurfacing..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Record Job'}
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

        {/* Recorded Jobs List */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Recorded Jobs</h2>
          {jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-slate-900/50 rounded-lg border border-slate-700 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-semibold">{job.job_details.customer_name}</h3>
                        <span className="text-sm px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                          {job.job_details.vehicle_info}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm mb-2">{job.job_details.job_description}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {job.organizations.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(job.completed_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">${job.total_revenue.toFixed(2)}</div>
                      <div className="text-sm text-slate-400">Total Revenue</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-700">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Your Share</div>
                      <div className="text-lg font-bold text-orange-400">${job.mechanic_share.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Workshop Share</div>
                      <div className="text-lg font-bold text-purple-400">${job.workshop_share.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Platform Fee</div>
                      <div className="text-lg font-bold text-red-400">${job.platform_fee.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Wrench className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No jobs recorded yet</p>
              <p className="text-sm text-slate-500 mt-2">Start recording your physical workshop jobs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
