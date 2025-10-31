'use client'

import { useState, useEffect } from 'react'

interface RequestPreview {
  id: string
  createdAt: string
  updatedAt: string
  status: string
  sessionType: string
  planCode: string
  urgent: boolean
  customer: {
    id: string
    name: string
    email: string
    phone: string
    city: string
  }
  vehicle: {
    id: string | null
    make: string
    model: string
    year: string
    vin: string
    mileage: string
    plate: string
    nickname: string | null
  }
  concern: string
  notes: string
  attachments: Array<{
    name: string
    url: string
    size: number
  }>
}

interface RequestPreviewModalProps {
  requestId: string | null
  isOpen: boolean
  onClose: () => void
}

export function RequestPreviewModal({ requestId, isOpen, onClose }: RequestPreviewModalProps) {
  const [preview, setPreview] = useState<RequestPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch preview when modal opens - FIXED: Use mechanic auth
  useEffect(() => {
    if (!isOpen || !requestId) {
      setPreview(null)
      setError(null)
      return
    }

    const fetchPreview = async () => {
      setLoading(true)
      setError(null)

      try {
        // FIX: Use the mechanics API endpoint instead of session-requests
        const response = await fetch(`/api/mechanics/requests/${requestId}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to load preview')
        }

        const data = await response.json()
        
        // Transform the API response to match the preview interface
        if (data.request) {
          const request = data.request;
          setPreview({
            id: request.id,
            createdAt: request.created_at,
            updatedAt: request.updated_at || request.created_at,
            status: request.status,
            sessionType: request.session_type,
            planCode: request.plan_code,
            urgent: request.urgent || false,
            customer: {
              id: request.customer?.id || 'unknown',
              name: request.customer_name || `${request.customer?.first_name} ${request.customer?.last_name}`.trim() || 'Customer',
              email: request.customer_email || request.customer?.email || '',
              phone: request.customer?.phone || '',
              city: request.intake?.city || ''
            },
            vehicle: {
              id: request.vehicle_id,
              make: request.intake?.make || request.vehicle?.make || '',
              model: request.intake?.model || request.vehicle?.model || '',
              year: request.intake?.year || request.vehicle?.year || '',
              vin: request.intake?.vin || request.vehicle?.vin || '',
              mileage: request.intake?.odometer || '',
              plate: request.intake?.plate || request.vehicle?.plate || '',
              nickname: request.intake?.vehicle_nickname || null
            },
            concern: request.intake?.concern || '',
            notes: request.intake?.notes || '',
            attachments: request.files?.map((file: any) => ({
              name: file.file_name,
              url: file.file_url,
              size: file.file_size || 0
            })) || []
          })
        } else {
          throw new Error('No request data received')
        }
      } catch (err: any) {
        console.error('[RequestPreviewModal] Error fetching preview:', err)
        setError(err.message || 'Failed to load request details')
      } finally {
        setLoading(false)
      }
    }

    fetchPreview()
  }, [requestId, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl mx-4 my-8 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Session Request Preview</h2>
            <p className="text-sm text-slate-400 mt-1">Read-only view before accepting</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent" />
              <p className="mt-4 text-slate-400">Loading request details...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-400/50 bg-red-500/10 p-4 text-center">
              <p className="text-red-300">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-600/30 transition"
              >
                Retry
              </button>
            </div>
          )}

          {preview && (
            <div className="space-y-6">
              {/* Urgent Banner */}
              {preview.urgent && (
                <div className="rounded-xl border-2 border-red-500/50 bg-red-600/20 p-4">
                  <div className="flex items-center gap-3">
                    <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-red-200">URGENT REQUEST</p>
                      <p className="text-xs text-red-300">Customer needs immediate assistance</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-700 bg-slate-800/30 p-4">
                <div>
                  <p className="text-xs text-slate-500">Session Type</p>
                  <p className="text-white font-semibold capitalize">{preview.sessionType}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Plan</p>
                  <p className="text-white font-semibold uppercase">{preview.planCode}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-semibold uppercase">
                    {preview.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Created</p>
                  <p className="text-white font-semibold">
                    {new Date(preview.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Name</p>
                    <p className="text-white">{preview.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-white">{preview.customer.email}</p>
                  </div>
                  {preview.customer.phone && (
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="text-white">{preview.customer.phone}</p>
                    </div>
                  )}
                  {preview.customer.city && (
                    <div>
                      <p className="text-xs text-slate-500">Location</p>
                      <p className="text-white">{preview.customer.city}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Vehicle Information</h3>
                {preview.vehicle.make || preview.vehicle.model || preview.vehicle.year ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Vehicle</p>
                      <p className="text-white font-semibold">
                        {preview.vehicle.year} {preview.vehicle.make} {preview.vehicle.model}
                        {preview.vehicle.nickname && ` "${preview.vehicle.nickname}"`}
                      </p>
                    </div>
                    {preview.vehicle.vin && (
                      <div>
                        <p className="text-xs text-slate-500">VIN</p>
                        <p className="text-white font-mono text-sm">{preview.vehicle.vin}</p>
                      </div>
                    )}
                    {preview.vehicle.mileage && (
                      <div>
                        <p className="text-xs text-slate-500">Mileage</p>
                        <p className="text-white">{preview.vehicle.mileage}</p>
                      </div>
                    )}
                    {preview.vehicle.plate && (
                      <div>
                        <p className="text-xs text-slate-500">License Plate</p>
                        <p className="text-white font-mono">{preview.vehicle.plate}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">
                    Vehicle information will be provided during the session
                  </p>
                )}
              </div>

              {/* Issue Description */}
              {(preview.concern || preview.notes) && (
                <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Issue Description</h3>
                  <p className="text-slate-300 whitespace-pre-wrap">{preview.concern || preview.notes}</p>
                </div>
              )}

              {/* Attachments */}
              {preview.attachments && preview.attachments.length > 0 && (
                <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Attachments ({preview.attachments.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {preview.attachments.map((attachment, idx) => (
                      <a
                        key={idx}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border border-slate-600 bg-slate-800/50 p-3 hover:bg-slate-700/50 transition"
                      >
                        <svg className="h-8 w-8 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{attachment.name}</p>
                          <p className="text-xs text-slate-500">
                            {(attachment.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <svg className="h-5 w-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full border border-slate-600 bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}