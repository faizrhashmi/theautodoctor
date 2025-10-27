// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import CountrySelector, { Country } from '@/components/shared/CountrySelector'
import AddressAutocomplete, { AddressData } from '@/components/shared/AddressAutocomplete'
import WaiverModal from '@/components/customer/WaiverModal'

interface SignupFormData {
  // Personal Info
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string

  // Address
  address: Partial<AddressData>
  country: string

  // Preferences
  preferredLanguage: string
  newsletterSubscribed: boolean
  referralSource: string

  // Legal
  is18Plus: boolean
  termsAccepted: boolean
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ar', name: 'Arabic' },
]

const REFERRAL_SOURCES = [
  'Google Search',
  'Social Media',
  'Friend or Family',
  'Online Ad',
  'YouTube',
  'Blog or Article',
  'Other',
]

export default function CustomerSignupPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [showWaiver, setShowWaiver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [detectedCountry, setDetectedCountry] = useState<Country | null>(null)
  const [formData, setFormData] = useState<SignupFormData>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: {},
    country: '',
    preferredLanguage: 'en',
    newsletterSubscribed: false,
    referralSource: '',
    is18Plus: false,
    termsAccepted: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Auto-detect country on mount
  useEffect(() => {
    fetch('/api/geo/detect')
      .then((res) => res.json())
      .then((data) => {
        if (data.country) {
          setDetectedCountry(data.country)
          setFormData((prev) => ({ ...prev, country: data.country.name }))
        }
      })
      .catch((err) => console.error('Failed to detect country:', err))
  }, [])

  // Calculate password strength
  function calculatePasswordStrength(password: string): number {
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
    setErrors((prev) => ({ ...prev, password: '' }))
  }

  function validateStep(step: number): boolean {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'
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
      } else if (passwordStrength < 3) {
        newErrors.password = 'Password is too weak. Add uppercase, numbers, and symbols'
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    if (step === 2) {
      if (!formData.country) newErrors.country = 'Country is required'
      if (!formData.address.addressLine1) newErrors.address = 'Street address is required'
      if (!formData.address.city) newErrors.address = 'City is required'
      if (!formData.address.stateProvince) newErrors.address = 'State/Province is required'
      if (!formData.address.postalZipCode) newErrors.address = 'Postal/ZIP code is required'
    }

    if (step === 3) {
      if (!formData.is18Plus) newErrors.is18Plus = 'You must be 18 or older'
      if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleNext() {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3))
    }
  }

  function handleBack() {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  function handleWaiverAccept() {
    setFormData((prev) => ({ ...prev, termsAccepted: true, is18Plus: true }))
    setShowWaiver(false)
    setErrors((prev) => ({ ...prev, termsAccepted: '', is18Plus: '' }))
  }

  function handleWaiverDecline() {
    setShowWaiver(false)
  }

  async function handleSubmit() {
    if (!validateStep(3)) return

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
          address: {
            line1: formData.address.addressLine1,
            line2: formData.address.addressLine2,
            city: formData.address.city,
            state: formData.address.stateProvince,
            postalCode: formData.address.postalZipCode,
            country: formData.country,
          },
          preferredLanguage: formData.preferredLanguage,
          newsletterSubscribed: formData.newsletterSubscribed,
          referralSource: formData.referralSource,
          waiverAccepted: true,
          is18Plus: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ submit: data.error || 'Signup failed. Please try again.' })
        return
      }

      // Success! Redirect to verification page
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <WaiverModal isOpen={showWaiver} onAccept={handleWaiverAccept} onDecline={handleWaiverDecline} />

      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">TheAutoDoctor</span>
            </Link>
            <Link href="/signup" className="text-sm text-slate-400 hover:text-white">
              Already have an account? <span className="font-semibold text-orange-600">Sign In</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex flex-1 items-center">
                <div className="relative flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: step <= currentStep ? '#ea580c' : '#e2e8f0',
                      scale: step === currentStep ? 1.1 : 1,
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold text-white shadow-md`}
                  >
                    {step < currentStep ? (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step
                    )}
                  </motion.div>
                  <span className="mt-2 text-xs font-medium text-slate-400">
                    {step === 1 ? 'Account' : step === 2 ? 'Address' : 'Confirm'}
                  </span>
                </div>
                {step < 3 && (
                  <div className="relative mx-2 flex-1">
                    <div className="h-1 bg-slate-200"></div>
                    <motion.div
                      initial={false}
                      animate={{ width: step < currentStep ? '100%' : '0%' }}
                      transition={{ duration: 0.3 }}
                      className="absolute left-0 top-0 h-1 bg-orange-600"
                    ></motion.div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm shadow-xl"
        >
          {/* Error Alert */}
          <AnimatePresence>
            {errors.submit && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-red-200 bg-red-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 flex-shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-red-800">{errors.submit}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-8">
            {/* Step 1: Account Details */}
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-white">Create your account</h2>
                    <p className="mt-1 text-sm text-slate-400">Get started with instant access to certified mechanics</p>
                  </div>

                  {/* Social Login Placeholders */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled
                      className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-4 py-3 text-sm font-medium text-slate-300 opacity-50 transition hover:bg-slate-700"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Google
                    </button>
                    <button
                      type="button"
                      disabled
                      className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-4 py-3 text-sm font-medium text-slate-300 opacity-50 transition hover:bg-slate-700"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                      Apple
                    </button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-slate-800/50 backdrop-blur-sm px-4 text-slate-400">Or continue with email</span>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-slate-300">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, fullName: e.target.value }))
                        setErrors((prev) => ({ ...prev, fullName: '' }))
                      }}
                      className={`mt-1 block w-full rounded-lg border px-4 py-3 outline-none transition focus:ring-2 ${
                        errors.fullName
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                          : 'border-slate-700 focus:border-orange-500 focus:ring-orange-200'
                      }`}
                      placeholder="John Doe"
                    />
                    {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, email: e.target.value }))
                        setErrors((prev) => ({ ...prev, email: '' }))
                      }}
                      className={`mt-1 block w-full rounded-lg border px-4 py-3 outline-none transition focus:ring-2 ${
                        errors.email
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                          : 'border-slate-700 focus:border-orange-500 focus:ring-orange-200'
                      }`}
                      placeholder="john@example.com"
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-300">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, phone: e.target.value }))
                        setErrors((prev) => ({ ...prev, phone: '' }))
                      }}
                      className={`mt-1 block w-full rounded-lg border px-4 py-3 outline-none transition focus:ring-2 ${
                        errors.phone
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                          : 'border-slate-700 focus:border-orange-500 focus:ring-orange-200'
                      }`}
                      placeholder="+1 (555) 123-4567"
                    />
                    {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mt-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={formData.password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        className={`block w-full rounded-lg border px-4 py-3 pr-12 outline-none transition focus:ring-2 ${
                          errors.password
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-slate-700 focus:border-orange-500 focus:ring-orange-200'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-400"
                      >
                        {showPassword ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
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
                        <p className="mt-1 text-xs text-slate-400">
                          Strength: {passwordStrengthLabels[passwordStrength - 1] || 'Too Short'}
                        </p>
                      </div>
                    )}
                    {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mt-1">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                          setErrors((prev) => ({ ...prev, confirmPassword: '' }))
                        }}
                        className={`block w-full rounded-lg border px-4 py-3 pr-12 outline-none transition focus:ring-2 ${
                          errors.confirmPassword
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-slate-700 focus:border-orange-500 focus:ring-orange-200'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-400"
                      >
                        {showConfirmPassword ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Address */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-white">Where are you located?</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Help us connect you with mechanics in your area
                    </p>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <CountrySelector
                      value={formData.country}
                      onChange={(country) => {
                        setFormData((prev) => ({
                          ...prev,
                          country: country.name,
                          address: { ...prev.address, country: country.name },
                        }))
                        setErrors((prev) => ({ ...prev, country: '' }))
                      }}
                      error={errors.country}
                      className="mt-1"
                    />
                  </div>

                  {/* Address */}
                  <AddressAutocomplete
                    value={formData.address}
                    onAddressSelect={(address) => {
                      setFormData((prev) => ({ ...prev, address }))
                      setErrors((prev) => ({ ...prev, address: '' }))
                    }}
                    error={errors.address}
                  />

                  {/* Preferences */}
                  <div className="rounded-lg border border-slate-700 bg-slate-50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-white">Preferences</h3>
                    <div className="space-y-3">
                      {/* Language */}
                      <div>
                        <label htmlFor="language" className="block text-sm font-medium text-slate-300">
                          Preferred Language
                        </label>
                        <select
                          id="language"
                          value={formData.preferredLanguage}
                          onChange={(e) => setFormData((prev) => ({ ...prev, preferredLanguage: e.target.value }))}
                          className="mt-1 block w-full rounded-lg border border-slate-700 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                        >
                          {LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                              {lang.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Referral Source */}
                      <div>
                        <label htmlFor="referral" className="block text-sm font-medium text-slate-300">
                          How did you hear about us?
                        </label>
                        <select
                          id="referral"
                          value={formData.referralSource}
                          onChange={(e) => setFormData((prev) => ({ ...prev, referralSource: e.target.value }))}
                          className="mt-1 block w-full rounded-lg border border-slate-700 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                        >
                          <option value="">Select an option...</option>
                          {REFERRAL_SOURCES.map((source) => (
                            <option key={source} value={source}>
                              {source}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Newsletter */}
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.newsletterSubscribed}
                          onChange={(e) => setFormData((prev) => ({ ...prev, newsletterSubscribed: e.target.checked }))}
                          className="h-4 w-4 rounded border-slate-700 text-orange-600 focus:ring-2 focus:ring-orange-500"
                        />
                        <span className="text-sm text-slate-300">
                          Send me tips, promotions, and updates via email
                        </span>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Confirmation */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-white">Almost there!</h2>
                    <p className="mt-1 text-sm text-slate-400">Review your information and accept our terms</p>
                  </div>

                  {/* Summary */}
                  <div className="rounded-lg border border-slate-700 bg-gradient-to-br from-slate-50 to-white p-6">
                    <h3 className="mb-4 text-sm font-semibold text-white">Account Summary</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Name:</span>
                        <span className="font-medium text-white">{formData.fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Email:</span>
                        <span className="font-medium text-white">{formData.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Phone:</span>
                        <span className="font-medium text-white">{formData.phone}</span>
                      </div>
                      <div className="border-t border-slate-700 pt-3">
                        <span className="text-slate-400">Location:</span>
                        <p className="mt-1 font-medium text-white">
                          {formData.address.city}, {formData.address.stateProvince}
                          <br />
                          {formData.country}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Legal */}
                  <div className="space-y-4">
                    <div className={`rounded-lg border p-4 ${formData.termsAccepted ? 'border-green-200 bg-green-50' : errors.is18Plus || errors.termsAccepted ? 'border-red-300 bg-red-50' : 'border-slate-700 bg-slate-800/50 backdrop-blur-sm'}`}>
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={formData.is18Plus}
                          readOnly
                          className="mt-1 h-5 w-5 rounded border-slate-700 text-orange-600 focus:ring-2 focus:ring-orange-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-white">I confirm I am 18 years or older</span>
                          <p className="mt-1 text-xs text-slate-400">Our services are only available to adults 18+</p>
                        </div>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowWaiver(true)}
                      className={`w-full rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                        formData.termsAccepted
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-orange-500 bg-orange-50 text-orange-700 hover:bg-orange-100'
                      }`}
                    >
                      {formData.termsAccepted ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Terms & Waiver Accepted
                        </span>
                      ) : (
                        'Read & Accept Terms & Waiver *'
                      )}
                    </button>
                    {(errors.termsAccepted || errors.is18Plus) && !formData.termsAccepted && (
                      <p className="text-xs text-red-600">{errors.termsAccepted || errors.is18Plus}</p>
                    )}
                  </div>

                  {/* Trust Badges */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center gap-3 text-sm text-blue-900">
                      <svg className="h-5 w-5 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <div>
                        <p className="font-semibold">Your data is secure</p>
                        <p className="text-xs text-blue-700">We use industry-standard encryption to protect your information</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="mt-8 flex gap-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              )}
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-orange-700 hover:to-orange-600"
                >
                  Continue
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !formData.termsAccepted}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-orange-700 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-orange-600 hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-orange-600 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
