// @ts-nocheck
'use client'

import { useState } from 'react'
import { X, Shield, AlertCircle, Lock, CheckCircle2, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SINCollectionModalProps {
  mechanicId: string
  onComplete: () => void
  onCancel?: () => void
}

export default function SINCollectionModal({
  mechanicId,
  onComplete,
  onCancel,
}: SINCollectionModalProps) {
  const [sin, setSin] = useState('')
  const [confirmSin, setConfirmSin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'info' | 'input' | 'success'>('info')

  const formatSIN = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')

    // Limit to 9 digits
    const limited = digits.slice(0, 9)

    // Format as XXX-XXX-XXX
    if (limited.length <= 3) return limited
    if (limited.length <= 6) return `${limited.slice(0, 3)}-${limited.slice(3)}`
    return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`
  }

  const handleSinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSIN(e.target.value)
    setSin(formatted)
  }

  const handleConfirmSinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSIN(e.target.value)
    setConfirmSin(formatted)
  }

  const validateSIN = (sinValue: string): boolean => {
    const digits = sinValue.replace(/\D/g, '')

    if (digits.length !== 9) {
      setError('SIN must be 9 digits')
      return false
    }

    // Basic SIN validation using Luhn algorithm
    const checkDigit = parseInt(digits[8])
    let sum = 0

    for (let i = 0; i < 8; i++) {
      let digit = parseInt(digits[i])

      // Double every second digit
      if (i % 2 === 1) {
        digit *= 2
        // If result is two digits, add them together
        if (digit > 9) {
          digit = Math.floor(digit / 10) + (digit % 10)
        }
      }

      sum += digit
    }

    const calculatedCheckDigit = (10 - (sum % 10)) % 10

    if (calculatedCheckDigit !== checkDigit) {
      setError('Invalid SIN number. Please verify and try again.')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate SIN
    if (!sin.trim()) {
      setError('SIN is required')
      return
    }

    if (sin !== confirmSin) {
      setError('SINs do not match')
      return
    }

    if (!validateSIN(sin)) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/mechanic/collect-sin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mechanicId,
          sin: sin.replace(/\D/g, ''), // Send only digits
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to submit SIN')
        return
      }

      setStep('success')

      // Auto-complete after 2 seconds
      setTimeout(() => {
        onComplete()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    setStep('input')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
      >
        {/* Header */}
        <div className="border-b border-white/10 bg-gradient-to-r from-orange-500/10 to-red-500/10 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500/20 p-2">
                <Shield className="h-6 w-6 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">SIN Required for Paid Sessions</h2>
                <p className="mt-1 text-sm text-slate-400">
                  One-time verification for tax compliance
                </p>
              </div>
            </div>
            {onCancel && step === 'info' && (
              <button
                onClick={onCancel}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 'info' && (
              <motion.div
                key="info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Why We Need This */}
                <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-5">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 flex-shrink-0 text-blue-400" />
                    <div className="text-sm text-blue-200">
                      <p className="font-semibold">Why do we need your SIN?</p>
                      <p className="mt-2 text-blue-300/90">
                        Canadian tax law requires us to collect your Social Insurance Number (SIN)
                        before you can earn income through our platform. This is the same requirement
                        as any employer or contract work arrangement.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Security Information */}
                <div>
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-white">
                    <Lock className="h-5 w-5 text-green-400" />
                    Your privacy and security
                  </h3>
                  <div className="space-y-3 text-sm text-slate-300">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-green-500/20 p-1">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Military-grade encryption</p>
                        <p className="text-slate-400">
                          Your SIN is encrypted using AES-256-GCM before being stored in our database
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-green-500/20 p-1">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">PIPEDA compliant</p>
                        <p className="text-slate-400">
                          We follow all Canadian privacy laws for handling personal information
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-green-500/20 p-1">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Limited access</p>
                        <p className="text-slate-400">
                          Only authorized financial personnel can access this information for tax reporting
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* What Happens Next */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                  <h4 className="mb-3 font-semibold text-white">What happens next?</h4>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400">•</span>
                      <span>You'll provide your SIN one time only</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400">•</span>
                      <span>You can immediately start accepting paid sessions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400">•</span>
                      <span>
                        We'll issue you a T4A at year-end for income tax purposes (required by CRA)
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {onCancel && (
                    <button
                      onClick={onCancel}
                      className="flex-1 rounded-lg border border-white/10 bg-slate-800/60 py-3 text-sm font-semibold text-white transition hover:bg-slate-700/60"
                    >
                      Not Now
                    </button>
                  )}
                  <button
                    onClick={handleContinue}
                    className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:to-orange-500"
                  >
                    Continue to Enter SIN
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'input' && (
              <motion.form
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* SIN Input */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Social Insurance Number (SIN)
                  </label>
                  <input
                    type="text"
                    value={sin}
                    onChange={handleSinChange}
                    placeholder="XXX-XXX-XXX"
                    maxLength={11}
                    className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-4 py-3 text-center text-lg font-mono tracking-wider text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    autoComplete="off"
                    required
                  />
                </div>

                {/* Confirm SIN */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Confirm SIN
                  </label>
                  <input
                    type="text"
                    value={confirmSin}
                    onChange={handleConfirmSinChange}
                    placeholder="XXX-XXX-XXX"
                    maxLength={11}
                    className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-4 py-3 text-center text-lg font-mono tracking-wider text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    autoComplete="off"
                    required
                  />
                </div>

                {/* Security Notice */}
                <div className="rounded-lg border border-green-400/30 bg-green-500/10 p-4">
                  <div className="flex items-start gap-2">
                    <Lock className="h-5 w-5 flex-shrink-0 text-green-400" />
                    <p className="text-xs text-green-200">
                      Your SIN will be encrypted using AES-256-GCM encryption before transmission
                      and storage. We never store your SIN in plain text.
                    </p>
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
                    onClick={() => setStep('info')}
                    className="flex-1 rounded-lg border border-white/10 bg-slate-800/60 py-3 text-sm font-semibold text-white transition hover:bg-slate-700/60"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Securely'}
                  </button>
                </div>
              </motion.form>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center"
              >
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-500/20 p-4">
                    <CheckCircle2 className="h-16 w-16 text-green-400" />
                  </div>
                </div>
                <h3 className="mt-6 text-2xl font-bold text-white">All Set!</h3>
                <p className="mt-2 text-slate-400">
                  Your SIN has been securely encrypted and stored.
                </p>
                <p className="mt-4 text-sm text-green-300">
                  You can now accept paid sessions. Redirecting...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
