'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  DollarSign,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  Filter,
  ArrowLeft,
  AlertCircle,
  TrendingUp,
  Calendar
} from 'lucide-react'

interface PartnershipProgram {
  id: string
  workshop_id: string
  program_name: string
  program_type: 'bay_rental' | 'revenue_share' | 'membership'
  description?: string
  daily_rate?: number
  hourly_rate?: number
  mechanic_percentage?: number
  workshop_percentage?: number
  monthly_fee?: number
  included_bay_days?: number
  requirements?: string[]
  benefits?: string[]
  max_mechanics?: number
  is_active: boolean
  active_mechanics: number
  spots_available: number | null
  has_applied: boolean
  application_status: string | null
  organizations: {
    id: string
    name: string
    address?: string
    city?: string
    province?: string
    postal_code?: string
    phone?: string
    email?: string
  }
}

export default function BrowsePartnershipProgramsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [programs, setPrograms] = useState<PartnershipProgram[]>([])
  const [filteredPrograms, setFilteredPrograms] = useState<PartnershipProgram[]>([])
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [programTypeFilter, setProgramTypeFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('')
  const [provinceFilter, setProvinceFilter] = useState<string>('')

  useEffect(() => {
    loadPrograms()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [programs, programTypeFilter, cityFilter, provinceFilter])

  const loadPrograms = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/mechanics/partnerships/programs')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load programs')
      }

      setPrograms(data.programs || [])

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...programs]

    if (programTypeFilter !== 'all') {
      filtered = filtered.filter(p => p.program_type === programTypeFilter)
    }

    if (cityFilter) {
      filtered = filtered.filter(p =>
        p.organizations.city?.toLowerCase().includes(cityFilter.toLowerCase())
      )
    }

    if (provinceFilter) {
      filtered = filtered.filter(p =>
        p.organizations.province?.toLowerCase().includes(provinceFilter.toLowerCase())
      )
    }

    setFilteredPrograms(filtered)
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
      case 'bay_rental': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'revenue_share': return 'bg-green-100 text-green-800 border-green-300'
      case 'membership': return 'bg-purple-100 text-purple-800 border-purple-300'
      default: return 'bg-gray-100 text-slate-200 border-slate-700'
    }
  }

  const getApplicationStatusBadge = (status: string | null) => {
    if (!status) return null

    const statusConfig: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      under_review: { label: 'Under Review', color: 'bg-blue-100 text-blue-800 border-blue-300' },
      approved: { label: 'Approved', color: 'bg-green-100 text-green-800 border-green-300' },
      rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-300' }
    }

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-slate-200' }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${config.color}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading partnership programs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Workshop Partnership Programs</h1>
              <p className="text-slate-400 mt-1">
                Find workshops to partner with for physical repair work
              </p>
            </div>

            <button
              onClick={() => router.push('/mechanic/partnerships/applications')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              My Applications
            </button>
          </div>
        </div>

        {/* Legal Notice */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Legal Compliance Notice
              </p>
              <p className="text-sm text-blue-800">
                In Canada, commercial automotive repairs must be performed at licensed, insured workshop facilities.
                Partnership programs allow you to legally perform physical work at approved locations.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-white">Filters</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Program Type
              </label>
              <select
                value={programTypeFilter}
                onChange={(e) => setProgramTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="bay_rental">Bay Rental</option>
                <option value="revenue_share">Revenue Share</option>
                <option value="membership">Membership</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                City
              </label>
              <input
                type="text"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="e.g., Toronto"
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Province
              </label>
              <input
                type="text"
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                placeholder="e.g., ON"
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {(programTypeFilter !== 'all' || cityFilter || provinceFilter) && (
            <button
              onClick={() => {
                setProgramTypeFilter('all')
                setCityFilter('')
                setProvinceFilter('')
              }}
              className="mt-4 px-4 py-2 text-sm text-slate-400 hover:text-white font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Programs Grid */}
        {filteredPrograms.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredPrograms.map(program => (
              <div
                key={program.id}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm border-2 border-slate-700 hover:border-blue-300 transition-all"
              >
                {/* Header */}
                <div className="p-6 border-b border-slate-700">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-5 h-5 text-slate-400" />
                        <h3 className="text-lg font-semibold text-white">
                          {program.organizations.name}
                        </h3>
                      </div>
                      <h4 className="text-xl font-bold text-blue-600 mb-2">
                        {program.program_name}
                      </h4>
                    </div>

                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getProgramTypeColor(program.program_type)}`}>
                      {getProgramTypeLabel(program.program_type)}
                    </span>
                  </div>

                  {program.organizations.city && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {program.organizations.city}, {program.organizations.province}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pricing */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-slate-700">
                  {program.program_type === 'bay_rental' && (
                    <div>
                      {program.daily_rate && (
                        <div className="flex items-baseline gap-2 mb-1">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="text-2xl font-bold text-white">
                            ${program.daily_rate}
                          </span>
                          <span className="text-sm text-slate-400">/day</span>
                        </div>
                      )}
                      {program.hourly_rate && (
                        <div className="flex items-baseline gap-2">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="text-2xl font-bold text-white">
                            ${program.hourly_rate}
                          </span>
                          <span className="text-sm text-slate-400">/hour</span>
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        You keep 100% of your earnings
                      </p>
                    </div>
                  )}

                  {program.program_type === 'revenue_share' && (
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-green-600">
                            {program.mechanic_percentage}%
                          </span>
                          <span className="text-sm text-slate-400">you</span>
                        </div>
                        <span className="text-gray-400">/</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-slate-400">
                            {program.workshop_percentage}%
                          </span>
                          <span className="text-sm text-slate-400">workshop</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">
                        No upfront cost, revenue split on completed jobs
                      </p>
                    </div>
                  )}

                  {program.program_type === 'membership' && (
                    <div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <Calendar className="w-5 h-5 text-purple-600" />
                        <span className="text-2xl font-bold text-white">
                          ${program.monthly_fee}
                        </span>
                        <span className="text-sm text-slate-400">/month</span>
                      </div>
                      {program.included_bay_days && (
                        <p className="text-xs text-slate-400">
                          Includes {program.included_bay_days} bay-days per month
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Description */}
                {program.description && (
                  <div className="p-6 border-b border-slate-700">
                    <p className="text-sm text-slate-300">{program.description}</p>
                  </div>
                )}

                {/* Benefits */}
                {program.benefits && program.benefits.length > 0 && (
                  <div className="p-6 border-b border-slate-700">
                    <h5 className="text-sm font-semibold text-white mb-2">Benefits</h5>
                    <ul className="space-y-1">
                      {program.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Requirements */}
                {program.requirements && program.requirements.length > 0 && (
                  <div className="p-6 border-b border-slate-700">
                    <h5 className="text-sm font-semibold text-white mb-2">Requirements</h5>
                    <ul className="space-y-1">
                      {program.requirements.map((req, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                          <Clock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Footer */}
                <div className="p-6">
                  {program.max_mechanics && (
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                      <Users className="w-4 h-4" />
                      <span>
                        {program.active_mechanics} / {program.max_mechanics} mechanics
                        {program.spots_available !== null && program.spots_available > 0 && (
                          <span className="ml-2 text-green-600 font-semibold">
                            ({program.spots_available} spots available)
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {program.has_applied ? (
                    <div className="flex items-center justify-between">
                      {getApplicationStatusBadge(program.application_status)}
                      <button
                        onClick={() => router.push('/mechanic/partnerships/applications')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Application
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => router.push(`/mechanic/partnerships/apply/${program.id}`)}
                      disabled={program.spots_available === 0}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {program.spots_available === 0 ? 'Program Full' : 'Apply Now'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Programs Found
            </h3>
            <p className="text-slate-400 mb-6">
              {programTypeFilter !== 'all' || cityFilter || provinceFilter
                ? 'Try adjusting your filters to see more programs.'
                : 'No partnership programs are currently available. Check back later!'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
