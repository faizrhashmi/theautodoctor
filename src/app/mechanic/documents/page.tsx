'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, FileText, CheckCircle, XCircle, Clock,
  AlertTriangle, Calendar, Download, Trash2, RefreshCw
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
}

const DOCUMENT_TYPES = [
  { value: 'drivers_license', label: 'Driver\'s License' },
  { value: 'insurance', label: 'Liability Insurance' },
  { value: 'certification', label: 'Mechanic Certification' },
  { value: 'void_cheque', label: 'Void Cheque (for payouts)' },
  { value: 'other', label: 'Other Document' },
]

export default function MechanicDocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<MechanicDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)  // ✅ Auth guard
  const [isAuthenticated, setIsAuthenticated] = useState(false)  // ✅ Auth guard
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedDocType, setSelectedDocType] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [expiryDate, setExpiryDate] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)

  // ✅ Auth guard - Check mechanic authentication first
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/mechanics/me')
        if (!response.ok) {
          router.replace('/mechanic/login')
          return
        }
        setIsAuthenticated(true)
        setAuthChecking(false)
      } catch (err) {
        console.error('Auth check failed:', err)
        router.replace('/mechanic/login')
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (!isAuthenticated) return  // ✅ Wait for auth check
    fetchDocuments()
  }, [isAuthenticated])

  async function fetchDocuments() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/mechanic/documents')

      if (response.status === 401) {
        router.push('/mechanic/login')
        return
      }

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

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedFile || !selectedDocType) {
      setUploadError('Please select a document type and file')
      return
    }

    try {
      setUploading(true)
      setUploadError(null)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('document_type', selectedDocType)
      if (expiryDate) {
        formData.append('expires_at', expiryDate)
      }

      const response = await fetch('/api/mechanic/upload-document', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Success - reset form and refresh
      setShowUploadForm(false)
      setSelectedDocType('')
      setSelectedFile(null)
      setExpiryDate('')
      await fetchDocuments()
    } catch (err: any) {
      console.error('Upload error:', err)
      setUploadError(err.message || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(documentId: string) {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await fetch(`/api/mechanic/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      await fetchDocuments()
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete document')
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
            Pending Review
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

  function isExpiringSoon(expiresAt: string | null) {
    if (!expiresAt) return false
    const expiryDate = new Date(expiresAt)
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  }

  const expiredDocs = documents.filter(doc => doc.status === 'expired')
  const rejectedDocs = documents.filter(doc => doc.status === 'rejected')
  const pendingDocs = documents.filter(doc => doc.status === 'pending')
  const approvedDocs = documents.filter(doc => doc.status === 'approved')
  const expiringSoonDocs = approvedDocs.filter(doc => isExpiringSoon(doc.expires_at))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">My Documents</h1>
            <p className="mt-1 text-sm text-slate-400">Manage your uploaded documents and certifications</p>
          </div>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
        </div>

        {/* Alert Banners */}
        {expiredDocs.length > 0 && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-900/20 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-200">Expired Documents</h3>
                <p className="mt-1 text-sm text-red-300/80">
                  You have {expiredDocs.length} expired document{expiredDocs.length > 1 ? 's' : ''}. Please upload updated versions.
                </p>
              </div>
            </div>
          </div>
        )}

        {expiringSoonDocs.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-900/20 p-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 flex-shrink-0 text-amber-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-200">Documents Expiring Soon</h3>
                <p className="mt-1 text-sm text-amber-300/80">
                  You have {expiringSoonDocs.length} document{expiringSoonDocs.length > 1 ? 's' : ''} expiring within 30 days.
                </p>
              </div>
            </div>
          </div>
        )}

        {rejectedDocs.length > 0 && (
          <div className="mb-6 rounded-2xl border border-orange-500/30 bg-orange-900/20 p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 flex-shrink-0 text-orange-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-200">Rejected Documents</h3>
                <p className="mt-1 text-sm text-orange-300/80">
                  {rejectedDocs.length} document{rejectedDocs.length > 1 ? 's were' : ' was'} rejected. Please review and re-upload.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Form */}
        {showUploadForm && (
          <div className="mb-6 rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4">Upload New Document</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Document Type
                </label>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select document type</option>
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  File
                </label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">Accepted formats: PDF, JPG, PNG (Max 10MB)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {uploadError && (
                <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-300">
                  {uploadError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadForm(false)
                    setUploadError(null)
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-6 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-900/20 p-6 text-center">
            <p className="text-red-300">{error}</p>
            <button
              onClick={fetchDocuments}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Documents</p>
                <p className="mt-1 text-2xl font-bold text-white">{documents.length}</p>
              </div>
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-green-700/50 bg-green-900/20 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-300">Approved</p>
                <p className="mt-1 text-2xl font-bold text-green-400">{approvedDocs.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-700/50 bg-amber-900/20 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-300">Pending</p>
                <p className="mt-1 text-2xl font-bold text-amber-400">{pendingDocs.length}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-red-700/50 bg-red-900/20 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-300">Issues</p>
                <p className="mt-1 text-2xl font-bold text-red-400">{expiredDocs.length + rejectedDocs.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white mb-4">All Documents</h2>

          {documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/30 p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-600" />
              <p className="mt-4 text-slate-400">No documents uploaded yet</p>
              <p className="mt-2 text-sm text-slate-500">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-slate-400" />
                        <h3 className="font-semibold text-white">
                          {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                        </h3>
                        {getStatusBadge(doc.status)}
                      </div>

                      <p className="mt-1 text-sm text-slate-400">{doc.file_name}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span>Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                        {doc.expires_at && (
                          <span className={isExpiringSoon(doc.expires_at) ? 'text-amber-400' : ''}>
                            Expires {new Date(doc.expires_at).toLocaleDateString()}
                          </span>
                        )}
                        {doc.reviewed_at && (
                          <span>Reviewed {new Date(doc.reviewed_at).toLocaleDateString()}</span>
                        )}
                      </div>

                      {doc.rejection_reason && (
                        <div className="mt-2 rounded-lg border border-red-500/30 bg-red-900/20 p-2 text-sm text-red-300">
                          <strong>Rejection reason:</strong> {doc.rejection_reason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
                      >
                        <Download className="h-4 w-4" />
                        View
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-900/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back to Dashboard */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/mechanic/dashboard')}
            className="text-sm text-slate-400 hover:text-slate-300 transition"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
