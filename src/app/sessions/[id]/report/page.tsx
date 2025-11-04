'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  Calendar,
  User,
  Clock,
  DollarSign,
  Loader2,
  Image as ImageIcon
} from 'lucide-react'
import type { SessionSummary, IdentifiedIssue } from '@/types/sessionSummary'
import { downloadSessionPdf } from '@/lib/reports/sessionReport'

interface SessionDetails {
  id: string
  type: 'chat' | 'video'
  started_at: string | null
  ended_at: string | null
  duration_minutes: number | null
  plan: string
  base_price: number | null
  customer_name?: string
  mechanic_name?: string
  mechanic_notes?: string
}

export default function SessionReportPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const [session, setSession] = useState<SessionDetails | null>(null)
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch session details
        const sessionRes = await fetch(`/api/sessions/${sessionId}`)
        if (!sessionRes.ok) {
          throw new Error('Failed to fetch session details')
        }
        const sessionData = await sessionRes.json()
        setSession(sessionData)

        // Fetch summary
        const summaryRes = await fetch(`/api/sessions/${sessionId}/summary`)
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json()
          if (summaryData.auto_summary) {
            setSummary(summaryData.auto_summary)
          }
        }
      } catch (err: any) {
        console.error('[SessionReport] Error fetching data:', err)
        setError(err.message || 'Failed to load session report')
      } finally {
        setLoading(false)
      }
    }

    if (sessionId) {
      fetchData()
    }
  }, [sessionId])

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true)
    try {
      await downloadSessionPdf(sessionId)
    } catch (error) {
      console.error('[SessionReport] PDF download error:', error)
    } finally {
      setDownloadingPDF(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'urgent':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Intl.DateTimeFormat('en-CA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateString))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading session report...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Error Loading Report</h1>
          <p className="text-slate-400 mb-6">{error || 'Session not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-8 w-8 text-orange-500" />
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Session Report
                </h1>
              </div>
              <p className="text-sm text-slate-400">
                {session.type.charAt(0).toUpperCase() + session.type.slice(1)} Session • {formatDateTime(session.ended_at)}
              </p>
            </div>

            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadingPDF ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Session Details Card */}
        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Session Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Mechanic</p>
                <p className="text-sm font-medium text-white">{session.mechanic_name || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Customer</p>
                <p className="text-sm font-medium text-white">{session.customer_name || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Started</p>
                <p className="text-sm font-medium text-white">{formatDateTime(session.started_at)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Duration</p>
                <p className="text-sm font-medium text-white">{session.duration_minutes || 0} minutes</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Plan</p>
                <p className="text-sm font-medium text-white">{session.plan}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Cost</p>
                <p className="text-sm font-medium text-green-400">
                  ${session.base_price ? (session.base_price / 100).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        {summary && (
          <>
            {/* Customer Report */}
            {summary.customer_report && (
              <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-400" />
                  What We Found
                </h2>
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-slate-300 whitespace-pre-wrap">{summary.customer_report}</p>
                </div>
              </div>
            )}

            {/* Identified Issues */}
            {summary.identified_issues && summary.identified_issues.length > 0 && (
              <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-400" />
                  Issues Identified ({summary.identified_issues.length})
                </h2>

                <div className="space-y-3">
                  {summary.identified_issues.map((issue: IdentifiedIssue, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-700 bg-slate-900/50 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base font-semibold text-white">{issue.issue}</h3>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase ${getSeverityColor(issue.severity)}`}>
                              {issue.severity}
                            </span>
                          </div>

                          {issue.description && (
                            <p className="text-sm text-slate-400 mb-2">{issue.description}</p>
                          )}

                          {issue.est_cost_range && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-400" />
                              <p className="text-sm font-medium text-green-400">
                                Estimated Cost: {issue.est_cost_range}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media Files */}
            {summary.media_files && summary.media_files.length > 0 && (
              <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-slate-400" />
                  Attached Media ({summary.media_files.length})
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {summary.media_files.map((file: any, idx: number) => (
                    <div
                      key={idx}
                      className="relative aspect-video rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden group cursor-pointer"
                      onClick={() => {
                        if (file.url || file.file_url) {
                          window.open(file.url || file.file_url, '_blank')
                        }
                      }}
                    >
                      {file.file_type?.startsWith('image/') ? (
                        <img
                          src={file.url || file.file_url}
                          alt={file.file_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <FileText className="h-8 w-8 text-slate-500" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-2">
                        <p className="text-xs text-white text-center line-clamp-3">
                          {file.file_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Mechanic Notes (if available) */}
        {session.mechanic_notes && (
          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Mechanic Notes</h2>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{session.mechanic_notes}</p>
          </div>
        )}

        {/* Next Steps */}
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Next Steps</h2>
          <div className="space-y-2 text-sm text-slate-300">
            <p>• Review the identified issues above</p>
            <p>• Download this report for your records</p>
            <p>• Request quotes from local workshops to address the issues</p>
            <p>• Keep this report handy when speaking with mechanics</p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <button
              onClick={() => {
                const params = new URLSearchParams()
                params.set('session_id', sessionId)
                if (summary?.identified_issues && summary.identified_issues.length > 0) {
                  params.set('prefill', 'true')
                }
                router.push(`/customer/rfq/create?${params.toString()}`)
              }}
              className="w-full sm:w-auto px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition font-medium"
            >
              Request Workshop Quotes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
