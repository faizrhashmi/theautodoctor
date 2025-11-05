'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Loader2, ArrowRight, FileText, AlertCircle } from 'lucide-react'
import { routeFor } from '@/lib/routes'

/**
 * Quote Payment Success Page
 * Phase 1.3: Shows confirmation after successful quote payment
 */
export default function QuotePaymentSuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const quoteId = params.quoteId as string
  const sessionId = searchParams.get('session_id')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID found')
      setLoading(false)
      return
    }

    // Verify payment processing completed
    const verifyPayment = async () => {
      try {
        // Give webhook time to process (usually instant, but add small delay for safety)
        await new Promise(resolve => setTimeout(resolve, 2000))

        // TODO: Could add API call to verify payment status if needed
        setLoading(false)
      } catch (err: any) {
        console.error('[payment-success] Error verifying payment:', err)
        setError(err.message || 'Failed to verify payment')
        setLoading(false)
      }
    }

    verifyPayment()
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-400">Processing your payment...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Payment Error</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => router.push(routeFor.quote(quoteId))}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
          >
            Back to Quote
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-8 text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            Payment Successful!
          </h1>

          <p className="text-lg text-slate-300 mb-6">
            Your payment has been processed and the quote has been approved.
          </p>

          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">What happens next?</h2>
            <div className="space-y-3 text-left text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 font-semibold text-xs">
                  1
                </div>
                <p>
                  <strong className="text-white">Payment Secured</strong>
                  <br />
                  Your payment is held in escrow until the repair is completed
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 font-semibold text-xs">
                  2
                </div>
                <p>
                  <strong className="text-white">Workshop Notified</strong>
                  <br />
                  The workshop/mechanic has been notified and will contact you to schedule the repair
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 font-semibold text-xs">
                  3
                </div>
                <p>
                  <strong className="text-white">Work Begins</strong>
                  <br />
                  Once scheduled, the repair work will begin
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 font-semibold text-xs">
                  4
                </div>
                <p>
                  <strong className="text-white">Completion & Release</strong>
                  <br />
                  After work is complete and you're satisfied, payment will be released from escrow
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 text-sm text-slate-300">
            <p>
              <strong className="text-orange-400">Money-Back Protection:</strong> Your payment is held in escrow.
              If the work isn't completed as agreed, you're protected.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push(routeFor.quote(quoteId))}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition font-medium"
          >
            <FileText className="h-5 w-5" />
            View Quote Details
          </button>

          <button
            onClick={() => router.push(routeFor.customerDashboard())}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
          >
            Go to Dashboard
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          <p>
            Need help? Contact{' '}
            <a href="mailto:support@askautodoctor.com" className="text-orange-400 hover:underline">
              support@askautodoctor.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
