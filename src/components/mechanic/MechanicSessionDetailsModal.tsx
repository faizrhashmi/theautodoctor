'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  X, Calendar, User, FileText, Star, Video, MessageSquare,
  Download, DollarSign, Clock, Car, Loader2, FileIcon, ExternalLink
} from 'lucide-react'
import { getMechanicType, MechanicType, canAccessEarnings, MechanicTypeData } from '@/types/mechanic'
import { downloadSessionPdf } from '@/lib/reports/sessionReport'

interface SessionFile {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  uploaded_by: string
  created_at: string
}

interface SessionDetails {
  id: string
  type: 'chat' | 'video' | 'diagnostic'
  status: string
  plan: string
  created_at: string
  started_at: string | null
  ended_at: string | null
  duration_minutes: number | null
  customer_id: string
  mechanic_id: string
  rating: number | null
  diagnosis_summary?: string
  base_price?: number
  session?: {
    id: string
    concern_summary: string
    vehicle_id: string
    vehicles?: {
      id: string
      year: string
      make: string
      model: string
      color?: string
      license_plate?: string
    }
  } | null
  customer?: {
    id: string
    full_name: string
    email: string
  } | null
}

interface MechanicSessionDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string | null
  mechanicData: MechanicTypeData
  onCreateRFQ?: (sessionId: string) => void
  onCreateQuote?: (sessionId: string) => void
}

const PLAN_LABELS: Record<string, string> = {
  quick: 'Quick Chat',
  chat10: '10-Min Chat',
  chat30: '30-Min Chat',
  standard: 'Standard Video',
  video15: '15-Min Video',
  diagnostic: 'Full Diagnostic',
  premium: 'Premium Diagnostic',
  free: 'Free Session',
}

const STATUS_COLORS: Record<string, string> = {
  live: 'bg-green-500/20 text-green-300 border-green-500/30',
  waiting: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  pending: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  scheduled: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  completed: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
  canceled: 'bg-red-500/20 text-red-300 border-red-500/30',
}

const MECHANIC_SHARE = 0.7 // 70% for mechanics

export default function MechanicSessionDetailsModal({
  isOpen,
  onClose,
  sessionId,
  mechanicData,
  onCreateRFQ,
  onCreateQuote,
}: MechanicSessionDetailsModalProps) {
  const [session, setSession] = useState<SessionDetails | null>(null)
  const [files, setFiles] = useState<SessionFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  const mechanicType = getMechanicType(mechanicData)
  const showEarnings = canAccessEarnings(mechanicData)

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchSessionDetails()
    } else {
      setSession(null)
      setFiles([])
      setError(null)
    }
  }, [isOpen, sessionId])

  const fetchSessionDetails = async () => {
    if (!sessionId) return

    setLoading(true)
    setError(null)

    try {
      // Fetch session details
      const sessionRes = await fetch(`/api/mechanic/sessions/${sessionId}`)
      if (!sessionRes.ok) {
        const errorData = await sessionRes.json()
        throw new Error(errorData.error || 'Failed to load session')
      }
      const sessionData = await sessionRes.json()
      setSession(sessionData)

      // Fetch session files (if endpoint exists)
      try {
        const filesRes = await fetch(`/api/sessions/${sessionId}/files`)
        if (filesRes.ok) {
          const filesData = await filesRes.json()
          setFiles(filesData.files || [])
        }
      } catch (err) {
        console.warn('Could not fetch session files:', err)
        // Non-critical, continue without files
      }
    } catch (err: any) {
      console.error('Error fetching session details:', err)
      setError(err.message || 'Failed to load session details')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!sessionId) return

    setDownloadingPDF(true)
    try {
      await downloadSessionPdf(sessionId)
    } catch (err) {
      console.error('PDF download error:', err)
      alert('Failed to download PDF report')
    } finally {
      setDownloadingPDF(false)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins} minutes`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const calculateEarnings = () => {
    if (!session?.base_price) return '0.00'
    const earnings = (session.base_price / 100) * MECHANIC_SHARE
    return earnings.toFixed(2)
  }

  const canShowRFQButton = () => {
    if (!session || mechanicType !== MechanicType.VIRTUAL_ONLY) return false
    if (session.status !== 'completed') return false

    // Check if within 7 days
    if (session.ended_at) {
      const endDate = new Date(session.ended_at)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return endDate >= sevenDaysAgo
    }
    return false
  }

  const canShowQuoteButton = () => {
    if (!session || mechanicType !== MechanicType.INDEPENDENT_WORKSHOP) return false
    return session.status === 'completed'
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl mx-4 transform overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
                      {session?.type === 'video' ? (
                        <Video className="h-6 w-6 text-white" />
                      ) : (
                        <MessageSquare className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <Dialog.Title className="text-xl font-bold text-white">
                        {session ? PLAN_LABELS[session.plan] || session.plan : 'Session Details'}
                      </Dialog.Title>
                      <p className="text-sm text-slate-400">Session Information</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="mt-6 space-y-6 max-h-[60vh] overflow-y-auto">
                  {loading && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                      <span className="ml-3 text-slate-400">Loading session details...</span>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  )}

                  {session && !loading && (
                    <>
                      {/* Status and Type */}
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            STATUS_COLORS[session.status.toLowerCase()] || STATUS_COLORS.pending
                          }`}
                        >
                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-current"></span>
                          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/20 px-3 py-1.5 text-xs font-semibold text-blue-300">
                          {session.type === 'video' ? 'Video Call' : session.type === 'chat' ? 'Live Chat' : 'Diagnostic'}
                        </span>
                      </div>

                      {/* Timeline */}
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                          <Clock className="h-4 w-4 text-orange-400" />
                          Timeline
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Created:</span>
                            <span className="font-medium text-white">{formatDate(session.created_at)}</span>
                          </div>
                          {session.started_at && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Started:</span>
                              <span className="font-medium text-white">{formatDate(session.started_at)}</span>
                            </div>
                          )}
                          {session.ended_at && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Ended:</span>
                              <span className="font-medium text-white">{formatDate(session.ended_at)}</span>
                            </div>
                          )}
                          {session.duration_minutes && (
                            <div className="flex justify-between border-t border-white/10 pt-2">
                              <span className="text-slate-400">Duration:</span>
                              <span className="font-medium text-orange-400">{formatDuration(session.duration_minutes)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Customer Info */}
                      {session.customer && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                            <User className="h-4 w-4 text-orange-400" />
                            Customer
                          </h3>
                          <p className="text-sm font-medium text-white">{session.customer.full_name}</p>
                        </div>
                      )}

                      {/* Vehicle Info */}
                      {session.session?.vehicles && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                            <Car className="h-4 w-4 text-orange-400" />
                            Vehicle Information
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Vehicle:</span>
                              <span className="font-medium text-white">
                                {session.session.vehicles.year} {session.session.vehicles.make} {session.session.vehicles.model}
                              </span>
                            </div>
                            {session.session.vehicles.license_plate && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">License Plate:</span>
                                <span className="font-mono text-xs text-white">{session.session.vehicles.license_plate}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Issue/Concern */}
                      {(session.diagnosis_summary || session.session?.concern_summary) && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                            <FileText className="h-4 w-4 text-orange-400" />
                            Customer Concern
                          </h3>
                          <p className="text-sm text-slate-300">
                            {session.diagnosis_summary || session.session?.concern_summary}
                          </p>
                        </div>
                      )}

                      {/* Earnings Section (only for Virtual-Only and Independent Workshop) */}
                      {showEarnings && session.base_price && session.status === 'completed' && (
                        <div className="rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-600/10 p-4">
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                            <DollarSign className="h-4 w-4 text-green-400" />
                            Your Earnings
                          </h3>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-green-400">${calculateEarnings()}</span>
                            <span className="text-sm text-slate-400">(70% of ${(session.base_price / 100).toFixed(2)})</span>
                          </div>
                        </div>
                      )}

                      {/* Rating */}
                      {session.rating && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                            <Star className="h-4 w-4 text-orange-400" />
                            Customer Rating
                          </h3>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-5 w-5 ${
                                  star <= session.rating! ? 'fill-orange-400 text-orange-400' : 'text-slate-600'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Files */}
                      {files.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                            <FileIcon className="h-4 w-4 text-orange-400" />
                            Shared Files ({files.length})
                          </h3>
                          <div className="space-y-2">
                            {files.map((file) => (
                              <a
                                key={file.id}
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm transition hover:bg-white/10"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700">
                                    <FileIcon className="h-5 w-5 text-slate-300" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-white">{file.file_name}</p>
                                    <p className="text-xs text-slate-400">{formatFileSize(file.file_size)}</p>
                                  </div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-slate-400" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-white/10 pt-4">
                  {/* RFQ Button (Virtual-Only Mechanics) */}
                  {canShowRFQButton() && onCreateRFQ && (
                    <button
                      onClick={() => {
                        onCreateRFQ(sessionId!)
                        onClose()
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-6 py-2.5 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/20"
                    >
                      <FileText className="h-4 w-4" />
                      Create RFQ (Earn 2%)
                    </button>
                  )}

                  {/* Quote Button (Independent Workshop) */}
                  {canShowQuoteButton() && onCreateQuote && (
                    <button
                      onClick={() => {
                        onCreateQuote(sessionId!)
                        onClose()
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-6 py-2.5 text-sm font-semibold text-green-300 transition hover:bg-green-500/20"
                    >
                      <FileText className="h-4 w-4" />
                      Create Quote
                    </button>
                  )}

                  {/* Download PDF */}
                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloadingPDF || !session}
                    className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingPDF ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download PDF
                      </>
                    )}
                  </button>

                  {/* Close */}
                  <button
                    onClick={onClose}
                    className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
