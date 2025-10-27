'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowLeft,
  AlertCircle,
  Calendar,
  FileText
} from 'lucide-react'

interface Application {
  id: string
  program_id: string
  workshop_id: string
  status: 'pending' | 'under_review' | 'approved' | 'rejected'
  cover_letter?: string
  availability_notes?: string
  references?: Array<{ name: string; phone: string; relationship: string }>
  submitted_at: string
  reviewed_at?: string
  workshop_partnership_programs: {
    id: string
    program_name: string
    program_type: string
    daily_rate?: number
    hourly_rate?: number
    mechanic_percentage?: number
    workshop_percentage?: number
    monthly_fee?: number
  }
  organizations: {
    id: string
    name: string
    city?: string
    province?: string
    phone?: string
    email?: string
  }
}

export default function MyPartnershipApplicationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([])
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadApplications()
  }, [])

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredApplications(applications)
    } else {
      setFilteredApplications(applications.filter(a => a.status === statusFilter))
    }
  }, [statusFilter, applications])

  const loadApplications = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/mechanics/partnerships/applications')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load applications')
      }

      setApplications(data.applications || [])

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      pending: {
        label: 'Pending Review',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: Clock
      },
      under_review: {
        label: 'Under Review',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: Eye
      },
      approved: {
        label: 'Approved',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: CheckCircle2
      },
      rejected: {
        label: 'Rejected',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: XCircle
      }
    }
    return configs[status] || configs.pending
  }

  const getProgramTypeLabel = (type: string) => {
    switch (type) {
      case 'bay_rental': return 'Bay Rental'
      case 'revenue_share': return 'Revenue Share'
      case 'membership': return 'Membership'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading applications...</p>
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
              <h1 className="text-3xl font-bold text-white">My Partnership Applications</h1>
              <p className="text-slate-400 mt-1">
                Track the status of your partnership program applications
              </p>
            </div>

            <button
              onClick={() => router.push('/mechanic/partnerships/browse')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Programs
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="mb-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow-sm p-2 inline-flex gap-2">
          {(['all', 'pending', 'under_review', 'approved', 'rejected'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-md font-medium transition-colors capitalize ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-gray-100'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
              {status === 'all' && applications.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {applications.length}
                </span>
              )}
            </button>
          ))}
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

        {/* Applications List */}
        {filteredApplications.length > 0 ? (
          <div className="space-y-4">
            {filteredApplications.map(application => {
              const statusConfig = getStatusConfig(application.status)
              const StatusIcon = statusConfig.icon

              return (
                <div
                  key={application.id}
                  className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm border-2 border-slate-700 hover:border-blue-300 transition-all"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-slate-400" />
                          <h3 className="text-lg font-semibold text-white">
                            {application.organizations.name}
                          </h3>
                        </div>
                        <h4 className="text-xl font-bold text-blue-600 mb-2">
                          {application.workshop_partnership_programs.program_name}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          {application.organizations.city && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>
                                {application.organizations.city}, {application.organizations.province}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Applied {new Date(application.submitted_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full border ${statusConfig.color}`}>
                          <StatusIcon className="w-4 h-4" />
                          {statusConfig.label}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">
                          {getProgramTypeLabel(application.workshop_partnership_programs.program_type)}
                        </span>
                      </div>
                    </div>

                    {/* Program Details */}
                    <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-lg p-4 mb-4">
                      <h5 className="text-sm font-semibold text-white mb-2">Program Details</h5>
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        {application.workshop_partnership_programs.program_type === 'bay_rental' && (
                          <>
                            {application.workshop_partnership_programs.daily_rate && (
                              <div>
                                <span className="text-slate-400">Daily Rate:</span>
                                <span className="ml-2 font-semibold text-white">
                                  ${application.workshop_partnership_programs.daily_rate}
                                </span>
                              </div>
                            )}
                            {application.workshop_partnership_programs.hourly_rate && (
                              <div>
                                <span className="text-slate-400">Hourly Rate:</span>
                                <span className="ml-2 font-semibold text-white">
                                  ${application.workshop_partnership_programs.hourly_rate}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        {application.workshop_partnership_programs.program_type === 'revenue_share' && (
                          <div>
                            <span className="text-slate-400">Revenue Split:</span>
                            <span className="ml-2 font-semibold text-green-600">
                              {application.workshop_partnership_programs.mechanic_percentage}%
                            </span>
                            <span className="text-slate-400"> / </span>
                            <span className="font-semibold text-slate-400">
                              {application.workshop_partnership_programs.workshop_percentage}%
                            </span>
                          </div>
                        )}
                        {application.workshop_partnership_programs.program_type === 'membership' && (
                          <div>
                            <span className="text-slate-400">Monthly Fee:</span>
                            <span className="ml-2 font-semibold text-white">
                              ${application.workshop_partnership_programs.monthly_fee}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Application Details */}
                    {(application.cover_letter || application.availability_notes) && (
                      <div className="border-t border-slate-700 pt-4">
                        {application.cover_letter && (
                          <div className="mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-slate-400" />
                              <h5 className="text-sm font-semibold text-white">Cover Letter</h5>
                            </div>
                            <p className="text-sm text-slate-300 line-clamp-2">
                              {application.cover_letter}
                            </p>
                          </div>
                        )}
                        {application.availability_notes && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <h5 className="text-sm font-semibold text-white">Availability</h5>
                            </div>
                            <p className="text-sm text-slate-300">
                              {application.availability_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Contact Info for Approved */}
                    {application.status === 'approved' && (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-green-900 mb-1">
                              Application Approved!
                            </p>
                            <p className="text-sm text-green-800 mb-2">
                              Contact the workshop to complete your partnership agreement and start working.
                            </p>
                            <div className="text-sm text-green-900">
                              <div>Phone: {application.organizations.phone}</div>
                              <div>Email: {application.organizations.email}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {statusFilter === 'all' ? 'No Applications Yet' : `No ${statusFilter.replace('_', ' ')} Applications`}
            </h3>
            <p className="text-slate-400 mb-6">
              {statusFilter === 'all'
                ? 'Browse partnership programs and submit your first application!'
                : `You don't have any ${statusFilter.replace('_', ' ')} applications.`}
            </p>
            <button
              onClick={() => router.push('/mechanic/partnerships/browse')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Browse Partnership Programs
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
