// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wrench,
  Mail,
  Phone,
  Lock,
  User,
  Calendar,
  Award,
  Building2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Info,
  Loader2,
} from 'lucide-react'

interface WorkshopMechanicSignupData {
  // Personal Info (Step 1)
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  dateOfBirth: string

  // Credentials (Step 2)
  yearsOfExperience: string
  specializations: string[]
  redSealCertified: boolean
  redSealNumber: string
  redSealProvince: string

  // Legal
  agreesToTerms: boolean
}

const SPECIALIZATIONS = [
  'Brakes',
  'Engine Repair',
  'Transmission',
  'Electrical Systems',
  'Air Conditioning',
  'Suspension',
  'Exhaust Systems',
  'Diagnostics',
  'Oil Changes',
  'Tire Service',
  'Hybrid/Electric',
  'Diesel',
]

const CANADIAN_PROVINCES = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon',
]

export default function WorkshopMechanicSignupPage() {
  const params = useParams()
  const router = useRouter()
  const inviteCode = params.inviteCode as string

  const [loadingInvite, setLoadingInvite] = useState(true)
  const [inviteData, setInviteData] = useState<any>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<WorkshopMechanicSignupData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    yearsOfExperience: '',
    specializations: [],
    redSealCertified: false,
    redSealNumber: '',
    redSealProvince: '',
    agreesToTerms: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch invite details on mount
  useEffect(() => {
    async function fetchInvite() {
      try {
        const response = await fetch(`/api/workshop/invite-mechanic?code=${inviteCode}`)
        const data = await response.json()

        if (!response.ok) {
          setInviteError(data.error || 'Invalid invitation')
          setLoadingInvite(false)
          return
        }

        setInviteData(data.invite)
        // Pre-fill email if provided in invite
        if (data.invite.email) {
          setFormData((prev) => ({ ...prev, email: data.invite.email }))
        }
        setLoadingInvite(false)
      } catch (error: any) {
        setInviteError('Failed to load invitation')
        setLoadingInvite(false)
      }
    }

    if (inviteCode) {
      fetchInvite()
    }
  }, [inviteCode])

  const updateForm = (updates: Partial<WorkshopMechanicSignupData>) => {
    setFormData({ ...formData, ...updates })
    setErrors({})
  }

  const toggleSpecialization = (spec: string) => {
    if (formData.specializations.includes(spec)) {
      updateForm({
        specializations: formData.specializations.filter((s) => s !== spec),
      })
    } else {
      updateForm({
        specializations: [...formData.specializations, spec],
      })
    }
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = 'Full name is required'
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email address'
      }
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
      if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters'
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required'

      const age = new Date().getFullYear() - new Date(formData.dateOfBirth).getFullYear()
      if (age < 18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old'
      }
    }

    if (step === 2) {
      if (!formData.yearsOfExperience || parseInt(formData.yearsOfExperience) < 0) {
        newErrors.yearsOfExperience = 'Years of experience is required'
      }
      if (formData.specializations.length === 0) {
        newErrors.specializations = 'Please select at least one specialization'
      }
      if (formData.redSealCertified) {
        if (!formData.redSealNumber) newErrors.redSealNumber = 'Red Seal number is required'
        if (!formData.redSealProvince) newErrors.redSealProvince = 'Province is required'
      }
      if (!formData.agreesToTerms) newErrors.agreesToTerms = 'You must agree to the terms'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(2)
    }
  }

  const handleBack = () => {
    setCurrentStep(1)
  }

  const handleSubmit = async () => {
    if (!validateStep(2)) return

    setLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/mechanic/workshop-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          inviteCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ submit: data.error || 'Signup failed. Please try again.' })
        return
      }

      // Success! Redirect to success page
      router.push(`/mechanic/signup/success?workshop=${inviteData.workshop.name}`)
    } catch (error: any) {
      setErrors({ submit: error.message || 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loadingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-orange-500" />
          <p className="mt-4 text-slate-300">Loading invitation...</p>
        </div>
      </div>
    )
  }

  // Invalid invite state
  if (inviteError || !inviteData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-md rounded-2xl border border-rose-400/30 bg-rose-500/10 p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
          <h2 className="mt-4 text-2xl font-bold text-white">Invalid Invitation</h2>
          <p className="mt-2 text-sm text-slate-300">
            {inviteError || 'This invitation link is invalid or has expired.'}
          </p>
          <Link
            href="/mechanic/signup"
            className="mt-6 inline-block rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
          >
            Sign up as independent mechanic
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8">
      {/* Header */}
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-600">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">TheAutoDoctor</span>
          </Link>
        </div>

        {/* Workshop Info Banner */}
        <div className="mb-8 rounded-2xl border border-blue-400/30 bg-blue-500/10 p-6">
          <div className="flex items-start gap-4">
            <Building2 className="h-8 w-8 flex-shrink-0 text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">
                You've been invited to join {inviteData.workshop.name}
              </h3>
              <p className="mt-1 text-sm text-slate-300">
                {inviteData.workshop.city}, {inviteData.workshop.province}
              </p>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <strong>No SIN required</strong> - Workshop handles tax paperwork
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <strong>Instant approval</strong> - No admin review needed
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <strong>Simplified signup</strong> - Just 2 quick steps
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {[1, 2].map((step) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                  step === currentStep
                    ? 'bg-orange-600 text-white'
                    : step < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {step < currentStep ? <CheckCircle2 className="h-5 w-5" /> : step}
              </div>
              <span className="text-sm font-medium text-slate-400">
                {step === 1 ? 'Personal Info' : 'Experience'}
              </span>
              {step < 2 && <div className="h-0.5 w-12 bg-slate-700" />}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          {/* Error Alert */}
          <AnimatePresence>
            {errors.submit && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3"
              >
                <AlertCircle className="h-5 w-5 text-rose-400" />
                <p className="text-sm text-rose-200">{errors.submit}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {currentStep === 1 ? (
              <WorkshopMechanicStep1
                key="step1"
                formData={formData}
                updateForm={updateForm}
                errors={errors}
              />
            ) : (
              <WorkshopMechanicStep2
                key="step2"
                formData={formData}
                updateForm={updateForm}
                errors={errors}
                toggleSpecialization={toggleSpecialization}
                specializations={SPECIALIZATIONS}
                provinces={CANADIAN_PROVINCES}
              />
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            {currentStep === 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:via-orange-500 hover:to-orange-600"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 via-green-600 to-green-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-green-400 hover:via-green-500 hover:to-green-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Join Workshop'}
                <CheckCircle2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Step Components (simplified versions)
function WorkshopMechanicStep1({ formData, updateForm, errors }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-white">Personal Information</h2>
        <p className="mt-1 text-sm text-slate-300">Tell us about yourself</p>
      </div>

      {/* Form fields... will continue in next file */}
    </motion.div>
  )
}

function WorkshopMechanicStep2({ formData, updateForm, errors, toggleSpecialization, specializations, provinces }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-white">Your Experience</h2>
        <p className="mt-1 text-sm text-slate-300">Help us understand your skills</p>
      </div>

      {/* Form fields... will be completed */}
    </motion.div>
  )
}
