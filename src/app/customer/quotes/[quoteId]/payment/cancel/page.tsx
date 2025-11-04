'use client'

import { useParams, useRouter } from 'next/navigation'
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { routeFor, apiRouteFor } from '@/lib/routes'
import { useState } from 'react'

/**
 * Quote Payment Cancel Page
 * Phase 1.3: Shows when customer cancels payment at Stripe checkout
 */
export default function QuotePaymentCancelPage() {
  const params = useParams()
  const router = useRouter()
  const quoteId = params.quoteId as string
  const [retrying, setRetrying] = useState(false)

  const handleRetryPayment = async () => {
    setRetrying(true)

    try {
      // Call payment checkout API again
      const response = await fetch(apiRouteFor.quotePaymentCheckout(quoteId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await response.json()

      if (data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl
      }
    } catch (error) {
      console.error('[payment-cancel] Error retrying payment:', error)
      setRetrying(false)
      alert('Failed to start payment. Please try again or contact support.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Cancel Card */}
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-8 text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/20 mb-4">
            <XCircle className="h-8 w-8 text-orange-400" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            Payment Cancelled
          </h1>

          <p className="text-lg text-slate-300 mb-6">
            You cancelled the payment process. No charges have been made.
          </p>

          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 text-left">
            <h2 className="text-lg font-semibold text-white mb-3">What you can do:</h2>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <RefreshCw className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Try Again</strong>
                  <br />
                  Ready to proceed? Click "Retry Payment" below to try again
                </p>
              </div>

              <div className="flex items-start gap-3">
                <ArrowLeft className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <p>
                  <strong className="text-white">Review Quote</strong>
                  <br />
                  Go back to the quote details to review the repair work and pricing
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-slate-300">
            <p>
              <strong className="text-blue-400">Payment Protection:</strong> All payments are processed
              securely through Stripe and held in escrow until work is completed.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push(routeFor.quote(quoteId))}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition font-medium"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Quote
          </button>

          <button
            onClick={handleRetryPayment}
            disabled={retrying}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {retrying ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5" />
                Retry Payment
              </>
            )}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          <p>
            Having trouble? Contact{' '}
            <a href="mailto:support@askautodoctor.com" className="text-orange-400 hover:underline">
              support@askautodoctor.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
