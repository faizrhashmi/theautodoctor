'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  Award,
  Briefcase,
  Filter
} from 'lucide-react'

interface Application {
  id: string
  status: 'pending' | 'under_review' | 'approved' | 'rejected'
  submitted_at: string
  message?: string
  workshop_partnership_programs: {
    program_name: string
    program_type: string
  }
  mechanics: {
    id: string
    full_name: string
    email: string
    phone: string
    certifications: string[]
    years_experience: number
    specializations: string[]
    red_seal_certified: boolean
    service_tier: string
  }
}

export default function WorkshopPartnershipApplicationsPage() {
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchApplications()
  }, [selectedStatus])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const statusParam = selectedStatus !== 'all' ? `?status=${selectedStatus}` : ''
      const response = await fetch(`/api/workshops/applications${statusParam}`)
      if (!response.ok) throw new Error('Failed to fetch applications')
      const data = await response.json()
      setApplications(data.applications || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApplicationAction = async (applicationId: string, action: 'approve' | 'reject') => {
    try {
      setProcessingId(applicationId)
      const response = await fetch(`/api/workshops/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'approve' ? 'approved' : 'rejected'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${action} application`)
      }

      fetchApplications()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/50'
      case 'under_review': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />
      case 'rejected': return <XCircle className="w-4 h-4" />
      case 'under_review': return <Clock className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
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
                <Users className="w-8 h-8 text-orange-500" />
                Partnership Applications
              </h1>
              <p className="text-slate-400 mt-1">Review and manage mechanic partnership applications</p>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:outline-none"
              >
                <option value="all">All Applications</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Applications List */}
        <div className="space-y-6">
          {applications.map((application) => (
            <div
              key={application.id}
              className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">
                      {application.mechanics.full_name}
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${getStatusColor(application.status)}`}>
                      {getStatusIcon(application.status)}
                      {application.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Applied for: <span className="text-orange-400 font-medium">{application.workshop_partnership_programs.program_name}</span>
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    Submitted {new Date(application.submitted_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Mechanic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <a href={`mailto:${application.mechanics.email}`} className="text-slate-300 hover:text-white">
                      {application.mechanics.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-300">{application.mechanics.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-300">
                      {application.mechanics.years_experience} years experience
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {application.mechanics.red_seal_certified && (
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-400 font-medium">Red Seal Certified</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <p className="text-slate-500 mb-1">Service Tier:</p>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                      {application.mechanics.service_tier}
                    </span>
                  </div>
                </div>
              </div>

              {/* Specializations */}
              {application.mechanics.specializations && application.mechanics.specializations.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-slate-500 mb-2">Specializations:</p>
                  <div className="flex flex-wrap gap-2">
                    {application.mechanics.specializations.map((spec, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-xs"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {application.mechanics.certifications && application.mechanics.certifications.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-slate-500 mb-2">Certifications:</p>
                  <div className="flex flex-wrap gap-2">
                    {application.mechanics.certifications.map((cert, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs border border-purple-500/50"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Application Message */}
              {application.message && (
                <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <p className="text-sm text-slate-500 mb-1">Message from applicant:</p>
                  <p className="text-slate-300 text-sm">{application.message}</p>
                </div>
              )}

              {/* Action Buttons */}
              {application.status === 'pending' && (
                <div className="flex gap-4 pt-4 border-t border-slate-700">
                  <button
                    onClick={() => handleApplicationAction(application.id, 'approve')}
                    disabled={processingId === application.id}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {processingId === application.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleApplicationAction(application.id, 'reject')}
                    disabled={processingId === application.id}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5" />
                    {processingId === application.id ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {applications.length === 0 && (
          <div className="text-center py-12 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No applications found</p>
            <p className="text-sm text-slate-500 mt-2">
              {selectedStatus === 'all'
                ? 'Applications will appear here when mechanics apply to your programs'
                : `No ${selectedStatus} applications`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
