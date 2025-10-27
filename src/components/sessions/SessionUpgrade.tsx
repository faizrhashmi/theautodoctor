'use client'

import { useState } from 'react'

interface SessionUpgradeProps {
  sessionId: string
  currentType: 'chat'
  basePriceCharge: number  // Already paid (e.g., $15)
  upgradePrice: number      // Additional cost (e.g., $20)
  totalPrice: number        // Total after upgrade (e.g., $35)
  onUpgradeComplete?: () => void
}

export default function SessionUpgrade({
  sessionId,
  currentType,
  basePriceCharge,
  upgradePrice,
  totalPrice,
  onUpgradeComplete
}: SessionUpgradeProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgrading, setUpgrading] = useState(false)

  async function handleUpgrade() {
    setUpgrading(true)

    try {
      // Step 1: Process payment for upgrade
      const paymentResponse = await fetch('/api/sessions/upgrade/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          upgrade_amount: upgradePrice
        })
      })

      if (!paymentResponse.ok) {
        const error = await paymentResponse.json()
        alert(`Payment failed: ${error.error}`)
        setUpgrading(false)
        return
      }

      const paymentData = await paymentResponse.json()

      // Step 2: Update session type
      const upgradeResponse = await fetch(`/api/sessions/${sessionId}/upgrade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_intent_id: paymentData.payment_intent_id
        })
      })

      if (upgradeResponse.ok) {
        alert('Session upgraded to video! Your mechanic has been notified.')
        setShowUpgradeModal(false)
        onUpgradeComplete?.()
      } else {
        const error = await upgradeResponse.json()
        alert(`Upgrade failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error upgrading session:', error)
      alert('Failed to upgrade session')
    } finally {
      setUpgrading(false)
    }
  }

  if (currentType !== 'chat') {
    return null // Only show for chat sessions
  }

  return (
    <>
      {/* Upgrade Button */}
      <button
        onClick={() => setShowUpgradeModal(true)}
        className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Upgrade to Video
      </button>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Upgrade to Video Session</h2>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-purple-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-purple-900 mb-1">Why upgrade to video?</h3>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• Show your mechanic the issue in real-time</li>
                      <li>• Get more accurate diagnosis</li>
                      <li>• Clearer communication</li>
                      <li>• Better understanding of repairs needed</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Chat session (paid)</span>
                  <span className="font-medium text-gray-900">${basePriceCharge.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Upgrade fee</span>
                  <span className="font-medium text-purple-600">+${upgradePrice.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-semibold text-gray-900">Total paid after upgrade</span>
                  <span className="font-bold text-lg text-gray-900">${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-3">
                This is the same price as booking a video session directly. You'll only pay the difference.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {upgrading ? 'Processing...' : `Pay $${upgradePrice.toFixed(2)} & Upgrade`}
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                disabled={upgrading}
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
