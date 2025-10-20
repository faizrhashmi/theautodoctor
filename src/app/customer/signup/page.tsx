'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import WaiverModal from '@/components/customer/WaiverModal'

export default function CustomerSignupPage() {
  const router = useRouter()
  const [showWaiver, setShowWaiver] = useState(false)
  const [waiverAccepted, setWaiverAccepted] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    is18Plus: false,
    termsAccepted: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  function validateForm() {
    const newErrors: Record<string, string> = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^\+?[\d\s\-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.is18Plus) {
      newErrors.is18Plus = 'You must be 18 or older to use this service'
    }

    if (!formData.termsAccepted) {
      newErrors.termsAccepted = 'You must accept the terms and waiver'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function calculatePasswordStrength(password: string) {
    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^a-zA-Z\d]/.test(password)) strength++
    return strength
  }

  function handlePasswordChange(value: string) {
    setFormData((prev) => ({ ...prev, password: value }))
    setPasswordStrength(calculatePasswordStrength(value))
  }

  function handleWaiverAccept() {
    setWaiverAccepted(true)
    setFormData((prev) => ({ ...prev, termsAccepted: true, is18Plus: true }))
    setShowWaiver(false)
    setErrors((prev) => ({ ...prev, termsAccepted: '', is18Plus: '' }))
  }

  function handleWaiverDecline() {
    setShowWaiver(false)
    setFormData((prev) => ({ ...prev, termsAccepted: false, is18Plus: false }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/customer/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          vehicleInfo: {
            make: formData.vehicleMake,
            model: formData.vehicleModel,
            year: formData.vehicleYear,
          },
          waiverAccepted: true,
          is18Plus: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ submit: data.error || 'Signup failed. Please try again.' })
        return
      }

      // Redirect to email verification page
      router.push(`/customer/verify-email?email=${encodeURIComponent(formData.email)}`)
    } catch (error: any) {
      setErrors({ submit: error.message || 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  const passwordStrengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500']
  const passwordStrengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <WaiverModal isOpen={showWaiver} onAccept={handleWaiverAccept} onDecline={handleWaiverDecline} />

      <div className="mx-auto max-w-md">
        {/* Logo/Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-slate-900">Create Your Account</h1>
          <p className="mt-2 text-sm text-slate-600">
            Get instant access to certified mechanics
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-2xl bg-white p-8 shadow-sm">
          {/* Error Alert */}
          {errors.submit && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {errors.submit}
              </div>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
              className={`mt-1 block w-full rounded-lg border px-4 py-3 text-slate-900 outline-none transition focus:ring-2 ${
                errors.fullName ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
              }`}
              placeholder="John Doe"
            />
            {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className={`mt-1 block w-full rounded-lg border px-4 py-3 text-slate-900 outline-none transition focus:ring-2 ${
                errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
              }`}
              placeholder="john@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
              Phone Number *
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              className={`mt-1 block w-full rounded-lg border px-4 py-3 text-slate-900 outline-none transition focus:ring-2 ${
                errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
              }`}
              placeholder="+1 (555) 123-4567"
            />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password *
            </label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              className={`mt-1 block w-full rounded-lg border px-4 py-3 text-slate-900 outline-none transition focus:ring-2 ${
                errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
              }`}
              placeholder="••••••••"
            />
            {formData.password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition ${
                        i < passwordStrength ? passwordStrengthColors[passwordStrength - 1] : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Strength: {passwordStrengthLabels[passwordStrength - 1] || 'Too Short'}
                </p>
              </div>
            )}
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
              Confirm Password *
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className={`mt-1 block w-full rounded-lg border px-4 py-3 text-slate-900 outline-none transition focus:ring-2 ${
                errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
              }`}
              placeholder="••••••••"
            />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
          </div>

          {/* Vehicle Info (Optional) */}
          <div className="rounded-lg bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Vehicle Information (Optional)</h3>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={formData.vehicleMake}
                onChange={(e) => setFormData((prev) => ({ ...prev, vehicleMake: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="Make"
              />
              <input
                type="text"
                value={formData.vehicleModel}
                onChange={(e) => setFormData((prev) => ({ ...prev, vehicleModel: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="Model"
              />
              <input
                type="text"
                value={formData.vehicleYear}
                onChange={(e) => setFormData((prev) => ({ ...prev, vehicleYear: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="Year"
              />
            </div>
          </div>

          {/* Age & Terms */}
          <div className="space-y-3">
            {/* 18+ Confirmation */}
            <div className={`rounded-lg border p-4 ${waiverAccepted ? 'border-green-200 bg-green-50' : errors.is18Plus ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.is18Plus}
                  readOnly
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900">I confirm I am 18 years or older *</span>
                  <p className="mt-1 text-xs text-slate-600">
                    Our services are only available to adults 18+
                  </p>
                </div>
              </label>
              {errors.is18Plus && <p className="mt-2 text-xs text-red-600">{errors.is18Plus}</p>}
            </div>

            {/* Waiver Button */}
            <button
              type="button"
              onClick={() => setShowWaiver(true)}
              className={`w-full rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                waiverAccepted
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {waiverAccepted ? '✓ Terms & Waiver Accepted' : 'Read & Accept Terms & Waiver *'}
            </button>
            {errors.termsAccepted && !waiverAccepted && (
              <p className="text-xs text-red-600">{errors.termsAccepted}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !waiverAccepted}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating Account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>

          {/* Login Link */}
          <p className="text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link href="/customer/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
