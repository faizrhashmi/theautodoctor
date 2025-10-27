'use client'

import { useState, useEffect } from 'react'
import {
  FileText, CheckCircle, XCircle, Clock, AlertTriangle,
  Download, Search, Filter, RefreshCw, Eye, Calendar
} from 'lucide-react'

type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired'

type MechanicDocument = {
  id: string
  mechanic_id: string
  document_type: string
  file_url: string
  file_name: string
  uploaded_at: string
  expires_at: string | null
  status: DocumentStatus
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  mechanic?: {
    name: string
    email: string
  }
}

const DOCUMENT_TYPES = [
  { value: 'drivers_license', label: 'Driver\'s License' },
  { value: 'insurance', label: 'Liability Insurance' },
  { value: 'certification', label: 'Mechanic Certification' },
  { value: 'void_cheque', label: 'Void Cheque' },
  { value: 'other', label: 'Other Document' },
]

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<MechanicDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<MechanicDocument | null>(null)

  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
  const [rejectionReason, setRejectionReason] = useState('')
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/mechanic-documents')

      if (!response.ok) {
        throw new Error('Failed to load documents')
      }

      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (err) {
      console.error('Error loading documents:', err)
      setError('Failed to load documents. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReview() {
    if (!selectedDoc) return

    if (reviewAction === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    try {
      setReviewing(true)

      const response = await fetch(`/api/admin/mechanic-documents/${selectedDoc.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewAction === 'approve' ? 'approved' : 'rejected',
          rejection_reason: reviewAction === 'reject' ? rejectionReason : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to review document')
      }

      // Success - close modal and refresh
      setShowReviewModal(false)
      setSelectedDoc(null)
      setRejectionReason('')
      await fetchDocuments()
    } catch (err) {
      console.error('Review error:', err)
      alert('Failed to review document')
    } finally {
      setReviewing(false)
    }
  }

  function getStatusBadge(status: DocumentStatus) {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-400">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        )
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-400">
            <AlertTriangle className="h-3 w-3" />
            Expired
          </span>
        )
    }
  }

  const filteredDocuments = documents.filter(doc => {
    if (statusFilter !== 'all' && doc.status !== statusFilter) return false
    if (searchQuery && !doc.mechanic?.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !doc.mechanic?.email.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const pendingCount = documents.filter(d => d.status === 'pending').length
  const approvedCount = documents.filter(d => d.status === 'approved').length
  const rejectedCount = documents.filter(d => d.status === 'rejected').length
  const expiredCount = documents.filter(d => d.status === 'expired').length

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Mechanic Documents</h1>
        <p className="mt-2 text-slate-400">Review and manage mechanic document submissions</p>
      </div>

      {/* Alert for pending reviews */}
      {pendingCount > 0 && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900">Pending Reviews</h3>
              <p className="mt-1 text-sm text-amber-700">
                {pendingCount} document{pendingCount > 1 ? 's' : ''} waiting for review
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Documents</p>
              <p className="mt-1 text-2xl font-bold text-white">{documents.length}</p>
            </div>
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700">Pending</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{pendingCount}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Approved</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Issues</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{rejectedCount + expiredCount}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by mechanic name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>

        <button
          onClick={fetchDocuments}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Documents Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-sm overflow-hidden">
        {filteredDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-500">No documents found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Mechanic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Document Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{doc.mechanic?.name || 'Unknown'}</p>
                        <p className="text-sm text-slate-500">{doc.mechanic?.email || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-white">
                          {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {doc.expires_at ? new Date(doc.expires_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-3 py-1.5 text-sm font-semibold text-slate-200 transition hover:bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
                        >
                          <Download className="h-3.5 w-3.5" />
                          View
                        </a>
                        {doc.status === 'pending' && (
                          <button
                            onClick={() => {
                              setSelectedDoc(doc)
                              setShowReviewModal(true)
                              setReviewAction('approve')
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/25 px-3 py-1.5 text-sm font-semibold text-white transition hover:from-orange-600 hover:to-red-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-800/50 backdrop-blur-sm p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Review Document</h2>

            <div className="mb-6 space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-400">Mechanic</p>
                <p className="text-lg text-white">{selectedDoc.mechanic?.name}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-400">Document Type</p>
                <p className="text-lg text-white">
                  {DOCUMENT_TYPES.find(t => t.value === selectedDoc.document_type)?.label}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-400">File Name</p>
                <p className="text-sm text-slate-200">{selectedDoc.file_name}</p>
              </div>

              {selectedDoc.expires_at && (
                <div>
                  <p className="text-sm font-medium text-slate-400">Expiry Date</p>
                  <p className="text-sm text-slate-200">
                    {new Date(selectedDoc.expires_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <a
                  href={selectedDoc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Download className="h-4 w-4" />
                  Open Document in New Tab
                </a>
              </div>
            </div>

            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Review Decision
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setReviewAction('approve')}
                    className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition ${
                      reviewAction === 'approve'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-green-500'
                    }`}
                  >
                    <CheckCircle className="mx-auto h-5 w-5 mb-1" />
                    Approve
                  </button>
                  <button
                    onClick={() => setReviewAction('reject')}
                    className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition ${
                      reviewAction === 'reject'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-red-500'
                    }`}
                  >
                    <XCircle className="mx-auto h-5 w-5 mb-1" />
                    Reject
                  </button>
                </div>
              </div>

              {reviewAction === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this document is being rejected..."
                    rows={3}
                    className="w-full rounded-lg border border-slate-700 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(false)
                  setSelectedDoc(null)
                  setRejectionReason('')
                }}
                disabled={reviewing}
                className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-6 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={reviewing}
                className={`rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${
                  reviewAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {reviewing ? (
                  <>
                    <RefreshCw className="inline h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>Confirm {reviewAction === 'approve' ? 'Approval' : 'Rejection'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
