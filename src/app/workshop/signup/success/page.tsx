// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Mail,
  Clock,
  ArrowRight,
  Building2,
  Users,
  DollarSign,
  Shield,
} from 'lucide-react'

export default function WorkshopSignupSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const organizationId = searchParams.get('id')
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    if (!organizationId) {
      router.push('/workshop/signup')
      return
    }

    // Countdown timer for auto-redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/login')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [organizationId, router])

  if (!organizationId) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">TheAutoDoctor for Workshops</span>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-2xl shadow-green-500/50"
        >
          <CheckCircle2 className="h-12 w-12 text-white" />
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-white">Application Submitted!</h1>
          <p className="mt-4 text-lg text-slate-300">
            Thank you for your interest in joining TheAutoDoctor workshop network.
          </p>
        </motion.div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 space-y-4"
        >
          {/* What happens next */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">What happens next?</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-orange-400">1.</span>
                    <span>
                      <strong>Email Verification:</strong> Check your inbox for a verification email from TheAutoDoctor
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-orange-400">2.</span>
                    <span>
                      <strong>Application Review:</strong> Our team will review your application within 2-3 business days
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-orange-400">3.</span>
                    <span>
                      <strong>Stripe Connect Setup:</strong> Once approved, you'll complete Stripe onboarding to receive payouts
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-orange-400">4.</span>
                    <span>
                      <strong>Go Live:</strong> Start inviting mechanics and accepting customers!
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Check your email */}
          <div className="rounded-2xl border border-orange-400/30 bg-orange-500/10 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/20">
                <Mail className="h-6 w-6 text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Check Your Email</h3>
                <p className="mt-2 text-sm text-slate-300">
                  We've sent a verification email to confirm your email address. Please check your inbox (and spam folder) and click the verification link.
                </p>
              </div>
            </div>
          </div>

          {/* What you'll get */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h3 className="mb-4 text-lg font-semibold text-white">What you'll get as a workshop partner:</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 flex-shrink-0 text-orange-400" />
                <div>
                  <p className="font-semibold text-white">Manage Your Team</p>
                  <p className="text-xs text-slate-400">Invite and manage your mechanics with ease</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 flex-shrink-0 text-orange-400" />
                <div>
                  <p className="font-semibold text-white">Earn Commission</p>
                  <p className="text-xs text-slate-400">10% commission on all mechanic sessions</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 flex-shrink-0 text-orange-400" />
                <div>
                  <p className="font-semibold text-white">Trusted Platform</p>
                  <p className="text-xs text-slate-400">All payments secured by Stripe</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 flex-shrink-0 text-orange-400" />
                <div>
                  <p className="font-semibold text-white">Workshop Dashboard</p>
                  <p className="text-xs text-slate-400">Track earnings, mechanics, and sessions</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-12 space-y-4"
        >
          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-6 py-4 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:via-orange-500 hover:to-orange-600"
          >
            Go to Login
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="text-center text-xs text-slate-500">
            Redirecting to login in {countdown} seconds...
          </p>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-slate-400">
            Have questions?{' '}
            <Link href="/contact" className="font-semibold text-orange-400 hover:text-orange-300">
              Contact our support team
            </Link>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Application ID: {organizationId.slice(0, 8)}...
          </p>
        </motion.div>
      </div>
    </div>
  )
}
