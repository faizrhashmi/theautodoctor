'use client'

import { X, FileText, Paperclip, Car, AlertCircle, Calendar, User, Mail } from 'lucide-react'

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
}

type RequestDetailModalProps = {
  request: RequestDetail | null
  onClose: () => void
  onAccept?: (requestId: string) => void
  accepting?: boolean
}

export default function RequestDetailModal({ request, onClose, onAccept, accepting }: RequestDetailModalProps) {
  if (!request) return null

  const intake = request.intake
  const vehicleInfo = intake?.vehicle_year && intake?.vehicle_make && intake?.vehicle_model
    ? `${intake.vehicle_year} ${intake.vehicle_make} ${intake.vehicle_model}`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700/50 bg-slate-900/95 px-6 py-4 backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-bold text-white">Request Details</h2>
            <p className="mt-1 text-sm text-slate-400">Review customer information and attachments</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <div className="space-y-6">
            {/* Customer Info */}
            <section className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
                  <User className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Customer Information</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Name</p>
                  <p className="mt-1 text-sm font-semibold text-white">{request.customerName}</p>
                </div>
                {request.customerEmail && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <p className="text-sm text-slate-300">{request.customerEmail}</p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Session Type</p>
                  <p className="mt-1 text-sm font-semibold text-orange-400 uppercase">{request.sessionType}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Requested</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <p className="text-sm text-slate-300">{new Date(request.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Vehicle Info */}
            {intake && (vehicleInfo || intake.vin || intake.odometer || intake.plate) && (
              <section className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
                    <Car className="h-5 w-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Vehicle Information</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {vehicleInfo && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Vehicle</p>
                      <p className="mt-1 text-sm font-semibold text-white">{vehicleInfo}</p>
                    </div>
                  )}
                  {intake.vin && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">VIN</p>
                      <p className="mt-1 text-sm text-slate-300 font-mono">{intake.vin}</p>
                    </div>
                  )}
                  {intake.odometer && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Odometer</p>
                      <p className="mt-1 text-sm text-slate-300">{intake.odometer}</p>
                    </div>
                  )}
                  {intake.plate && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">License Plate</p>
                      <p className="mt-1 text-sm text-slate-300 font-mono">{intake.plate}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Customer Concern */}
            {(intake?.concern || intake?.details || request.notes) && (
              <section className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-900/20 to-orange-900/20 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-amber-100">Customer Concern</h3>
                </div>
                {intake?.concern && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-amber-300 uppercase tracking-wider">Primary Concern</p>
                    <p className="mt-2 text-sm text-amber-50 leading-relaxed">{intake.concern}</p>
                  </div>
                )}
                {intake?.details && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-amber-300 uppercase tracking-wider">Additional Details</p>
                    <p className="mt-2 text-sm text-amber-50 leading-relaxed whitespace-pre-wrap">{intake.details}</p>
                  </div>
                )}
                {request.notes && (
                  <div>
                    <p className="text-xs font-medium text-amber-300 uppercase tracking-wider">Session Notes</p>
                    <p className="mt-2 text-sm text-amber-50 leading-relaxed">{request.notes}</p>
                  </div>
                )}
              </section>
            )}

            {/* Attachments */}
            {request.files && request.files.length > 0 && (
              <section className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20">
                    <Paperclip className="h-5 w-5 text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Attachments ({request.files.length})</h3>
                </div>
                <div className="space-y-3">
                  {request.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-900/50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
                          <FileText className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{file.file_name}</p>
                          <p className="text-xs text-slate-500">
                            {(file.file_size / 1024).toFixed(1)} KB • {file.file_type}
                          </p>
                        </div>
                      </div>
                      {file.file_url && (
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-slate-700/50 bg-slate-900/95 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-end gap-3">
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
                className="inline-flex items-center rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:bg-orange-400"
              >
                {accepting ? 'Accepting...' : 'Accept Request'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
