'use client'

import { useState } from 'react'
import {
  X, Paperclip, Car, AlertCircle, Calendar, User, Mail,
  Download, Eye, Image as ImageIcon, Video as VideoIcon, FileType,
  CheckCircle2, PlayCircle, ExternalLink
} from 'lucide-react'

type RequestDetail = {
  id: string
  customerName: string
  customerEmail: string | null
  sessionType: string
  planCode: string
  createdAt: string
  notes: string | null
  intake: any | null
  files: any[]
  sessionId: string | null
}

type EnhancedRequestDetailModalProps = {
  request: RequestDetail | null
  onClose: () => void
  onAccept?: (requestId: string) => void
  onStartSession?: (sessionId: string, sessionType: string) => void
  accepting?: boolean
  accepted?: boolean
}

type Tab = 'overview' | 'vehicle' | 'concern' | 'attachments'

export default function EnhancedRequestDetailModal({
  request,
  onClose,
  onAccept,
  onStartSession,
  accepting,
  accepted
}: EnhancedRequestDetailModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [previewFile, setPreviewFile] = useState<any | null>(null)

  if (!request) return null

  const intake = request.intake
  const vehicleInfo = intake?.vehicle_year && intake?.vehicle_make && intake?.vehicle_model
    ? `${intake.vehicle_year} ${intake.vehicle_make} ${intake.vehicle_model}`
    : null

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'vehicle', label: 'Vehicle', count: vehicleInfo || intake?.vin ? 1 : 0 },
    { id: 'concern', label: 'Concern', count: intake?.concern || intake?.details ? 1 : 0 },
    { id: 'attachments', label: 'Files', count: request.files?.length || 0 },
  ]

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />
    if (fileType.startsWith('video/')) return <VideoIcon className="h-5 w-5" />
    return <FileType className="h-5 w-5" />
  }

  const isImageFile = (fileType: string) => fileType.startsWith('image/')
  const isVideoFile = (fileType: string) => fileType.startsWith('video/')

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900 shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Request Details</h2>
                <p className="mt-1 text-sm text-slate-400">{request.customerName}</p>
              </div>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 whitespace-nowrap rounded-t-xl px-4 py-3 text-sm font-semibold transition
                    ${activeTab === tab.id
                      ? 'bg-slate-800 text-white border-t-2 border-orange-500'
                      : 'text-slate-400 hover:text-slate-200'
                    }
                  `}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`
                      inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold
                      ${activeTab === tab.id ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'}
                    `}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 220px)' }}>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                      <User className="h-6 w-6 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Customer Information</h3>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Name</p>
                      <p className="mt-2 text-base font-semibold text-white">{request.customerName}</p>
                    </div>
                    {request.customerEmail && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <p className="text-sm text-slate-300">{request.customerEmail}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Session Type</p>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-orange-500/20 px-3 py-1.5">
                        <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                        <p className="text-sm font-bold text-orange-300 uppercase">{request.sessionType}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Requested</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <p className="text-sm text-slate-300">{new Date(request.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Quick Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-purple-900/20 to-purple-800/10 p-4">
                    <div className="flex items-center gap-3">
                      <Car className="h-8 w-8 text-purple-400" />
                      <div>
                        <p className="text-xs font-medium text-slate-400">Vehicle Info</p>
                        <p className="text-sm font-bold text-white">{vehicleInfo || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-green-900/20 to-green-800/10 p-4">
                    <div className="flex items-center gap-3">
                      <Paperclip className="h-8 w-8 text-green-400" />
                      <div>
                        <p className="text-xs font-medium text-slate-400">Attachments</p>
                        <p className="text-sm font-bold text-white">{request.files?.length || 0} files</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-amber-900/20 to-amber-800/10 p-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-8 w-8 text-amber-400" />
                      <div>
                        <p className="text-xs font-medium text-slate-400">Concern</p>
                        <p className="text-sm font-bold text-white">{intake?.concern ? 'Provided' : 'None'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Tab */}
            {activeTab === 'vehicle' && (
              <section className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20">
                    <Car className="h-6 w-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Vehicle Information</h3>
                </div>
                {intake && (vehicleInfo || intake.vin || intake.odometer || intake.plate) ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    {vehicleInfo && (
                      <div className="rounded-xl border border-purple-500/30 bg-purple-900/10 p-4">
                        <p className="text-xs font-medium text-purple-300 uppercase tracking-wider">Vehicle</p>
                        <p className="mt-2 text-lg font-bold text-white">{vehicleInfo}</p>
                      </div>
                    )}
                    {intake.vin && (
                      <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">VIN</p>
                        <p className="mt-2 text-sm text-slate-300 font-mono tracking-wide">{intake.vin}</p>
                      </div>
                    )}
                    {intake.odometer && (
                      <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Odometer</p>
                        <p className="mt-2 text-base font-semibold text-white">{intake.odometer} miles</p>
                      </div>
                    )}
                    {intake.plate && (
                      <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">License Plate</p>
                        <p className="mt-2 text-base font-semibold text-white font-mono">{intake.plate}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-700/50 bg-slate-900/30 p-8 text-center">
                    <Car className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                    <p className="text-sm text-slate-500">No vehicle information provided</p>
                  </div>
                )}
              </section>
            )}

            {/* Concern Tab */}
            {activeTab === 'concern' && (
              <section className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-900/20 to-orange-900/20 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20">
                    <AlertCircle className="h-6 w-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-amber-100">Customer Concern</h3>
                </div>
                {intake?.concern || intake?.details || request.notes ? (
                  <div className="space-y-6">
                    {intake?.concern && (
                      <div>
                        <p className="text-sm font-semibold text-amber-300 uppercase tracking-wider">Primary Concern</p>
                        <p className="mt-3 text-base text-amber-50 leading-relaxed bg-amber-900/20 rounded-xl p-4 border border-amber-500/20">
                          {intake.concern}
                        </p>
                      </div>
                    )}
                    {intake?.details && (
                      <div>
                        <p className="text-sm font-semibold text-amber-300 uppercase tracking-wider">Additional Details</p>
                        <p className="mt-3 text-sm text-amber-50 leading-relaxed whitespace-pre-wrap bg-amber-900/20 rounded-xl p-4 border border-amber-500/20">
                          {intake.details}
                        </p>
                      </div>
                    )}
                    {request.notes && (
                      <div>
                        <p className="text-sm font-semibold text-amber-300 uppercase tracking-wider">Session Notes</p>
                        <p className="mt-3 text-sm text-amber-50 leading-relaxed bg-amber-900/20 rounded-xl p-4 border border-amber-500/20">
                          {request.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-900/10 p-8 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-amber-600/50 mb-3" />
                    <p className="text-sm text-amber-400/70">No concern details provided</p>
                  </div>
                )}
              </section>
            )}

            {/* Attachments Tab */}
            {activeTab === 'attachments' && (
              <section className="space-y-4">
                {request.files && request.files.length > 0 ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/20">
                        <Paperclip className="h-6 w-6 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Attachments</h3>
                        <p className="text-sm text-slate-400">{request.files.length} file{request.files.length > 1 ? 's' : ''} uploaded</p>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {request.files.map((file) => (
                        <div
                          key={file.id}
                          className="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/50 hover:border-slate-600 transition"
                        >
                          {/* Image Preview */}
                          {isImageFile(file.file_type) && file.file_url && (
                            <div className="aspect-video bg-slate-900 relative overflow-hidden">
                              <img
                                src={file.file_url}
                                alt={file.file_name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setPreviewFile(file)}
                                  className="rounded-lg bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-white transition"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <a
                                  href={file.file_url}
                                  download={file.file_name}
                                  className="rounded-lg bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-white transition"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                          )}

                          {/* File Info */}
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800">
                                {getFileIcon(file.file_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{file.file_name}</p>
                                <p className="text-xs text-slate-500">
                                  {(file.file_size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            {file.file_url && !isImageFile(file.file_type) && (
                              <div className="mt-3 flex gap-2">
                                {isVideoFile(file.file_type) && (
                                  <button
                                    onClick={() => setPreviewFile(file)}
                                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                                  >
                                    <PlayCircle className="h-4 w-4" />
                                    Play
                                  </button>
                                )}
                                <a
                                  href={file.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  View
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-700/50 bg-slate-900/30 p-12 text-center">
                    <Paperclip className="mx-auto h-16 w-16 text-slate-600 mb-4" />
                    <p className="text-base font-medium text-slate-400 mb-1">No attachments</p>
                    <p className="text-sm text-slate-500">Customer didn&apos;t upload any files</p>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Footer - Accept/Start Session */}
          <div className="sticky bottom-0 border-t border-slate-700/50 bg-slate-900/95 px-6 py-4 backdrop-blur-sm">
            {!accepted ? (
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-slate-400">Review all tabs before accepting</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
                  >
                    Close
                  </button>
                  {onAccept && (
                    <button
                      onClick={() => onAccept(request.id)}
                      disabled={accepting}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:bg-orange-400"
                    >
                      {accepting ? (
                        'Accepting...'
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Accept Request
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Request Accepted!</p>
                    <p className="text-xs text-slate-400">Ready to start the session</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
                  >
                    Close
                  </button>
                  {onStartSession && request.sessionId && (
                    <button
                      onClick={() => onStartSession(request.sessionId!, request.sessionType)}
                      className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Start Session
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <button
            onClick={() => setPreviewFile(null)}
            className="absolute top-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="max-w-6xl w-full max-h-[90vh] overflow-auto">
            {isImageFile(previewFile.file_type) && (
              <img src={previewFile.file_url} alt={previewFile.file_name} className="w-full h-auto rounded-lg" />
            )}
            {isVideoFile(previewFile.file_type) && (
              <video src={previewFile.file_url} controls className="w-full h-auto rounded-lg" />
            )}
          </div>
        </div>
      )}
    </>
  )
}
