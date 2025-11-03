'use client'

import { useState, useEffect } from 'react'
import { X, Star, Download, LayoutDashboard, FileText, CheckCircle, Loader2, MessageSquare, Wrench, Calendar } from 'lucide-react'
import { PRICING, type PlanKey } from '@/config/pricing'
import { downloadSessionPdf } from '@/lib/reports/sessionReport'

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
}

export function SessionCompletionModal({
  isOpen,
  sessionData,
  onClose,
  onDownloadPDF,
  onViewDashboard,
  onViewDetails,
}: SessionCompletionModalProps) {
  const [rating, setRating] = useState<number>(sessionData.rating || 0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [ratingSubmitted, setRatingSubmitted] = useState(!!sessionData.rating)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

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

  // Format date/time (en-CA)
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-CA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
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
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Success Icon */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
          </div>

          {/* Header */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-white">Session Completed!</h2>
            <p className="mt-1 text-sm text-slate-400">
              Thank you for using TheAutoDoctor
            </p>
          </div>

          {/* Session Details */}
          <div className="mb-6 space-y-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Session ID:</span>
              <span className="font-mono text-slate-200">{sessionData.id.slice(0, 8)}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Mechanic:</span>
              <span className="text-slate-200">
                {sessionData.mechanic_name || 'Mechanic'}{' '}
                <span className="text-xs text-slate-500">
                  (#{sessionData.mechanic_id?.slice(0, 6)})
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Customer:</span>
              <span className="text-slate-200">
                You{' '}
                <span className="text-xs text-slate-500">
                  (#{sessionData.customer_user_id?.slice(0, 6)})
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Plan:</span>
              <span className="text-slate-200">{planName}</span>
            </div>

            {sessionData.started_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Started:</span>
                <span className="text-slate-200">{formatDateTime(sessionData.started_at)}</span>
              </div>
            )}

            {sessionData.ended_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Ended:</span>
                <span className="text-slate-200">{formatDateTime(sessionData.ended_at)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Duration:</span>
              <span className="text-slate-200">{duration} minutes</span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-700 pt-3 text-sm">
              <span className="font-semibold text-slate-300">Total Cost:</span>
              <span className="text-lg font-bold text-green-400">${displayPrice}</span>
            </div>
          </div>

          {/* Rating Section */}
          {!ratingSubmitted && (
            <div className="mb-6 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
              <p className="mb-3 text-center text-sm font-medium text-white">
                How was your experience?
              </p>
              <div className="flex justify-center gap-2">
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
                      className={`h-8 w-8 ${
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

          {ratingSubmitted && (
            <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 p-3">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <p className="text-sm font-medium text-green-400">
                  Thank you for your feedback!
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-orange-600 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloadingPDF ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Download Session Report (PDF)
                </>
              )}
            </button>

            {pdfError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-center text-xs text-red-400">{pdfError}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onViewDashboard}
                className="flex items-center justify-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-400 transition hover:border-indigo-500/50 hover:bg-indigo-500/20"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </button>

              {onViewDetails && (
                <button
                  onClick={onViewDetails}
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  <FileText className="h-4 w-4" />
                  Full Details
                </button>
              )}
            </div>
          </div>

          {/* What's Next Section */}
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800/30 p-4">
            <h3 className="mb-3 text-center text-sm font-semibold text-white">
              What's Next?
            </h3>

            <div className="space-y-2">
              {/* Ask Follow-up Question */}
              <button
                onClick={() => {
                  window.location.href = `/customer/sessions?action=follow-up&sessionId=${sessionData.id}`
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-left text-sm transition hover:border-blue-500/50 hover:bg-blue-500/20"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Ask Follow-up Question</p>
                  <p className="text-xs text-slate-400">Get clarification or additional help</p>
                </div>
              </button>

              {/* Get Workshop Quotes */}
              <button
                onClick={() => {
                  window.location.href = '/customer/quotes'
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-left text-sm transition hover:border-purple-500/50 hover:bg-purple-500/20"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                  <Wrench className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Get Workshop Quotes</p>
                  <p className="text-xs text-slate-400">Find local shops to fix your vehicle</p>
                </div>
              </button>

              {/* Book Another Session */}
              {sessionData.mechanic_id && (
                <button
                  onClick={() => {
                    window.location.href = `/book?mechanic=${sessionData.mechanic_id}`
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-left text-sm transition hover:border-green-500/50 hover:bg-green-500/20"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500/20">
                    <Calendar className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Book with Same Mechanic</p>
                    <p className="text-xs text-slate-400">Schedule another session with {sessionData.mechanic_name || 'this mechanic'}</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Footer Note */}
          <p className="mt-4 text-center text-xs text-slate-500">
            You'll receive an email with session details and next steps
          </p>
        </div>
      </div>
    </>
  )
}
