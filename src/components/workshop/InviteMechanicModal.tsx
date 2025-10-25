// @ts-nocheck
'use client'

import { useState } from 'react'
import { X, Mail, Copy, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface InviteMechanicModalProps {
  organizationId: string
  onClose: () => void
  onSuccess: () => void
}

export default function InviteMechanicModal({
  organizationId,
  onClose,
  onSuccess,
}: InviteMechanicModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [generatedInvite, setGeneratedInvite] = useState<{
    code: string
    url: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/workshop/invite-mechanic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          inviteEmail: inviteEmail.trim() || null,
          role: 'member',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to generate invite')
        return
      }

      setGeneratedInvite({
        code: data.inviteCode,
        url: data.inviteUrl,
      })
      setStep('success')
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (generatedInvite) {
      navigator.clipboard.writeText(generatedInvite.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
      >
        {/* Header */}
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Invite Mechanic</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Generate an invitation link to send to your mechanic
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Email Field (Optional) */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Mechanic Email (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="mechanic@example.com"
                      className="w-full rounded-lg border border-white/10 bg-slate-800/50 py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    If provided, the invite can only be used by this email address
                  </p>
                </div>

                {/* Info Box */}
                <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-400" />
                    <div className="text-sm text-blue-200">
                      <p className="font-medium">Invitation Details:</p>
                      <ul className="mt-1 space-y-1 text-blue-300/80">
                        <li>• Valid for 7 days</li>
                        <li>• Mechanic will be auto-approved</li>
                        <li>• No SIN required for workshop mechanics</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                      <p className="text-sm text-red-200">{error}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-lg border border-white/10 bg-slate-800/60 py-3 text-sm font-semibold text-white transition hover:bg-slate-700/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Generate Invite'}
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Success Icon */}
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-500/20 p-3">
                    <CheckCircle2 className="h-12 w-12 text-green-400" />
                  </div>
                </div>

                {/* Success Message */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white">Invitation Created!</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Share this link with your mechanic to get started
                  </p>
                </div>

                {/* Invite Link */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-400">
                    Invitation Link
                  </label>
                  <div className="rounded-lg border border-white/10 bg-slate-800/50 p-3">
                    <code className="block break-all text-sm text-orange-300">
                      {generatedInvite?.url}
                    </code>
                  </div>
                </div>

                {/* Invite Code */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-400">
                    Invite Code
                  </label>
                  <div className="rounded-lg border border-white/10 bg-slate-800/50 p-3">
                    <code className="block text-center text-lg font-mono text-white">
                      {generatedInvite?.code}
                    </code>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={handleCopy}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:to-orange-500"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Link
                      </>
                    )}
                  </button>

                  <button
                    onClick={onClose}
                    className="w-full rounded-lg border border-white/10 bg-slate-800/60 py-3 text-sm font-semibold text-white transition hover:bg-slate-700/60"
                  >
                    Done
                  </button>
                </div>

                {/* Email Info */}
                {inviteEmail && (
                  <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 flex-shrink-0 text-blue-400" />
                      <div className="text-xs text-blue-200">
                        This invitation is restricted to <strong>{inviteEmail}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
