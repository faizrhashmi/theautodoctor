'use client'

import { useState, useEffect } from 'react'
import { X, Star, Download, LayoutDashboard, FileText, CheckCircle, Loader2, MessageSquare, Wrench, Calendar, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { PRICING, type PlanKey } from '@/config/pricing'
import { downloadSessionPdf } from '@/lib/reports/sessionReport'
import type { SessionSummary, IdentifiedIssue } from '@/types/sessionSummary'
import { routeFor, apiRouteFor } from '@/lib/routes'

interface SessionData {
  id: string
  customer_user_id: string | null
  mechanic_id: string | null
  customer_name?: string
  mechanic_name?: string
  started_at: string | null
  ended_at: string | null
  duration_minutes: number | null
  plan: string
  base_price?: number
  rating: number | null
}

interface SessionCompletionModalProps {
  isOpen: boolean
  sessionData: SessionData
  onClose: () => void
  onDownloadPDF?: () => void
  onViewDashboard: () => void
  onViewDetails?: () => void
  userRole?: 'customer' | 'mechanic' // Role-based customization
}

export function SessionCompletionModal({
  isOpen,
  sessionData,
  onClose,
  onDownloadPDF,
  onViewDashboard,
  onViewDetails,
  userRole = 'customer', // Default to customer for backward compatibility
}: SessionCompletionModalProps) {
  const isMechanic = userRole === 'mechanic'
  const [rating, setRating] = useState<number>(sessionData.rating || 0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [ratingSubmitted, setRatingSubmitted] = useState(!!sessionData.rating)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)

  // Calculate duration
  const duration = sessionData.duration_minutes ||
    (sessionData.started_at && sessionData.ended_at
      ? Math.round((new Date(sessionData.ended_at).getTime() - new Date(sessionData.started_at).getTime()) / 60000)
      : 0)

  // Get pricing info (with fallback for safety)
  const planKey = sessionData.plan as PlanKey
  const pricingInfo = PRICING[planKey] || null
  const displayPrice = sessionData.base_price
    ? (sessionData.base_price / 100).toFixed(2)
    : pricingInfo
      ? (pricingInfo.priceCents / 100).toFixed(2)
      : '0.00'

  const planName = pricingInfo?.name || sessionData.plan

  // Calculate mechanic earnings (70% split)
  const MECHANIC_SHARE = 0.70
  const totalCents = sessionData.base_price || pricingInfo?.priceCents || 0
  const mechanicEarnings = isMechanic ? (totalCents * MECHANIC_SHARE / 100).toFixed(2) : null

  // Handle rating submission
  const handleRatingClick = async (starValue: number) => {
    if (ratingSubmitted || submittingRating) return

    setRating(starValue)
    setSubmittingRating(true)

    try {
      const response = await fetch(`/api/customer/sessions/${sessionData.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: starValue }),
      })

      if (response.ok) {
        setRatingSubmitted(true)
      } else {
        console.error('Failed to submit rating')
        setRating(sessionData.rating || 0)
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
      setRating(sessionData.rating || 0)
    } finally {
      setSubmittingRating(false)
    }
  }

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (downloadingPDF) return

    setDownloadingPDF(true)
    setPdfError(null)

    try {
      await downloadSessionPdf(sessionData.id)
    } catch (error) {
      console.error('[SessionCompletionModal] PDF download error:', error)
      setPdfError('Failed to generate PDF. Please try again.')
      // Clear error after 5 seconds
      setTimeout(() => setPdfError(null), 5000)
    } finally {
      setDownloadingPDF(false)
    }
  }

  // Fetch summary on mount
  useEffect(() => {
    if (!isOpen || !sessionData.id) return

    const fetchSummary = async () => {
      setLoadingSummary(true)
      try {
        const response = await fetch(apiRouteFor.sessionSummary(sessionData.id))
        if (response.ok) {
          const data = await response.json()
          if (data.auto_summary) {
            setSummary(data.auto_summary)
          }
        }
      } catch (error) {
        console.error('[SessionCompletionModal] Failed to fetch summary:', error)
      } finally {
        setLoadingSummary(false)
      }
    }

    fetchSummary()
  }, [isOpen, sessionData.id])

  // Format date/time (en-CA)
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-CA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }

  // Get severity badge color
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

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-3 sm:p-4">
        <div className="relative w-full max-w-[95vw] sm:max-w-lg max-h-[95vh] overflow-y-auto rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-4 sm:p-6 shadow-2xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Success Icon */}
          <div className="mb-3 sm:mb-4 flex justify-center">
            <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-400" />
            </div>
          </div>

          {/* Header - Role-specific */}
          <div className="mb-4 sm:mb-6 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {isMechanic ? 'Session Complete' : 'Session Completed!'}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              {isMechanic
                ? `Great work! You've earned $${mechanicEarnings}`
                : 'Thank you for using AskAutoDoctor'
              }
            </p>
          </div>

          {/* Session Details */}
          <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3 rounded-xl border border-slate-700 bg-slate-800/50 p-3 sm:p-4">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-400">Session ID:</span>
              <span className="font-mono text-slate-200">{sessionData.id.slice(0, 8)}</span>
            </div>

            {isMechanic ? (
              <>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-400">Customer:</span>
                  <span className="text-slate-200 text-right">
                    {sessionData.customer_name || 'Customer'}{' '}
                    <span className="text-[10px] sm:text-xs text-slate-500">
                      (#{sessionData.customer_user_id?.slice(0, 6)})
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-400">Mechanic:</span>
                  <span className="text-slate-200 text-right">
                    You{' '}
                    <span className="text-[10px] sm:text-xs text-slate-500">
                      (#{sessionData.mechanic_id?.slice(0, 6)})
                    </span>
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-400">Mechanic:</span>
                  <span className="text-slate-200 text-right">
                    {sessionData.mechanic_name || 'Mechanic'}{' '}
                    <span className="text-[10px] sm:text-xs text-slate-500">
                      (#{sessionData.mechanic_id?.slice(0, 6)})
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-400">Customer:</span>
                  <span className="text-slate-200 text-right">
                    You{' '}
                    <span className="text-[10px] sm:text-xs text-slate-500">
                      (#{sessionData.customer_user_id?.slice(0, 6)})
                    </span>
                  </span>
                </div>
              </>
            )}

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-400">Plan:</span>
              <span className="text-slate-200 text-right">{planName}</span>
            </div>

            {sessionData.started_at && (
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-400">Started:</span>
                <span className="text-slate-200 text-right">{formatDateTime(sessionData.started_at)}</span>
              </div>
            )}

            {sessionData.ended_at && (
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-400">Ended:</span>
                <span className="text-slate-200 text-right">{formatDateTime(sessionData.ended_at)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-400">Duration:</span>
              <span className="text-slate-200">{duration} minutes</span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-700 pt-2 sm:pt-3 text-xs sm:text-sm">
              <span className="font-semibold text-slate-300">{isMechanic ? 'Your Earnings:' : 'Total Cost:'}</span>
              <span className="text-base sm:text-lg font-bold text-green-400">
                ${isMechanic ? mechanicEarnings : displayPrice}
              </span>
            </div>
          </div>

          {/* Rating Section - Only for customers */}
          {!isMechanic && !ratingSubmitted && (
            <div className="mb-4 sm:mb-6 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 sm:p-4">
              <p className="mb-2 sm:mb-3 text-center text-xs sm:text-sm font-medium text-white">
                How was your experience?
              </p>
              <div className="flex justify-center gap-1 sm:gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={submittingRating}
                    className="transition-transform hover:scale-110 disabled:opacity-50"
                  >
                    <Star
                      className={`h-6 w-6 sm:h-8 sm:w-8 ${
                        star <= (hoverRating || rating)
                          ? 'fill-orange-400 text-orange-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {submittingRating && (
                <div className="mt-2 flex justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                </div>
              )}
            </div>
          )}

          {!isMechanic && ratingSubmitted && (
            <div className="mb-4 sm:mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-2 sm:p-3">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                <p className="text-xs sm:text-sm font-medium text-green-400">
                  Thank you for your feedback!
                </p>
              </div>
            </div>
          )}

          {/* Summary Section - What We Found */}
          {!loadingSummary && summary && (summary.customer_report || (summary.identified_issues && summary.identified_issues.length > 0)) && (
            <div className="mb-4 sm:mb-6 rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                <h3 className="text-sm sm:text-base font-semibold text-white">
                  What We Found
                </h3>
              </div>

              {/* Customer Report */}
              {summary.customer_report && (
                <div className="mb-3 rounded-lg bg-slate-800/50 p-2 sm:p-3">
                  <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap">
                    {summary.customer_report}
                  </p>
                </div>
              )}

              {/* Identified Issues */}
              {summary.identified_issues && summary.identified_issues.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-400">
                    Issues Identified ({summary.identified_issues.length}):
                  </p>
                  <div className="space-y-2">
                    {summary.identified_issues.map((issue: IdentifiedIssue, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-800/30 p-2 sm:p-3"
                      >
                        <AlertCircle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="text-xs sm:text-sm font-medium text-white">
                              {issue.issue}
                            </p>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${getSeverityColor(issue.severity)}`}>
                              {issue.severity}
                            </span>
                          </div>
                          {issue.description && (
                            <p className="text-xs text-slate-400 mb-1">
                              {issue.description}
                            </p>
                          )}
                          {issue.est_cost_range && (
                            <p className="text-xs text-green-400 font-medium">
                              Est. Cost: {issue.est_cost_range}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Media Files */}
              {summary.media_files && summary.media_files.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-slate-400">
                    Attached Media ({summary.media_files.length}):
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {summary.media_files.slice(0, 6).map((file: any, idx: number) => (
                      <div
                        key={idx}
                        className="relative aspect-video rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden group"
                      >
                        {file.file_type?.startsWith('image/') ? (
                          <img
                            src={file.url || file.file_url}
                            alt={file.file_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <ImageIcon className="h-6 w-6 text-slate-500" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <p className="text-xs text-white text-center px-2 truncate">
                            {file.file_name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {summary.media_files.length > 6 && (
                    <p className="text-xs text-slate-500 text-center">
                      +{summary.media_files.length - 6} more in full report
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 sm:space-y-3">
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white transition hover:from-orange-600 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloadingPDF ? (
                <>
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  <span className="hidden sm:inline">Generating PDF...</span>
                  <span className="sm:hidden">Generating...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">Download Session Report (PDF)</span>
                  <span className="sm:hidden">Download Report</span>
                </>
              )}
            </button>

            {pdfError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 sm:p-3">
                <p className="text-center text-[10px] sm:text-xs text-red-400">{pdfError}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                onClick={onViewDashboard}
                className="flex items-center justify-center gap-1 sm:gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-indigo-400 transition hover:border-indigo-500/50 hover:bg-indigo-500/20"
              >
                <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Dashboard
              </button>

              {onViewDetails && (
                <button
                  onClick={onViewDetails}
                  className="flex items-center justify-center gap-1 sm:gap-2 rounded-lg border border-slate-600 bg-slate-800 px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Full Details
                </button>
              )}
            </div>
          </div>

          {/* What's Next Section - Role-specific */}
          <div className="mt-4 sm:mt-6 rounded-xl border border-slate-700 bg-slate-800/30 p-3 sm:p-4">
            <h3 className="mb-2 sm:mb-3 text-center text-xs sm:text-sm font-semibold text-white">
              What's Next?
            </h3>

            {isMechanic ? (
              /* Mechanic Actions */
              <div className="space-y-2">
                {/* View All Sessions */}
                <button
                  onClick={() => {
                    window.location.href = routeFor.mechanicSessions()
                  }}
                  className="flex w-full items-center gap-2 sm:gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition hover:border-blue-500/50 hover:bg-blue-500/20"
                >
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-xs sm:text-sm">View All Sessions</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 truncate">See your session history and earnings</p>
                  </div>
                </button>

                {/* Return to Dashboard */}
                <button
                  onClick={onViewDashboard}
                  className="flex w-full items-center gap-2 sm:gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition hover:border-green-500/50 hover:bg-green-500/20"
                >
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20">
                    <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-xs sm:text-sm">Back to Dashboard</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 truncate">Ready for your next customer</p>
                  </div>
                </button>
              </div>
            ) : (
              /* Customer Actions */
              <div className="space-y-2">
                {/* Ask Follow-up Question */}
                <button
                  onClick={() => {
                    window.location.href = `${routeFor.customerSessions()}?action=follow-up&sessionId=${sessionData.id}`
                  }}
                  className="flex w-full items-center gap-2 sm:gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition hover:border-blue-500/50 hover:bg-blue-500/20"
                >
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                    <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-xs sm:text-sm">Ask Follow-up Question</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 truncate">Get clarification or additional help</p>
                  </div>
                </button>

                {/* Get Workshop Quotes */}
                <button
                  onClick={() => {
                    // Prefill RFQ with summary data if available
                    window.location.href = routeFor.rfqCreate({
                      session_id: sessionData.id,
                      prefill: !!(summary?.identified_issues && summary.identified_issues.length > 0)
                    })
                  }}
                  className="flex w-full items-center gap-2 sm:gap-3 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition hover:border-purple-500/50 hover:bg-purple-500/20"
                >
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                    <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-xs sm:text-sm">
                      Request Workshop Quotes
                      {summary?.identified_issues && summary.identified_issues.length > 0 && (
                        <span className="ml-1 text-[10px] text-purple-300">(Pre-filled)</span>
                      )}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-400 truncate">Get competitive bids from local shops</p>
                  </div>
                </button>

                {/* Book Another Session */}
                {sessionData.mechanic_id && (
                  <button
                    onClick={() => {
                      window.location.href = routeFor.book({ mechanic: sessionData.mechanic_id! })
                    }}
                    className="flex w-full items-center gap-2 sm:gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition hover:border-green-500/50 hover:bg-green-500/20"
                  >
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-xs sm:text-sm">Book with Same Mechanic</p>
                      <p className="text-[10px] sm:text-xs text-slate-400 truncate">Schedule another session with {sessionData.mechanic_name || 'this mechanic'}</p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer Note */}
          <p className="mt-3 sm:mt-4 text-center text-[10px] sm:text-xs text-slate-500">
            You'll receive an email with session details and next steps
          </p>
        </div>
      </div>
    </>
  )
}
