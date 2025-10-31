'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Calendar, User, FileText, Star, Video, MessageSquare } from 'lucide-react'

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
  created_at: string
  started_at: string | null
  ended_at: string | null
  plan: string
  type: 'chat' | 'video' | 'diagnostic'
  status: string
  duration_minutes: number | null
  mechanic_id: string | null
  mechanic_name: string | null
  session_notes: string | null
  rating: number | null
  review: string | null
  vehicle_info: {
    year?: string
    make?: string
    model?: string
    vin?: string
  } | null
  files: SessionFile[]
}

interface SessionDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  session: SessionDetails | null
}

const PLAN_LABELS: Record<string, string> = {
  quick: 'Quick Chat',
  chat10: '10-Min Chat',
  chat30: '30-Min Chat',
  standard: 'Standard Video',
  video15: '15-Min Video',
  diagnostic: 'Full Diagnostic',
  premium: 'Premium Diagnostic',
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

export default function SessionDetailsModal({ isOpen, onClose, session }: SessionDetailsModalProps) {
  if (!session) return null

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
                      {session.type === 'video' ? (
                        <Video className="h-6 w-6 text-white" />
                      ) : (
                        <MessageSquare className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <Dialog.Title className="text-xl font-bold text-white">
                        {PLAN_LABELS[session.plan] || session.plan}
                      </Dialog.Title>
                      <p className="text-sm text-slate-400">Session Details</p>
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
                <div className="mt-6 space-y-6">
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
                      <Calendar className="h-4 w-4 text-orange-400" />
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

                  {/* Mechanic Info */}
                  {session.mechanic_name && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                        <User className="h-4 w-4 text-orange-400" />
                        Mechanic
                      </h3>
                      <p className="text-sm font-medium text-white">{session.mechanic_name}</p>
                    </div>
                  )}

                  {/* Vehicle Info */}
                  {session.vehicle_info && Object.keys(session.vehicle_info).length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                        <FileText className="h-4 w-4 text-orange-400" />
                        Vehicle Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        {session.vehicle_info.year && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Vehicle:</span>
                            <span className="font-medium text-white">
                              {session.vehicle_info.year} {session.vehicle_info.make} {session.vehicle_info.model}
                            </span>
                          </div>
                        )}
                        {session.vehicle_info.vin && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">VIN:</span>
                            <span className="font-mono text-xs text-white">{session.vehicle_info.vin}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Session Notes */}
                  {session.session_notes && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                        <FileText className="h-4 w-4 text-orange-400" />
                        Session Notes
                      </h3>
                      <p className="text-sm text-slate-300">{session.session_notes}</p>
                    </div>
                  )}

                  {/* Rating and Review */}
                  {(session.rating || session.review) && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                        <Star className="h-4 w-4 text-orange-400" />
                        Your Feedback
                      </h3>
                      {session.rating && (
                        <div className="mb-2 flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-5 w-5 ${
                                star <= session.rating! ? 'fill-orange-400 text-orange-400' : 'text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      {session.review && <p className="text-sm text-slate-300">{session.review}</p>}
                    </div>
                  )}

                  {/* Files */}
                  {session.files && session.files.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                        <FileText className="h-4 w-4 text-orange-400" />
                        Shared Files ({session.files.length})
                      </h3>
                      <div className="space-y-2">
                        {session.files.map((file) => (
                          <a
                            key={file.id}
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-sm transition hover:bg-white/10"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700">
                                <FileText className="h-5 w-5 text-slate-300" />
                              </div>
                              <div>
                                <p className="font-medium text-white">{file.file_name}</p>
                                <p className="text-xs text-slate-400">{formatFileSize(file.file_size)}</p>
                              </div>
                            </div>
                            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-4">
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
