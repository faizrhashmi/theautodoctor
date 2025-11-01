'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, Shield, Clock, Info } from 'lucide-react'

export default function DeleteAccountPage() {
  const router = useRouter()
  const [deletionReason, setDeletionReason] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  async function handleDeleteRequest() {
    if (!deletionReason || deletionReason.trim().length < 10) {
      setError('Please provide a reason for deletion (minimum 10 characters)')
      return
    }

    if (confirmText !== 'DELETE MY ACCOUNT') {
      setError('Please type "DELETE MY ACCOUNT" to confirm')
      return
    }

    if (!understood) {
      setError('Please confirm you understand the consequences')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/customer/privacy/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletionReason: deletionReason.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request account deletion')
      }

      // Show success and redirect to confirmation page
      setShowConfirmation(true)

      // Logout after 5 seconds
      setTimeout(() => {
        window.location.href = '/logout'
      }, 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to request account deletion')
    } finally {
      setLoading(false)
    }
  }

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full rounded-lg border border-green-500/30 bg-green-500/10 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-6">
            <Shield className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Account Deletion Request Submitted</h1>
          <p className="text-slate-300 mb-6">
            Your account deletion request has been received. Your account will be deactivated immediately,
            and your personal data will be deleted or anonymized according to legal retention requirements.
          </p>
          <div className="bg-slate-900/50 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-semibold text-white mb-3">What happens next:</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>Your account is deactivated immediately</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>Personal data deleted or anonymized per legal requirements</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>Tax records retained for 7 years (CRA requirement)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>Confirmation email sent to your email address</span>
              </li>
            </ul>
          </div>
          <p className="text-sm text-slate-400">
            You will be logged out in 5 seconds...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-red-500/30 bg-red-500/10">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Trash2 className="h-8 w-8 text-red-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Delete My Account</h1>
              <p className="text-sm text-red-300 mt-1">PIPEDA: Right to Erasure - Permanent Account Deletion</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/customer/settings/privacy"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-6"
        >
          ← Back to Privacy Settings
        </Link>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Warning Card */}
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-400 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-red-200 mb-2">This action is permanent and cannot be undone</h2>
              <p className="text-sm text-red-300/90 leading-relaxed">
                Once you delete your account, you will lose access to all your data, diagnostic sessions, and vehicle records.
                Some data will be retained for legal compliance (CRA tax records for 7 years), but will be anonymized.
              </p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-8 space-y-8">
          {/* PIPEDA Information */}
          <div className="p-6 rounded-lg border border-blue-500/30 bg-blue-500/5">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-200 mb-2">Your Right to Erasure (PIPEDA Principle 4.5)</h3>
                <p className="text-sm text-blue-300/90 leading-relaxed">
                  Under PIPEDA, you have the right to request deletion of your personal information. However, we may retain
                  certain data for legal obligations (e.g., CRA requires 7-year retention of tax records).
                </p>
              </div>
            </div>
          </div>

          {/* What Gets Deleted */}
          <div>
            <h3 className="font-semibold text-white mb-4">Data Deletion Timeline</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-green-400" />
                  <span className="font-semibold text-green-200">Immediate</span>
                </div>
                <ul className="text-sm text-green-300/90 space-y-1 ml-7">
                  <li>• Profile information (name, email, phone)</li>
                  <li>• Vehicle details</li>
                  <li>• Preferences and settings</li>
                  <li>• Account deactivated</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  <span className="font-semibold text-yellow-200">90 Days (Anonymized)</span>
                </div>
                <ul className="text-sm text-yellow-300/90 space-y-1 ml-7">
                  <li>• Diagnostic session data</li>
                  <li>• Chat messages</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-orange-400" />
                  <span className="font-semibold text-orange-200">2 Years (Anonymized)</span>
                </div>
                <ul className="text-sm text-orange-300/90 space-y-1 ml-7">
                  <li>• Reviews and ratings</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-red-400" />
                  <span className="font-semibold text-red-200">7 Years (CRA Requirement)</span>
                </div>
                <ul className="text-sm text-red-300/90 space-y-1 ml-7">
                  <li>• Payment records (anonymized)</li>
                  <li>• Tax-related transaction data (anonymized)</li>
                  <li>• Required by Canada Revenue Agency</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Before You Continue */}
          <div className="p-6 rounded-lg border border-slate-700 bg-slate-900/50">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-400" />
              Before you continue
            </h3>
            <ul className="text-sm text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">!</span>
                <span>You cannot delete your account if you have active diagnostic sessions. Please complete or cancel them first.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">!</span>
                <span>Download your data first if you want a copy for your records.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">!</span>
                <span>All your vehicles, sessions, quotes, and reviews will be permanently deleted.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">!</span>
                <span>You will not be able to recover your account after deletion.</span>
              </li>
            </ul>
          </div>

          {/* Deletion Form */}
          <div className="space-y-6">
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-slate-300 mb-2">
                Why are you deleting your account? *
              </label>
              <textarea
                id="reason"
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                placeholder="Please tell us why you're leaving (minimum 10 characters)..."
              />
              <p className="mt-2 text-xs text-slate-500">
                {deletionReason.length}/10 characters minimum
              </p>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-slate-300 mb-2">
                Type "DELETE MY ACCOUNT" to confirm *
              </label>
              <input
                type="text"
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder:text-slate-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none font-mono"
                placeholder="DELETE MY ACCOUNT"
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="understood"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-slate-700 text-red-600 focus:ring-2 focus:ring-red-500"
              />
              <label htmlFor="understood" className="text-sm text-slate-300 flex-1 cursor-pointer">
                I understand that this action is permanent and cannot be undone. I understand that some data will be retained
                for legal compliance (CRA 7-year requirement) but will be anonymized.
              </label>
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={handleDeleteRequest}
            disabled={loading || !deletionReason || !understood || confirmText !== 'DELETE MY ACCOUNT'}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold hover:from-red-700 hover:to-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processing Deletion Request...
              </>
            ) : (
              <>
                <Trash2 className="h-5 w-5" />
                Delete My Account Permanently
              </>
            )}
          </button>

          {/* Support */}
          <div className="text-center pt-6 border-t border-slate-700">
            <p className="text-sm text-slate-400 mb-2">
              Need help or have questions?
            </p>
            <a
              href="mailto:privacy@theautodoctor.ca"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Contact privacy@theautodoctor.ca
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
